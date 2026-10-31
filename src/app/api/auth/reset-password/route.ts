import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAuth } from '@/lib/firebase-admin';
import { sendPasswordResetEmailResend } from '@/lib/resend-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';

    if (!rawEmail || !rawEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const email = rawEmail.toLowerCase();

    // Standard rate limit / verification: try generating password reset link via Firebase Admin
    try {
      const auth = getFirebaseAuth();
      const actionCodeSettings = {
        url: 'https://animationreference.org/login?reset=success',
        handleCodeInApp: true,
      };

      const resetLink = await auth.generatePasswordResetLink(email, actionCodeSettings);

      // Attempt to retrieve user display name if available
      let displayName: string | undefined;
      try {
        const userRecord = await auth.getUserByEmail(email);
        displayName = userRecord.displayName || undefined;
      } catch {
        // user might not exist or display name unset
      }

      // Send branded password reset email through Resend
      await sendPasswordResetEmailResend({
        toEmail: email,
        resetLink,
        displayName,
      });
    } catch (authError: any) {
      // If user is not found, do not reveal it (standard security to avoid email enumeration)
      console.warn(`Password reset attempt for ${email}:`, authError?.message || authError);
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.',
    });
  } catch (error: any) {
    console.error('Password reset route error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process password reset request.' },
      { status: 500 }
    );
  }
}

