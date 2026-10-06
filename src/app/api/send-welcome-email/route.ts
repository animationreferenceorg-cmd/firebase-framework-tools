import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { sendFounderDealWelcomeEmail } from '@/lib/resend-service';
import { apiErrorResponse, requireFirebaseUser } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';

/**
 * Sends the welcome email to the signed-in user, once.
 *
 * The recipient is always the caller's own account email (never a request
 * field), and a marker on the profile stops repeat sends, so the route can't
 * be used to spam arbitrary addresses through our Resend account.
 */
export async function POST(request: NextRequest) {
  try {
    const identity = await requireFirebaseUser(request);
    if (!identity.email) return NextResponse.json({ success: false, message: 'No email on this account.' });

    const userRef = getFirestore().collection('users').doc(identity.uid);
    const profile = (await userRef.get()).data() || {};
    if (profile.welcomeEmailSentAt) return NextResponse.json({ success: true, alreadySent: true });

    const result = await sendFounderDealWelcomeEmail({
      toEmail: identity.email,
      displayName: profile.displayName || identity.name || 'Animator',
      username: typeof profile.username === 'string' ? profile.username : '',
    });

    if (result.success) {
      await userRef.set({ welcomeEmailSentAt: FieldValue.serverTimestamp() }, { merge: true });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, message: result.message || 'Email delivery logged' });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
