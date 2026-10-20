import { NextResponse } from 'next/server';
import { selectDailyBotVideo, dispatchSocialPost } from '@/lib/social/socialManager';
import type { SocialPlatform } from '@/lib/social/types';
import { apiErrorResponse, requireAdmin } from '@/lib/api-auth';

async function runDailyPost() {
  const targetPlatforms: SocialPlatform[] = ['instagram', 'twitter', 'linkedin'];
  const video = await selectDailyBotVideo();
  if (!video) return NextResponse.json({ message: 'No eligible video found for daily automated post.' });
  const log = await dispatchSocialPost(video, { videoId: video.id, platforms: targetPlatforms }, 'bot');
  return NextResponse.json({ success: true, message: `Automated daily post triggered for video: ${video.title}`, log });
}

export async function GET(req: Request) {
  try {
    // Optional secret key check for cron triggers
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    // Without a configured secret anyone could trigger social posts, so refuse.
    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
    }
    if (secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }

    return runDailyPost();
  } catch (err: any) {
    console.error('Error in /api/social/cron API route:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req as import('next/server').NextRequest);
    return await runDailyPost();
  } catch (error) {
    return apiErrorResponse(error);
  }
}
