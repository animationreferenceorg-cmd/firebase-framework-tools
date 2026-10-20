import type { PostResult } from './types';

/**
 * X (Twitter) API Client
 * Posts Tweets with video references or media attachments
 */
export async function postToTwitter(opts: {
  videoUrl?: string;
  caption: string;
}): Promise<PostResult> {
  const userAccessToken = process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN;

  if (!userAccessToken) {
    return {
      platform: 'twitter',
      success: false,
      error: 'An X OAuth 2 user access token (X_ACCESS_TOKEN) is required to publish.',
    };
  }

  try {
    // Construct tweet payload
    const tweetText = opts.caption;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    headers['Authorization'] = `Bearer ${userAccessToken}`;

    // Call X API v2 Tweet creation endpoint
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: tweetText,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.data?.id) {
      return {
        platform: 'twitter',
        success: false,
        error: data.detail || data.errors?.[0]?.message || 'Failed to post tweet to X API.',
      };
    }

    const tweetId = data.data.id;

    return {
      platform: 'twitter',
      success: true,
      postId: tweetId,
      postUrl: `https://x.com/i/status/${tweetId}`,
    };
  } catch (err: any) {
    return {
      platform: 'twitter',
      success: false,
      error: err.message || 'Unexpected error while posting to X (Twitter).',
    };
  }
}
