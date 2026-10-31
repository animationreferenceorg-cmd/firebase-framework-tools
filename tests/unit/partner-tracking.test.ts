import { describe, it, expect } from 'vitest';
import { buildAnimWorksUrl } from '@/lib/partner-tracking';

describe('buildAnimWorksUrl', () => {
  it('appends UTM attribution parameters to standard anim.works url', () => {
    const url = buildAnimWorksUrl('https://anim.works/', {
      source: 'marketplace_banner',
      campaign: 'marketplace_tab',
    });

    const parsed = new URL(url);
    expect(parsed.hostname).toBe('anim.works');
    expect(parsed.searchParams.get('utm_source')).toBe('animationreference');
    expect(parsed.searchParams.get('utm_medium')).toBe('partner_marketplace');
    expect(parsed.searchParams.get('utm_campaign')).toBe('marketplace_tab');
    expect(parsed.searchParams.get('utm_content')).toBe('marketplace_banner');
  });

  it('preserves existing query parameters on deep links to anim.works', () => {
    const url = buildAnimWorksUrl('https://anim.works/review/new?video_url=https%3A%2F%2Fcdn.example.com%2Fvideo.mp4&title=Jump', {
      source: 'animworks_modal',
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get('video_url')).toBe('https://cdn.example.com/video.mp4');
    expect(parsed.searchParams.get('title')).toBe('Jump');
    expect(parsed.searchParams.get('utm_source')).toBe('animationreference');
    expect(parsed.searchParams.get('utm_medium')).toBe('partner_marketplace');
  });

  it('does not decorate external non-partner URLs', () => {
    const url = buildAnimWorksUrl('https://otherstore.com/item/123', {
      source: 'test',
    });

    expect(url).toBe('https://otherstore.com/item/123');
  });
});
