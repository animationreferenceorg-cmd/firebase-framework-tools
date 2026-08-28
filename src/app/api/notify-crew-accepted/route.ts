import { NextResponse } from 'next/server';
import { sendCrewAcceptedEmail } from '@/lib/resend-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { toEmail, applicantName, projectTitle, projectId } = body;

    if (!toEmail || !projectId) {
      return NextResponse.json({ error: 'toEmail and projectId are required' }, { status: 400 });
    }

    const result = await sendCrewAcceptedEmail({
      toEmail,
      applicantName: applicantName || 'there',
      projectTitle: projectTitle || 'the production',
      projectId,
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
