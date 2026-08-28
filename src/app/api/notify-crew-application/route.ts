import { NextResponse } from 'next/server';
import { sendCrewApplicationEmail } from '@/lib/resend-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { toEmail, ownerName, applicantName, projectTitle, roleTitle, message, projectId } = body;

    if (!toEmail || !projectId) {
      return NextResponse.json({ error: 'toEmail and projectId are required' }, { status: 400 });
    }

    const result = await sendCrewApplicationEmail({
      toEmail,
      ownerName: ownerName || 'there',
      applicantName: applicantName || 'Someone',
      projectTitle: projectTitle || 'your production',
      roleTitle,
      message: message || '',
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
