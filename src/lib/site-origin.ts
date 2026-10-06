/**
 * The public origin to put in links we hand to Stripe (checkout return URLs,
 * billing-portal return URLs).
 *
 * Behind Firebase App Hosting, `req.nextUrl.origin` is the container's own
 * address (https://0.0.0.0:8080), not the site. Customers were being sent
 * there after paying. Use the forwarded host when it is one of ours, and fall
 * back to the canonical domain otherwise. Never trust an arbitrary Host
 * header: it would let a crafted request redirect paying users elsewhere.
 */

export const CANONICAL_ORIGIN = 'https://animationreference.org';

const ALLOWED_HOSTS = new Set(['animationreference.org', 'www.animationreference.org']);
const LOCAL_HOST = /^(localhost|127\.0\.0\.1)(:\d+)?$/;

interface HeaderSource {
  get(name: string): string | null;
}

export function publicOrigin(headers: HeaderSource): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  if (configured && /^https?:\/\//.test(configured)) return configured;

  const host = (headers.get('x-forwarded-host') || headers.get('host') || '').split(',')[0].trim().toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return `https://${host}`;
  if (LOCAL_HOST.test(host)) {
    const proto = (headers.get('x-forwarded-proto') || 'http').split(',')[0].trim();
    return `${proto === 'https' ? 'https' : 'http'}://${host}`;
  }
  return CANONICAL_ORIGIN;
}
