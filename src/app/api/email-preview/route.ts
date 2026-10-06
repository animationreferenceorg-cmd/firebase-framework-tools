import { renderLifecycleEmail, type LifecycleTemplate } from '@/lib/email/lifecycle-templates';
import { getIntroOffer, getProOffers } from '@/lib/plans';

/**
 * Preview of the lifecycle emails with sample data, for reviewing copy:
 * /api/email-preview?template=welcome|tips|offer|quota_reset|winback
 */
const TEMPLATES: LifecycleTemplate[] = ['welcome', 'tips', 'offer', 'quota_reset', 'winback'];

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('template') as LifecycleTemplate | null;
  const template = requested && TEMPLATES.includes(requested) ? requested : 'welcome';
  const email = renderLifecycleEmail(template, {
    firstName: 'Sam',
    unsubscribeUrl: 'https://animationreference.org/api/email/unsubscribe?u=preview&t=preview',
    postalAddress: process.env.EMAIL_POSTAL_ADDRESS?.trim() || '[your postal address]',
    introCents: getIntroOffer()?.amountCents ?? null,
    regularCents: getProOffers().pro_monthly.amountCents,
  });
  const nav = TEMPLATES.map((t) => `<a href="?template=${t}" style="color:${t === template ? '#fff' : '#a78bfa'};margin-right:12px">${t}</a>`).join('');
  const html = `<div style="padding:12px 24px;background:#000;font:14px sans-serif;color:#a1a1aa">Subject: <strong style="color:#fff">${email.subject.replace(/</g, '&lt;')}</strong><br>${nav}</div>${email.html}`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
