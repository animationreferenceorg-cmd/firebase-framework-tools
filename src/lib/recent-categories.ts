// Tracks recently viewed category IDs in localStorage (max 10)
const KEY = 'recentCategoryIds';
const MAX = 10;

export function trackCategoryView(categoryId: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const filtered = ids.filter(id => id !== categoryId); // remove duplicate
    filtered.unshift(categoryId); // add to front
    localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX)));
  } catch {}
}

export function getRecentCategoryIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
