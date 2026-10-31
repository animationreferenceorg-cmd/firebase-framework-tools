import type { NextRequest } from 'next/server';
import { ApiError, apiErrorResponse, requireAdmin } from '@/lib/api-auth';
import { getFirebaseAuth, getFirestore } from '@/lib/firebase-admin';
import {
  renderOneDollarPromoHtml,
  sendOneDollarPromoEmail,
  sendNewsletterBroadcastEmail,
} from '@/lib/resend-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const auth = getFirebaseAuth();
    const db = getFirestore();

    let totalAccounts = 0;
    let pageToken: string | undefined;
    do {
      const page = await auth.listUsers(1000, pageToken);
      totalAccounts += page.users.length;
      pageToken = page.pageToken;
    } while (pageToken);

    let proCount = 0;
    const usersSnap = await db.collection('users').get();
    usersSnap.forEach((doc) => {
      const d = doc.data();
      if (d.isPremium || d.isPro || d.plan?.startsWith('pro') || d.tier?.startsWith('pro')) {
        proCount++;
      }
    });

    const freeCount = Math.max(0, totalAccounts - proCount);

    const promoHtml = renderOneDollarPromoHtml('Fellow Animator');

    return Response.json({
      totalAccounts,
      freeCount,
      proCount,
      promoPreviewHtml: promoHtml,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => ({}));

    const action = body.action || 'test'; // 'test' | 'broadcast'
    const template = body.template || 'one_dollar_promo'; // 'one_dollar_promo' | 'custom'
    const subject = typeof body.subject === 'string' && body.subject.trim()
      ? body.subject.trim()
      : '⚡ Special Animator Offer: Get Pro for $1 (Normally $5/mo)';
    const customMessage = typeof body.customMessage === 'string' ? body.customMessage.trim() : undefined;
    const customHtml = typeof body.customHtml === 'string' ? body.customHtml : '';

    // 1. Single Test Send to Admin
    if (action === 'test') {
      const targetEmail = typeof body.targetEmail === 'string' && body.targetEmail.includes('@')
        ? body.targetEmail.trim()
        : admin.email;

      if (!targetEmail) {
        throw new ApiError(400, 'BAD_REQUEST', 'No valid target email provided for test send.');
      }

      let res;
      if (template === 'one_dollar_promo') {
        res = await sendOneDollarPromoEmail({
          toEmail: targetEmail,
          recipientName: 'Studio Animator',
          customMessage,
        });
      } else {
        res = await sendNewsletterBroadcastEmail({
          toEmail: targetEmail,
          subject,
          htmlContent: customHtml || renderOneDollarPromoHtml('Studio Animator', customMessage),
        });
      }

      if (!res.success) {
        throw new ApiError(500, 'SEND_FAILED', (res as any).error || res.message || 'Failed to send test email');
      }

      return Response.json({ success: true, message: `Test email sent to ${targetEmail}!` });
    }

    // 2. Full Broadcast Send
    if (action === 'broadcast') {
      const segment = body.segment || 'free'; // 'free' | 'pro' | 'all'
      const auth = getFirebaseAuth();
      const db = getFirestore();

      // Gather Pro UIDs from Firestore
      const proUids = new Set<string>();
      const usersSnap = await db.collection('users').get();
      usersSnap.forEach((doc) => {
        const d = doc.data();
        if (d.isPremium || d.isPro || d.plan?.startsWith('pro') || d.tier?.startsWith('pro')) {
          proUids.add(doc.id);
        }
      });

      // Fetch all Auth users matching segment
      const recipients: Array<{ email: string; name: string }> = [];
      let pageToken: string | undefined;

      do {
        const page = await auth.listUsers(1000, pageToken);
        for (const u of page.users) {
          if (!u.email) continue;
          const isPro = proUids.has(u.uid);

          if (segment === 'free' && isPro) continue;
          if (segment === 'pro' && !isPro) continue;

          recipients.push({
            email: u.email,
            name: u.displayName || 'Animator',
          });
        }
        pageToken = page.pageToken;
      } while (pageToken);

      // Global 6:00 AM Wave Schedules
      const scheduleMode = body.scheduleMode || 'staggered_6am';
      const now = Date.now();
      const waveTimes = [
        undefined, // Wave 1: Europe/UK morning (Immediate)
        new Date(now + 3 * 3600 * 1000).toISOString(), // Wave 2: US East (~6:30 AM EDT)
        new Date(now + 6 * 3600 * 1000).toISOString(), // Wave 3: US West (~6:30 AM PDT)
        new Date(now + 14 * 3600 * 1000).toISOString(), // Wave 4: Asia / Pacific Sunday morning
      ];

      // Send in controlled batches (5 emails per batch, 300ms pause)
      let sentCount = 0;
      let failedCount = 0;
      const batchSize = 5;

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (r, batchIdx) => {
            const overallIdx = i + batchIdx;
            const scheduledAt = scheduleMode === 'staggered_6am' ? waveTimes[overallIdx % 4] : undefined;
            try {
              let res;
              if (template === 'one_dollar_promo') {
                res = await sendOneDollarPromoEmail({
                  toEmail: r.email,
                  recipientName: r.name,
                  customMessage,
                  subject: subject || 'Your Animation Reference Pro pass is ready',
                  scheduledAt,
                });
              } else {
                res = await sendNewsletterBroadcastEmail({
                  toEmail: r.email,
                  subject,
                  htmlContent: customHtml || renderOneDollarPromoHtml(r.name, customMessage),
                });
              }

              if (res.success) {
                sentCount++;
              } else {
                failedCount++;
              }
            } catch {
              failedCount++;
            }
          })
        );

        // Gentle pause to respect rate limits
        if (i + batchSize < recipients.length) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      return Response.json({
        success: true,
        totalRecipients: recipients.length,
        sentCount,
        failedCount,
      });
    }

    throw new ApiError(400, 'BAD_REQUEST', 'Unknown action');
  } catch (error) {
    return apiErrorResponse(error);
  }
}

