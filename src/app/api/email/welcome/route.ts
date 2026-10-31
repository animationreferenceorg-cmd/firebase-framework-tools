import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/resend-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : undefined;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      );
    }

    const result = await sendWelcomeEmail({
      toEmail: email.toLowerCase(),
      displayName,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Welcome email route error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send welcome email' },
      { status: 500 }
    );
  }
}
