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
    // The legacy /v2/ugcPosts endpoint was retired.  An article post works
    // without first downloading and re-uploading the source video; use a
    // native video only after the Videos API has supplied a video URN.
    const body = {
      author: authorUrn.startsWith('urn:li:') ? authorUrn : `urn:li:organization:${authorUrn}`,
      commentary: opts.caption,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };

    const res = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'Linkedin-Version': process.env.LINKEDIN_API_VERSION || '202610',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    const postId = data.id || res.headers.get('x-restli-id');
    if (!res.ok || !postId) {
      return {
        platform: 'linkedin',
        success: false,
        error: data.message || 'Failed to publish post to LinkedIn.',
      };
    }

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
