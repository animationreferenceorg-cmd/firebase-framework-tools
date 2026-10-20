import { postToInstagram } from './instagram';
import { postToTwitter } from './twitter';
import { postToLinkedIn } from './linkedin';
import { generateCaption } from './captionBuilder';
import type { PostRequest, PostResult, SocialPostLog, SocialPlatformConfig } from './types';
import type { Video } from '../types';
import { getFirestore } from '../firebase-admin';
import { isVideoSourceAvailable } from '@/lib/video-availability';

const BASE_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://animationreference.org';

/**
 * Check API credential status for all platforms
 */
export function getSocialPlatformConfig(): SocialPlatformConfig {
  return {
    instagram: {
      enabled: Boolean(process.env.INSTAGRAM_ACCOUNT_ID && (process.env.META_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN)),
      hasCredentials: Boolean(process.env.INSTAGRAM_ACCOUNT_ID),
      accountId: process.env.INSTAGRAM_ACCOUNT_ID,
    },
    twitter: {
      // A write-capable OAuth 2 user token is sent as a Bearer token. An app-only
      // bearer token can read API v2 but cannot create a post.
      enabled: Boolean(process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN),
      hasCredentials: Boolean(process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN),
    },
    linkedin: {
      enabled: Boolean(process.env.LINKEDIN_ACCESS_TOKEN && (process.env.LINKEDIN_ORGANIZATION_URN || process.env.LINKEDIN_PERSON_URN)),
      hasCredentials: Boolean(process.env.LINKEDIN_ACCESS_TOKEN),
    },
    facebook: {
      enabled: Boolean(process.env.FACEBOOK_PAGE_ID && (process.env.META_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN)),
      hasCredentials: Boolean(process.env.FACEBOOK_PAGE_ID),
      pageId: process.env.FACEBOOK_PAGE_ID,
    },
  };
}

/**
 * Publish video to multiple social media channels
 */
export async function dispatchSocialPost(
  video: Video,
  request: PostRequest,
  triggeredBy: 'manual' | 'bot' = 'manual'
): Promise<SocialPostLog> {
  const results: PostResult[] = [];
  const pageUrl = `${BASE_SITE_URL}/video/${video.id}`;

  const captionOptions = {
    title: video.title,
    description: video.description,
    authorName: video.author_name || video.uploader,
    tags: video.tags,
    videoUrl: video.videoUrl,
    pageUrl,
  };

  for (const platform of request.platforms) {
    const caption = request.customCaptions?.[platform] || generateCaption(platform, captionOptions);

    switch (platform) {
      case 'instagram': {
        if (!video.videoUrl) {
          results.push({ platform: 'instagram', success: false, error: 'Video URL is missing.' });
          break;
        }
        const res = await postToInstagram({ videoUrl: video.videoUrl, caption });
        results.push(res);
        break;
      }
      case 'twitter': {
        const res = await postToTwitter({ videoUrl: video.videoUrl, caption });
        results.push(res);
        break;
      }
      case 'linkedin': {
        const res = await postToLinkedIn({ videoUrl: video.videoUrl, caption });
        results.push(res);
        break;
      }
      default:
        results.push({ platform, success: false, error: `Unsupported platform: ${platform}` });
    }
  }

  const log: SocialPostLog = {
    videoId: video.id,
    videoTitle: video.title,
    postedAt: new Date().toISOString(),
    platforms: request.platforms,
    results,
    triggeredBy,
  };

  // This module only runs on the server.  Using Admin SDK keeps post history
  // private even when the client Firestore rules intentionally deny it.
  try {
    await getFirestore().collection('social_posts').add({
      ...log,
      createdAt: Date.now(),
    });
  } catch (err) {
    console.error('Failed to store social post log in Firestore:', err);
  }

  return log;
}

/**
 * Select candidate videos for automated daily bot posting
 */
export async function selectDailyBotVideo(): Promise<Video | null> {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('videos').orderBy('createdAt', 'desc').limit(50).get();

    if (snapshot.empty) return null;

    const videos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Video));
    // Never auto-post a video whose host has gone offline.
    const publishedVideos = videos.filter(v => (v.status === 'published' || !v.status) && v.videoUrl && isVideoSourceAvailable(v.videoUrl));

    if (publishedVideos.length === 0) return null;

    // Fetch recently posted video IDs from social_posts collection
    const postsSnapshot = await db.collection('social_posts').orderBy('createdAt', 'desc').limit(30).get();
    const recentlyPostedIds = new Set(postsSnapshot.docs.map(doc => doc.data().videoId));

    // Pick a video that has not been posted recently
    const unposted = publishedVideos.filter(v => !recentlyPostedIds.has(v.id));

    if (unposted.length > 0) {
      return unposted[Math.floor(Math.random() * unposted.length)];
    }

    // Fallback to random published video if all have been posted
    return publishedVideos[Math.floor(Math.random() * publishedVideos.length)];
  } catch (err) {
    console.error('Error selecting daily bot video:', err);
    return null;
  }
}
