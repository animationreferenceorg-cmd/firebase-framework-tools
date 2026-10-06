import { describe, expect, it, vi } from 'vitest';
import { SITE_REFERER, resolveDownloadUrl } from '@/lib/download-url';
import { evaluateBoardCreation } from '@/lib/board-limits';

const HLS = 'https://vz-1.b-cdn.net/guid-1/playlist.m3u8';

type ProbeInit = { method: string; headers: Record<string, string>; signal: AbortSignal };

function fetchWith(existing: string[]) {
  return vi.fn(async (url: string, _init: ProbeInit) => ({ ok: existing.includes(url) }));
}

describe('resolveDownloadUrl', () => {
  it('picks the best rendition that exists', async () => {
    const f = fetchWith(['https://vz-1.b-cdn.net/guid-1/play_720p.mp4', 'https://vz-1.b-cdn.net/guid-1/play_480p.mp4']);
    expect(await resolveDownloadUrl(HLS, f)).toBe('https://vz-1.b-cdn.net/guid-1/play_720p.mp4');
  });

  it('falls back to a lower rendition when 720p was never encoded', async () => {
    const f = fetchWith(['https://vz-1.b-cdn.net/guid-1/play_480p.mp4']);
    expect(await resolveDownloadUrl(HLS, f)).toBe('https://vz-1.b-cdn.net/guid-1/play_480p.mp4');
  });

  it('probes with the site as referrer, since the CDN rejects other referrers', async () => {
    const f = fetchWith(['https://vz-1.b-cdn.net/guid-1/play_1080p.mp4']);
    await resolveDownloadUrl(HLS, f);
    expect(f.mock.calls[0][1].headers.Referer).toBe(SITE_REFERER);
    expect(f.mock.calls[0][1].method).toBe('HEAD');
  });

  it('returns null when no rendition exists', async () => {
    expect(await resolveDownloadUrl(HLS, fetchWith([]))).toBeNull();
  });

  it('treats a network failure as a missing file instead of throwing', async () => {
    const f = vi.fn(async (_url: string, _init: ProbeInit): Promise<{ ok: boolean }> => { throw new Error('network down'); });
    expect(await resolveDownloadUrl(HLS, f)).toBeNull();
  });

  it('passes through direct https files and rejects embeds and insecure links', async () => {
    expect(await resolveDownloadUrl('https://cdn.example.com/a.mp4', fetchWith([]))).toBe('https://cdn.example.com/a.mp4');
    expect(await resolveDownloadUrl('https://www.youtube.com/watch?v=x', fetchWith([]))).toBeNull();
    expect(await resolveDownloadUrl('http://cdn.example.com/a.mp4', fetchWith([]))).toBeNull();
    expect(await resolveDownloadUrl(undefined, fetchWith([]))).toBeNull();
  });
});

describe('evaluateBoardCreation', () => {
  const free = { role: 'user' };
  const pro = { role: 'user', isPremium: true, tier: 'tier5', plan: 'pro_monthly' };
  const sjsu = { role: 'user', isPremium: true, tier: 'student_unlimited', isVIP: true, unlimitedAccess: true };

  it('lets a free user create their first board', () => {
    expect(evaluateBoardCreation(free, [], false).allowed).toBe(true);
  });

  it('blocks a free user at the 1-board limit', () => {
    const d = evaluateBoardCreation(free, ['a'], false);
    expect(d).toMatchObject({ allowed: false, block: 'board_limit', limit: 1 });
  });

  it('counts a board that exists in both stores only once', () => {
    // The same board id appears in reference_boards and in moodboards.
    expect(evaluateBoardCreation(free, ['a', 'a'], false)).toMatchObject({ allowed: false, block: 'board_limit' });
    expect(evaluateBoardCreation({ role: 'user', isPremium: true, tier: 'tier1' }, ['a', 'a', 'b'], false).allowed).toBe(true); // 2 of 3
  });

  it('blocks private boards for free users', () => {
    expect(evaluateBoardCreation(free, [], true)).toMatchObject({ allowed: false, block: 'private_requires_pro' });
  });

  it('gives Pro and SJSU unlimited and private boards', () => {
    const many = Array.from({ length: 50 }, (_, i) => `b${i}`);
    expect(evaluateBoardCreation(pro, many, true).allowed).toBe(true);
    expect(evaluateBoardCreation(sjsu, many, true).allowed).toBe(true);
  });

  it('does not treat a canceled subscription as Pro', () => {
    const canceled = { role: 'user', isPremium: true, tier: 'tier5', plan: 'pro_monthly', subscriptionStatus: 'canceled' };
    expect(evaluateBoardCreation(canceled, ['a'], false).allowed).toBe(false);
  });
});
