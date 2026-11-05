export const INSTAGRAM_HANDLE = 'animationreference';
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;
export const INSTAGRAM_EVENT_NAME = 'animref:instagram-follow-prompt';

export type InstagramPromptReason = 'save' | 'like' | 'download' | 'browse';

/**
 * Triggers the smart Instagram follow prompt after a high-intent action
 * (saving a clip to a board, liking a clip, downloading an MP4, or studying clips).
 */
export function triggerInstagramFollowPrompt(reason: InstagramPromptReason = 'save') {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(INSTAGRAM_EVENT_NAME, { detail: { reason } }));
  } catch {
    // Ignore in environments without CustomEvent
  }
}

