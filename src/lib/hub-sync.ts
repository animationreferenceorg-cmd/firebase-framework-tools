import type { Video } from '@/lib/types';

/**
 * Tracks a save/re-pin event to the global AnimationReference hub registry.
 * Ingests external items and boosts trending score for items saved by users.
 */
export async function trackHubSave(
  userId: string | undefined,
  boardId: string | undefined,
  video: Video,
  action: 'save' | 'unsave' = 'save'
): Promise<void> {
  try {
    await fetch('/api/hub/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        boardId,
        video,
        action,
      }),
    });
  } catch (err) {
    console.warn('Failed to sync hub save:', err);
  }
}

/**
 * Fetches top saved / community-pinned references
 */
export async function fetchTrendingHubReferences(limit = 12): Promise<Video[]> {
  try {
    const res = await fetch(`/api/hub/trending?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.warn('Failed to fetch trending hub references:', err);
    return [];
  }
}
