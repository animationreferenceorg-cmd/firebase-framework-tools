import type { PlatformCaptionOptions, SocialPlatform } from './types';

const BASE_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://animationreference.org';

const DEFAULT_HASHTAGS = [
  '#animationreference',
  '#animation',
  '#2danimation',
  '#3danimation',
  '#sakuga',
  '#characteranimation',
  '#gamedev',
  '#vfx',
];

/**
 * Format tags into clean hashtags (#tag)
 */
function formatHashtags(tags?: string[], limit: number = 6): string {
  if (!tags || tags.length === 0) {
    return DEFAULT_HASHTAGS.slice(0, limit).join(' ');
  }

  const customTags = tags.map(t => {
    const clean = t.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return clean ? `#${clean}` : '';
  }).filter(Boolean);

  const combined = Array.from(new Set([...customTags, ...DEFAULT_HASHTAGS]));
  return combined.slice(0, limit).join(' ');
}

/**
 * Smart Caption Generator for Social Platforms
 */
export function generateCaption(platform: SocialPlatform, opts: PlatformCaptionOptions): string {
  const { title, description, authorName, tags, pageUrl } = opts;
  const targetUrl = pageUrl || BASE_SITE_URL;
  const creditText = authorName ? `\n\nAnimation by: @${authorName.replace(/\s+/g, '')}` : '';
  const hashtags = formatHashtags(tags, 8);

  switch (platform) {
    case 'instagram':
    case 'facebook': {
      const descSnippet = description ? `\n\n${description.slice(0, 200)}${description.length > 200 ? '...' : ''}` : '';
      return `${title}${descSnippet}${creditText}\n\n👇 Watch in HD & search 1,000+ reference clips:\nLink in Bio 🔗 (${targetUrl})\n\n${hashtags}`;
    }

    case 'twitter': {
      // Twitter 280 character limit handling
      const hashtagsTwitter = formatHashtags(tags, 3);
      const urlText = `\n🔗 ${targetUrl}`;
      const creditTwitter = authorName ? `\nBy: @${authorName.replace(/\s+/g, '')}` : '';
      
      const fixedLength = urlText.length + creditTwitter.length + hashtagsTwitter.length + 5;
      const maxTitleLen = Math.max(20, 280 - fixedLength);
      
      const trimmedTitle = title.length > maxTitleLen ? `${title.slice(0, maxTitleLen - 3)}...` : title;

      return `${trimmedTitle}${creditTwitter}${urlText}\n\n${hashtagsTwitter}`;
    }

    case 'linkedin': {
      const descSnippet = description ? `\n\n${description.slice(0, 300)}${description.length > 300 ? '...' : ''}` : '';
      const linkedinTags = formatHashtags(tags, 6);
      return `🎬 Animation Reference Spotlight: ${title}${descSnippet}${creditText}\n\nExplore full high-framerate playback and frame-by-frame analysis at Animation Reference:\n${targetUrl}\n\n${linkedinTags}`;
    }

    default:
      return `${title}\n\n${targetUrl}`;
  }
}

/**
 * Generate all captions at once for previewing in Admin UI
 */
export function generateAllCaptions(opts: PlatformCaptionOptions): Record<SocialPlatform, string> {
  return {
    instagram: generateCaption('instagram', opts),
    facebook: generateCaption('facebook', opts),
    twitter: generateCaption('twitter', opts),
    linkedin: generateCaption('linkedin', opts),
  };
}
