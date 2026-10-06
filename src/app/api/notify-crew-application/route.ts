import { NextRequest, NextResponse } from 'next/server';
import { sendCrewApplicationEmail } from '@/lib/resend-service';
import { ApiError, apiErrorResponse, requireFirebaseUser } from '@/lib/api-auth';
import { getFirebaseAuth, getFirestore } from '@/lib/firebase-admin';

/**
 * Emails a project owner about a new crew application.
 *
 * Takes only `{ applicationId }`. The caller must be the applicant, and the
 * recipient and every field in the email come from Firestore, so this route
 * can't be used to send arbitrary mail to arbitrary addresses.
 */
export async function POST(request: NextRequest) {
  try {
    const identity = await requireFirebaseUser(request);
    const { applicationId } = await request.json().catch(() => ({}));
    if (typeof applicationId !== 'string' || !applicationId) {
      throw new ApiError(400, 'MISSING_APPLICATION', 'applicationId is required.');
    }

    const db = getFirestore();
    const appSnap = await db.collection('crew_applications').doc(applicationId).get();
    const app = appSnap.data();
    if (!app) throw new ApiError(404, 'NOT_FOUND', 'Application not found.');
    if (app.applicantId !== identity.uid) throw new ApiError(403, 'FORBIDDEN', 'Only the applicant can send this notification.');

    const project = (await db.collection('production_projects').doc(app.projectId).get()).data();
    if (!project) throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
    const owner = await getFirebaseAuth().getUser(project.ownerId).catch(() => null);
    if (!owner?.email) return NextResponse.json({ success: false, message: 'Project owner has no email on file.' });

    const result = await sendCrewApplicationEmail({
      toEmail: owner.email,
      ownerName: owner.displayName || 'there',
      applicantName: app.applicantName || 'Someone',
      projectTitle: project.title || app.projectTitle || 'your production',
      roleTitle: app.roleTitle || undefined,
      message: app.message || '',
      projectId: app.projectId,
    });

    return NextResponse.json(result.success ? { success: true } : { success: false, message: result.message || 'Email delivery logged' });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
