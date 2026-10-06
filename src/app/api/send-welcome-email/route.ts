import { NextRequest, NextResponse } from 'next/server';

/**
 * Kept for older clients that still call it after username setup. Welcome
 * emails are now sent by the daily lifecycle job (/api/email/lifecycle) with
 * an unsubscribe link and the current offer; the previous email here promoted
 * a "$2 lifetime founder deal" and free trial that no longer exist.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json({ success: true, deferred: 'lifecycle' });
}
