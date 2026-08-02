import { NextResponse } from 'next/server';
import { selectDailyBotVideo, dispatchSocialPost } from '@/lib/social/socialManager';
import type { SocialPlatform } from '@/lib/social/types';

export async function GET(req: Request) {
  try {
    // Optional secret key check for cron triggers
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }

    const targetPlatforms: SocialPlatform[] = ['instagram', 'twitter', 'linkedin'];

    const video = await selectDailyBotVideo();

    if (!video) {
      return NextResponse.json({
        message: 'No eligible video found for daily automated post.',
      });
    }

    const log = await dispatchSocialPost(
      video,
      {
        videoId: video.id,
        platforms: targetPlatforms,
      },
      'bot'
    );

    return NextResponse.json({
      success: true,
      message: `Automated daily post triggered for video: ${video.title}`,
      log,
    });
  } catch (err: any) {
    console.error('Error in /api/social/cron API route:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
