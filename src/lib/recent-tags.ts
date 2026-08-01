// Tracks recently viewed tags in localStorage (max 10), lowercased to match
// the tag index keys used across the browse directory.
const KEY = 'recentTags';
const MAX = 10;

export function trackTagView(tag: string) {
  if (typeof window === 'undefined' || !tag) return;
  try {
    const t = tag.toLowerCase().trim();
    if (!t) return;
    const raw = localStorage.getItem(KEY);
    const tags: string[] = raw ? JSON.parse(raw) : [];
    const filtered = tags.filter((x) => x !== t); // remove duplicate
    filtered.unshift(t); // add to front
    localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX)));
  } catch {}
}

export function getRecentTags(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
