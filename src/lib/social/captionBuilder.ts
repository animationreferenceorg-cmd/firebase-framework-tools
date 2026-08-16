import type { PlatformCaptionOptions, SocialPlatform } from './types';

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
 *
 * Artist-first framing (à la 80 Level): lead with crediting the creator,
 * keep the site mention short and plain rather than salesy "link in bio"
 * copy, and don't bury the credit under hashtags.
 */
export function generateCaption(platform: SocialPlatform, opts: PlatformCaptionOptions): string {
  const { title, description, authorName, tags } = opts;
  const handle = authorName ? `@${authorName.replace(/\s+/g, '')}` : null;
  const hook = handle ? `Incredible animation work by ${handle} 🎬` : `🎬 ${title}`;
  const hashtags = formatHashtags(tags, 8);

  switch (platform) {
    case 'instagram':
    case 'facebook': {
      const descSnippet = description ? `\n\n${description.slice(0, 200)}${description.length > 200 ? '...' : ''}` : '';
      const titleLine = handle ? `\n\n${title}` : '';
      return `${hook}${titleLine}${descSnippet}\n\nCheck out more animations at animationreference.org\n\n${hashtags}`;
    }

    case 'twitter': {
      // Twitter 280 character limit handling
      const hashtagsTwitter = formatHashtags(tags, 3);
      const ctaText = `\nCheck out more animations at animationreference.org`;
      const creditTwitter = handle ? `\nBy ${handle}` : '';

      const fixedLength = ctaText.length + creditTwitter.length + hashtagsTwitter.length + 5;
      const maxTitleLen = Math.max(20, 280 - fixedLength);

      const trimmedTitle = title.length > maxTitleLen ? `${title.slice(0, maxTitleLen - 3)}...` : title;

      return `${trimmedTitle}${creditTwitter}${ctaText}\n\n${hashtagsTwitter}`;
    }

    case 'linkedin': {
      const descSnippet = description ? `\n\n${description.slice(0, 300)}${description.length > 300 ? '...' : ''}` : '';
      const linkedinTags = formatHashtags(tags, 6);
      const titleLine = handle ? `\n\n${title}` : '';
      return `${hook}${titleLine}${descSnippet}\n\nCheck out more animations at animationreference.org\n\n${linkedinTags}`;
    }

    default:
      return `${title}\n\nCheck out more animations at animationreference.org`;
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
