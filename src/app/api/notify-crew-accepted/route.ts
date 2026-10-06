import { NextRequest, NextResponse } from 'next/server';
import { sendCrewAcceptedEmail } from '@/lib/resend-service';
import { ApiError, apiErrorResponse, requireFirebaseUser } from '@/lib/api-auth';
import { getFirebaseAuth, getFirestore } from '@/lib/firebase-admin';

/**
 * Emails an applicant that they were accepted onto a crew.
 *
 * Takes only `{ applicationId }`. The caller must own the project, and the
 * recipient is the applicant's own account email, looked up server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const identity = await requireFirebaseUser(request);
    const { applicationId } = await request.json().catch(() => ({}));
    if (typeof applicationId !== 'string' || !applicationId) {
      throw new ApiError(400, 'MISSING_APPLICATION', 'applicationId is required.');
    }

    const db = getFirestore();
    const app = (await db.collection('crew_applications').doc(applicationId).get()).data();
    if (!app) throw new ApiError(404, 'NOT_FOUND', 'Application not found.');
    const project = (await db.collection('production_projects').doc(app.projectId).get()).data();
    if (!project) throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
    if (project.ownerId !== identity.uid) throw new ApiError(403, 'FORBIDDEN', 'Only the project owner can send this notification.');

    const applicant = await getFirebaseAuth().getUser(app.applicantId).catch(() => null);
    if (!applicant?.email) return NextResponse.json({ success: false, message: 'Applicant has no email on file.' });

    const result = await sendCrewAcceptedEmail({
      toEmail: applicant.email,
      applicantName: app.applicantName || applicant.displayName || 'there',
      projectTitle: project.title || app.projectTitle || 'the production',
      projectId: app.projectId,
    });

    return NextResponse.json(result.success ? { success: true } : { success: false, message: result.message || 'Email delivery logged' });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
