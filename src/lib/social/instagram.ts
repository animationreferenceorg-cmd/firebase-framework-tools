import type { PostResult } from './types';

/**
 * Instagram Graph API Client
 * Publishes Reels/Videos to Instagram Business Account
 */
export async function postToInstagram(opts: {
  videoUrl: string;
  caption: string;
}): Promise<PostResult> {
  const instagramAccountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;

  if (!instagramAccountId || !accessToken) {
    return {
      platform: 'instagram',
      success: false,
      error: 'Meta/Instagram credentials (INSTAGRAM_ACCOUNT_ID, META_PAGE_ACCESS_TOKEN) are missing.',
    };
  }

  try {
    // Step 1: Create Media Container for Reel/Video
    const containerParams = new URLSearchParams({
      media_type: 'REELS',
      video_url: opts.videoUrl,
      caption: opts.caption,
      access_token: accessToken,
    });

    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${instagramAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: containerParams.toString(),
      }
    );

    const containerData = await containerRes.json();

    if (!containerRes.ok || !containerData.id) {
      return {
        platform: 'instagram',
        success: false,
        error: containerData.error?.message || 'Failed to create Instagram media container.',
      };
    }

    const containerId = containerData.id;

    // Step 2: Poll container status until FINISHED (Max 10 retries with 5s delay)
    let isFinished = false;
    let retries = 0;
    const maxRetries = 12;

    while (!isFinished && retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      retries++;

      const statusRes = await fetch(
        `https://graph.facebook.com/v19.0/${containerId}?fields=status_code,status&access_token=${accessToken}`
      );
      const statusData = await statusRes.json();

      if (statusData.status_code === 'FINISHED') {
        isFinished = true;
      } else if (statusData.status_code === 'ERROR') {
        return {
          platform: 'instagram',
          success: false,
          error: statusData.status || 'Instagram processing error on video container.',
        };
      }
    }

    if (!isFinished) {
      return {
        platform: 'instagram',
        success: false,
        error: 'Instagram video container processing timed out.',
      };
    }

    // Step 3: Publish Media Container
    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    });

    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${instagramAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishParams.toString(),
      }
    );

    const publishData = await publishRes.json();

    if (!publishRes.ok || !publishData.id) {
      return {
        platform: 'instagram',
        success: false,
        error: publishData.error?.message || 'Failed to publish Instagram media container.',
      };
    }

    return {
      platform: 'instagram',
      success: true,
      postId: publishData.id,
      postUrl: `https://www.instagram.com/p/${publishData.id}`,
    };
  } catch (err: any) {
    return {
      platform: 'instagram',
      success: false,
      error: err.message || 'Unexpected error while posting to Instagram.',
    };
  }
}
