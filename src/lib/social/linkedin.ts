import type { PostResult } from './types';

/**
 * LinkedIn API Client
 * Posts to LinkedIn Organization Page or User Profile
 */
export async function postToLinkedIn(opts: {
  videoUrl?: string;
  caption: string;
}): Promise<PostResult> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const authorUrn = process.env.LINKEDIN_ORGANIZATION_URN || process.env.LINKEDIN_PERSON_URN;

  if (!accessToken || !authorUrn) {
    return {
      platform: 'linkedin',
      success: false,
      error: 'LinkedIn API credentials (LINKEDIN_ACCESS_TOKEN and LINKEDIN_ORGANIZATION_URN / LINKEDIN_PERSON_URN) are missing.',
    };
  }

  try {
    // LinkedIn ugcPosts REST payload
    const body = {
      author: authorUrn.startsWith('urn:li:') ? authorUrn : `urn:li:organization:${authorUrn}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: opts.caption,
          },
          shareMediaCategory: opts.videoUrl ? 'ARTICLE' : 'NONE',
          ...(opts.videoUrl
            ? {
                media: [
                  {
                    status: 'READY',
                    originalUrl: opts.videoUrl,
                    title: { text: 'Animation Reference Clip' },
                  },
                ],
              }
            : {}),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok || !data.id) {
      return {
        platform: 'linkedin',
        success: false,
        error: data.message || 'Failed to publish post to LinkedIn.',
      };
    }

    const postId = data.id;

    return {
      platform: 'linkedin',
      success: true,
      postId: postId,
      postUrl: `https://www.linkedin.com/feed/update/${postId}`,
    };
  } catch (err: any) {
    return {
      platform: 'linkedin',
      success: false,
      error: err.message || 'Unexpected error while posting to LinkedIn.',
    };
  }
}
