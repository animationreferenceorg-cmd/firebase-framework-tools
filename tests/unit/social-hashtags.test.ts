import { describe, expect, it } from 'vitest';
import { getSocialHashtagsForQuery, buildInstagramHashtagQuery } from '@/lib/social-hashtags';
import { isExternalExpiringUrl } from '@/lib/server-media-persist';

describe('Social Media Hashtag Sourcing & Persistence', () => {
  it('maps movement animation keywords to creator hashtags', () => {
    const divingTags = getSocialHashtagsForQuery('diving');
    expect(divingTags).toContain('divinganimation');
    expect(divingTags).toContain('divingreference');
    expect(divingTags).toContain('bodymechanics');

    const runningTags = getSocialHashtagsForQuery('running');
    expect(runningTags).toContain('runcycle');
    expect(runningTags).toContain('runninganimation');

    const jumpingTags = getSocialHashtagsForQuery('jumping');
    expect(jumpingTags).toContain('jumpcycle');
    expect(jumpingTags).toContain('jumpinganimation');

    const actingTags = getSocialHashtagsForQuery('acting');
    expect(actingTags).toContain('characteracting');
    expect(actingTags).toContain('actingreference');
  });

  it('builds optimized Instagram search query for hashtags and reels', () => {
    const divingQuery = buildInstagramHashtagQuery('diving');
    expect(divingQuery).toContain('site:instagram.com');
    expect(divingQuery).toContain('#divinganimation');

    const actingQuery = buildInstagramHashtagQuery('acting');
    expect(actingQuery).toContain('site:instagram.com');
    expect(actingQuery).toContain('#characteracting');
  });

  it('detects external expiring Instagram and social media CDN tokens', () => {
    expect(isExternalExpiringUrl('https://scontent.cdninstagram.com/v/t51.2885-15/test.jpg?_nc_cat=1&oe=65E123&oh=00_AY')).toBe(true);
    expect(isExternalExpiringUrl('https://instagram.fiev22-1.fna.fbcdn.net/v/t51.2885-15/pic.jpg?oe=6789')).toBe(true);
    expect(isExternalExpiringUrl('https://storage.googleapis.com/my-bucket/references/clips/123.jpg')).toBe(false);
    expect(isExternalExpiringUrl('/api/proxy/image?url=https%3A%2F%2Fcdninstagram.com%2Fpic.jpg')).toBe(false);
  });
});

