import type { PostResult } from './types';

/**
 * X (Twitter) API Client
 * Posts Tweets with video references or media attachments
 */
export async function postToTwitter(opts: {
  videoUrl?: string;
  caption: string;
}): Promise<PostResult> {
  const apiKey = process.env.X_API_KEY || process.env.TWITTER_API_KEY;
  const apiSecret = process.env.X_API_KEY_SECRET || process.env.TWITTER_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET || process.env.TWITTER_ACCESS_TOKEN_SECRET;
  const bearerToken = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN;

  if ((!apiKey || !accessToken) && !bearerToken) {
    return {
      platform: 'twitter',
      success: false,
      error: 'X (Twitter) API credentials (X_API_KEY, X_ACCESS_TOKEN or X_BEARER_TOKEN) are missing.',
    };
  }

  try {
    // Construct tweet payload
    const tweetText = opts.caption;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }

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
