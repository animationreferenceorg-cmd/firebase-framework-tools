import { createHash, randomInt } from 'crypto';
import type { NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore } from '@/lib/firebase-admin';
import { ApiError, apiErrorResponse, requireFirebaseUser } from '@/lib/api-auth';
import { sendSjsuVerificationCode } from '@/lib/resend-service';

// SJSU Student Pass: a student proves they own an @sjsu.edu inbox with a
// one-time code, then the Admin SDK grants unlimited access. Clients cannot
// write the entitlement fields themselves (see firestore.rules).

const SJSU_EMAIL = /^[a-z0-9._%+-]+@([a-z0-9-]+\.)?sjsu\.edu$/;
const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const hashCode = (uid: string, code: string) => createHash('sha256').update(`${uid}:${code}`).digest('hex');

export async function POST(request: NextRequest) {
  try {
    const identity = await requireFirebaseUser(request);
    const body = await request.json().catch(() => ({}));
    const db = getFirestore();
    const codeRef = db.collection('sjsu_codes').doc(identity.uid);

    if (body.action === 'send') {
      const sjsuEmail = String(body.sjsuEmail || '').trim().toLowerCase();
      if (!SJSU_EMAIL.test(sjsuEmail)) {
        throw new ApiError(400, 'INVALID_EMAIL', 'Enter a San José State email ending in @sjsu.edu.');
      }

      const claimed = await db.collection('sjsu_verifications').where('sjsuEmail', '==', sjsuEmail).limit(1).get();
      if (!claimed.empty && claimed.docs[0].id !== identity.uid) {
        throw new ApiError(409, 'EMAIL_IN_USE', 'That SJSU email is already linked to another account.');
      }

      const existing = await codeRef.get();
      const sentAt = existing.data()?.sentAt as number | undefined;
      if (sentAt && Date.now() - sentAt < RESEND_COOLDOWN_MS) {
        throw new ApiError(429, 'TOO_SOON', 'A code was just sent. Wait a minute before requesting another.');
      }

      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      await codeRef.set({
        sjsuEmail,
        codeHash: hashCode(identity.uid, code),
        sentAt: Date.now(),
        expiresAt: Date.now() + CODE_TTL_MS,
        attempts: 0,
      });

      const result = await sendSjsuVerificationCode({ toEmail: sjsuEmail, code });
      if (!result.success) {
        await codeRef.delete();
        throw new ApiError(502, 'EMAIL_FAILED', 'We could not send the verification email. Try again shortly.');
      }
      return Response.json({ sent: true });
    }

    if (body.action === 'verify') {
      const code = String(body.code || '').trim();
      const snap = await codeRef.get();
      const pending = snap.data();
      if (!pending || Date.now() > pending.expiresAt) {
        throw new ApiError(400, 'CODE_EXPIRED', 'That code has expired. Request a new one.');
      }
      if (pending.attempts >= MAX_ATTEMPTS) {
        await codeRef.delete();
        throw new ApiError(429, 'TOO_MANY_ATTEMPTS', 'Too many incorrect codes. Request a new one.');
      }
      if (hashCode(identity.uid, code) !== pending.codeHash) {
        await codeRef.update({ attempts: FieldValue.increment(1) });
        throw new ApiError(400, 'CODE_INVALID', 'That code is not correct.');
      }

      const grantedAt = new Date().toISOString();
      const batch = db.batch();
      batch.set(db.collection('users').doc(identity.uid), {
        isStudent: true,
        isVIP: true,
        isPremium: true,
        school: 'San José State University (SJSU)',
        studentEmail: pending.sjsuEmail,
        tier: 'student_unlimited',
        unlimitedAccess: true,
        grantedAt,
      }, { merge: true });
      batch.set(db.collection('sjsu_verifications').doc(identity.uid), {
        uid: identity.uid,
        accountEmail: identity.email || null,
        sjsuEmail: pending.sjsuEmail,
        school: 'San José State University (SJSU)',
        grantedAt,
        status: 'verified_active',
      });
      batch.delete(codeRef);
      await batch.commit();

      return Response.json({ verified: true, sjsuEmail: pending.sjsuEmail });
    }

    throw new ApiError(400, 'INVALID_ACTION', 'Unknown action.');
  } catch (error) {
    return apiErrorResponse(error);
  }
}
