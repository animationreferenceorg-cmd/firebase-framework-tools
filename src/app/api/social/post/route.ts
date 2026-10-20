import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { dispatchSocialPost } from '@/lib/social/socialManager';
import { ApiError, apiErrorResponse, requireAdmin } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';
import type { Video } from '@/lib/types';

const requestSchema = z.object({
  videoId: z.string().trim().min(1).max(200),
  platforms: z.array(z.enum(['instagram', 'twitter', 'linkedin'])).min(1).max(3),
  customCaptions: z.record(z.enum(['instagram', 'twitter', 'linkedin']), z.string().max(2_200)).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const parsed = requestSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(422, 'INVALID_POST', 'Choose a video, at least one supported platform, and valid captions.');
    const body = parsed.data;
    const docSnap = await getFirestore().collection('videos').doc(body.videoId).get();
    const video = docSnap.exists ? ({ id: docSnap.id, ...(docSnap.data() as Omit<Video, 'id'>) } as Video) : null;

    if (!video) {
      throw new ApiError(404, 'VIDEO_NOT_FOUND', 'The selected video no longer exists.');
    }

    const log = await dispatchSocialPost(video, body, 'manual');

    return Response.json({ success: true, log });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
