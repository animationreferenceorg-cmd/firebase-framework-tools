import { formatUsd } from '../plans';

/**
 * Lifecycle email content. Plain, short, one call to action each. Every email
 * carries an unsubscribe link and the sender's postal address (CAN-SPAM).
 */

export type LifecycleTemplate = 'welcome' | 'tips' | 'offer' | 'quota_reset' | 'winback';

export interface TemplateContext {
  firstName: string;
  unsubscribeUrl: string;
  postalAddress: string;
  /** Intro price in cents when the recipient is eligible, else null. */
  introCents: number | null;
  regularCents: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const SITE = 'https://animationreference.org';

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function utm(path: string, campaign: LifecycleTemplate): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${SITE}${path}${sep}utm_source=email&utm_medium=lifecycle&utm_campaign=${campaign}`;
}

function layout(ctx: TemplateContext, heading: string, paragraphs: string[], cta: { label: string; url: string }): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#d4d4d8">${p}</p>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#09090b;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#121215;border:1px solid rgba(168,85,247,0.3);border-radius:16px;padding:32px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#ffffff">${heading}</h1>
${body}
<a href="${esc(cta.url)}" style="display:inline-block;margin-top:8px;padding:12px 20px;border-radius:10px;background:#7c3aed;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none">${cta.label}</a>
<p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#71717a">
Animation Reference · ${esc(ctx.postalAddress)}<br>
You're getting this because you have an Animation Reference account. <a href="${esc(ctx.unsubscribeUrl)}" style="color:#a1a1aa">Unsubscribe</a>
</p>
</div></body></html>`;
}

function textVersion(paragraphs: string[], cta: { label: string; url: string }, ctx: TemplateContext): string {
  const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return [...paragraphs.map(strip), `${cta.label}: ${cta.url}`, '', `Animation Reference · ${ctx.postalAddress}`, `Unsubscribe: ${ctx.unsubscribeUrl}`].join('\n\n');
}

export function renderLifecycleEmail(template: LifecycleTemplate, ctx: TemplateContext): RenderedEmail {
  const name = esc(ctx.firstName || 'there');
  const regular = formatUsd(ctx.regularCents);
  const proLine = ctx.introCents !== null
    ? `Pro removes the daily limit and adds unlimited boards, clean MP4 downloads and playblast compare. Your first month is ${formatUsd(ctx.introCents)}, then ${regular}/month — cancel anytime.`
    : `Pro removes the daily limit and adds unlimited boards, clean MP4 downloads and playblast compare for ${regular}/month — cancel anytime.`;

  const make = (subject: string, heading: string, paragraphs: string[], cta: { label: string; url: string }): RenderedEmail => ({
    subject,
    html: layout(ctx, heading, paragraphs, cta),
    text: textVersion(paragraphs, cta, ctx),
  });

  switch (template) {
    case 'welcome':
      return make(
        'Welcome to Animation Reference',
        `Welcome, ${name}!`,
        [
          'Animation Reference is a library of motion to study frame by frame: combat, locomotion, acting, creatures and more.',
          'You can open 25 new references every day for free, and anything you’ve watched stays playable. Save the good ones to a board so they’re there when you need them for a shot.',
        ],
        { label: 'Start browsing', url: utm('/categories', 'welcome') },
      );
    case 'tips':
      return make(
        '3 ways to get more out of a reference',
        'Study a clip like an animator',
        [
          '<strong style="color:#fff">Loop the beat you care about.</strong> In the player, press I and O to set in and out points and loop just those frames.',
          '<strong style="color:#fff">Check the silhouette.</strong> Press C to cycle contrast and silhouette views and see if the pose reads.',
          '<strong style="color:#fff">Read the spacing.</strong> Turn on onion skin (G) while paused to see the frames before and after.',
        ],
        { label: 'Open a reference', url: utm('/categories', 'tips') },
      );
    case 'offer':
      return make(
        ctx.introCents !== null ? `Try Pro for ${formatUsd(ctx.introCents)}` : 'Unlimited references with Pro',
        'Ready for the full library?',
        [
          'If you’ve been running into the daily limit or want to keep references organized per shot, Pro is built for that.',
          proLine,
        ],
        { label: ctx.introCents !== null ? `Start Pro for ${formatUsd(ctx.introCents)}` : 'See Pro', url: utm('/pricing', 'offer') },
      );
    case 'quota_reset':
      return make(
        'Your 25 new references are ready',
        `Your daily references reset, ${name}`,
        [
          'You hit your daily limit yesterday. 25 new references are ready to open today, and everything you’ve already watched is still there.',
          proLine,
        ],
        { label: 'Keep studying', url: utm('/categories', 'quota_reset') },
      );
    case 'winback':
      return make(
        'We’ve improved Animation Reference',
        `It’s been a little while, ${name}`,
        [
          'Since you left Pro we’ve added study tools to the player — A–B loops, silhouette view and onion skinning — plus drawing exports over your reference.',
          `If you’d like to come back, Pro is ${regular}/month and you can cancel anytime.`,
        ],
        { label: 'See what’s new', url: utm('/pricing', 'winback') },
      );
  }
}
