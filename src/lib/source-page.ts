/**
 * The web page a browser-extension save came from. Only http(s) pages are
 * accepted; the fragment is dropped and lengths are capped so the clip can
 * credit and link back to its source safely.
 */
export function parseSourcePage(
  rawUrl: FormDataEntryValue | null | undefined,
  rawTitle: FormDataEntryValue | null | undefined,
): { url: string; host: string; title: string } | null {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    parsed.hash = '';
    const url = parsed.toString();
    if (url.length > 2000) return null;
    const title = typeof rawTitle === 'string' ? rawTitle.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
    return { url, host: parsed.hostname.replace(/^www\./, ''), title };
  } catch {
    return null;
  }
}
