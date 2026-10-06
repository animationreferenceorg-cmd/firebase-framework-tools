import { timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin';

/**
 * One-click unsubscribe from lifecycle emails. GET is the link in the email;
 * POST is the RFC 8058 one-click request mail clients send from the
 * List-Unsubscribe header. Both need the per-user token stored server-side.
 */

function page(title: string, message: string, status = 200) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:48px 16px;background:#09090b;color:#fff;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;text-align:center">
<h1 style="font-size:22px">${title}</h1><p style="color:#a1a1aa">${message}</p>
<p><a href="https://animationreference.org" style="color:#a78bfa">Back to Animation Reference</a></p></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

async function unsubscribe(uid: string | null, token: string | null): Promise<boolean> {
  if (!uid || !token || !/^[A-Za-z0-9_-]{1,128}$/.test(uid) || !/^[a-f0-9]{48}$/.test(token)) return false;
  const ref = getFirestore().collection('email_prefs').doc(uid);
  const stored = (await ref.get()).data()?.token;
  if (typeof stored !== 'string' || stored.length !== token.length) return false;
  if (!timingSafeEqual(Buffer.from(stored), Buffer.from(token))) return false;
  await ref.set({ optOut: true, optOutAt: Date.now() }, { merge: true });
  return true;
}

export async function GET(request: NextRequest) {
  const ok = await unsubscribe(request.nextUrl.searchParams.get('u'), request.nextUrl.searchParams.get('t'));
  return ok
    ? page('You’re unsubscribed', 'You won’t get any more of these emails. Account and billing emails are not affected.')
    : page('Link not valid', 'This unsubscribe link is invalid or has expired. Reply to any of our emails and we’ll remove you by hand.', 400);
}

export async function POST(request: NextRequest) {
  const ok = await unsubscribe(request.nextUrl.searchParams.get('u'), request.nextUrl.searchParams.get('t'));
  return new Response(null, { status: ok ? 200 : 400 });
}
