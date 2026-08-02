import { NextResponse } from 'next/server';
import { sendFounderDealWelcomeEmail } from '@/lib/resend-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, displayName, username } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const result = await sendFounderDealWelcomeEmail({
      toEmail: email,
      displayName: displayName || 'Animator',
      username: username || '',
    });

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, message: result.message || 'Email delivery logged' });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
