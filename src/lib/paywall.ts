// src/lib/paywall.ts

/** Safely get local count from localStorage */
export function getLocalCounter(): number {
  return 0;
}

/** Synchronously increment view counter (disabled prompt) */
export function incrementVideoViews(uid?: string): { count: number; showPrompt: boolean } {
  return { count: 0, showPrompt: false };
}

/** Always return false - feature disabled */
export function shouldShowPrompt(): boolean {
  return false;
}

/** Legacy export wrappers for compatibility */
export async function incrementCounter(uid?: string): Promise<number> {
  return 0;
}

export async function shouldShowDonatePrompt(uid?: string): Promise<boolean> {
  return false;
}
