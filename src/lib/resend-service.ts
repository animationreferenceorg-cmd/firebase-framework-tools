import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || '';

export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY || '';
  return key ? new Resend(key) : null;
}

export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/** Escapes user-supplied text before it goes into email HTML (names, titles, messages). */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface CrewApplicationEmailPayload {
  toEmail: string;
  ownerName: string;
  applicantName: string;
  projectTitle: string;
  roleTitle?: string;
  message: string;
  projectId: string;
}

/** Notifies a project owner that someone applied to join their crew. */
export async function sendCrewApplicationEmail({ toEmail, ownerName, applicantName, projectTitle, roleTitle, message, projectId }: CrewApplicationEmailPayload) {
  if (!resendApiKey || !resend) {
    console.warn("RESEND_API_KEY missing in environment variables. Email simulation mode.");
    return { success: false, message: "RESEND_API_KEY not configured" };
  }

  const projectLink = `https://animationreference.org/studio/projects/${encodeURIComponent(projectId)}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #09090b; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 580px; margin: 0 auto; background-color: #121215; border-radius: 20px; border: 1px solid rgba(168,85,247,0.3); padding: 32px; }
          h1 { font-size: 22px; font-weight: 900; margin-bottom: 12px; }
          p { font-size: 14px; line-height: 1.6; color: #d4d4d8; margin-bottom: 16px; }
          .quote { background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.3); border-radius: 14px; padding: 16px; font-size: 13px; color: #e4e4e7; margin-bottom: 20px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #a855f7, #ec4899); color: #ffffff; font-weight: 800; font-size: 15px; padding: 14px 24px; border-radius: 14px; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎬 ${esc(applicantName)} wants to join ${esc(projectTitle)}</h1>
          <p>Hey ${esc(ownerName)}, you've got a new crew application${roleTitle ? ` for <strong>${esc(roleTitle)}</strong>` : ''}.</p>
          <div class="quote">"${esc(message)}"</div>
          <a href="${projectLink}" class="btn">Review Application</a>
        </div>
      </body>
    </html>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'AnimationReference <onboarding@resend.dev>';
  try {
    const data = await resend.emails.send({
      from: fromAddress,
      to: [toEmail],
      subject: `🎬 ${applicantName} applied to join ${projectTitle}`,
      html: htmlContent,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Resend email failed:", error);
    return { success: false, error: error.message || error };
  }
}

export interface CrewAcceptedEmailPayload {
  toEmail: string;
  applicantName: string;
  projectTitle: string;
  projectId: string;
}

/** Notifies an applicant they've been accepted onto a crew. */
export async function sendCrewAcceptedEmail({ toEmail, applicantName, projectTitle, projectId }: CrewAcceptedEmailPayload) {
  if (!resendApiKey || !resend) {
    console.warn("RESEND_API_KEY missing in environment variables. Email simulation mode.");
    return { success: false, message: "RESEND_API_KEY not configured" };
  }

  const projectLink = `https://animationreference.org/studio/projects/${encodeURIComponent(projectId)}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #09090b; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 580px; margin: 0 auto; background-color: #121215; border-radius: 20px; border: 1px solid rgba(168,85,247,0.3); padding: 32px; }
          h1 { font-size: 24px; font-weight: 900; margin-bottom: 12px; }
          p { font-size: 14px; line-height: 1.6; color: #d4d4d8; margin-bottom: 20px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #a855f7, #ec4899); color: #ffffff; font-weight: 800; font-size: 15px; padding: 14px 24px; border-radius: 14px; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎉 You're in, ${esc(applicantName)}!</h1>
          <p>You've been accepted onto the crew for <strong>${esc(projectTitle)}</strong>. Head over to the Crew tab to see your onboarding checklist and say hi in the chat.</p>
          <a href="${projectLink}" class="btn">Go to Production</a>
        </div>
      </body>
    </html>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'AnimationReference <onboarding@resend.dev>';
  try {
    const data = await resend.emails.send({
      from: fromAddress,
      to: [toEmail],
      subject: `🎉 You're in! Welcome to the ${projectTitle} crew`,
      html: htmlContent,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Resend email failed:", error);
    return { success: false, error: error.message || error };
  }
}

/** Sends the one-time code that proves a student controls their SJSU inbox. */
export async function sendSjsuVerificationCode({ toEmail, code }: { toEmail: string; code: string }) {
  if (!resendApiKey || !resend) {
    console.warn("RESEND_API_KEY missing in environment variables. Email simulation mode.");
    return { success: false, message: "RESEND_API_KEY not configured" };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #09090b; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 580px; margin: 0 auto; background-color: #121215; border-radius: 20px; border: 1px solid rgba(229,168,35,0.4); padding: 32px; }
          h1 { font-size: 22px; font-weight: 900; margin-bottom: 12px; }
          p { font-size: 14px; line-height: 1.6; color: #d4d4d8; margin-bottom: 20px; }
          .code { font-family: 'SFMono-Regular', Menlo, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #E5A823; background: rgba(229,168,35,0.1); border-radius: 14px; padding: 16px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Your SJSU Student Pass code</h1>
          <p>Enter this code on animationreference.org/sjsu to activate your free unlimited pass. It expires in 15 minutes.</p>
          <div class="code">${code}</div>
          <p style="font-size: 12px; color: #71717a; margin-top: 24px;">If you didn't request this, you can ignore this email.</p>
        </div>
      </body>
    </html>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'AnimationReference <onboarding@resend.dev>';
  try {
    const data = await resend.emails.send({
      from: fromAddress,
      to: [toEmail],
      subject: `${code} is your SJSU Student Pass code`,
      html: htmlContent,
    });
    if (data.error) return { success: false, error: data.error.message };
    return { success: true, data };
  } catch (error: any) {
    console.error("Resend email failed:", error);
    return { success: false, error: error.message || error };
  }
}

export interface PasswordResetEmailPayload {
  toEmail: string;
  resetLink: string;
  displayName?: string;
}

/** Sends a branded, high-deliverability password reset link. */
export async function sendPasswordResetEmailResend({ toEmail, resetLink, displayName }: PasswordResetEmailPayload) {
  if (!resendApiKey || !resend) {
    console.warn("RESEND_API_KEY missing in environment variables. Email simulation mode.");
    return { success: false, message: "RESEND_API_KEY not configured" };
  }

  const name = displayName ? esc(displayName) : 'Animator';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #07060b; color: #ffffff; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background-color: #12101b; border-radius: 20px; border: 1px solid rgba(168,85,247,0.3); padding: 36px 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3); color: #c084fc; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
          h1 { font-size: 24px; font-weight: 900; color: #ffffff; margin: 0 0 14px 0; letter-spacing: -0.5px; }
          p { font-size: 14px; line-height: 1.6; color: #d4d4d8; margin: 0 0 18px 0; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { display: inline-block; background: linear-gradient(135deg, #9333ea, #ec4899); color: #ffffff !important; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 20px rgba(147,51,234,0.4); }
          .link-fallback { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px; font-size: 11px; color: #a1a1aa; word-break: break-all; margin-top: 20px; }
          .footer { font-size: 12px; color: #71717a; margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">Security &amp; Account</div>
          <h1>Reset your Animation Reference password</h1>
          <p>Hey ${name},</p>
          <p>We received a request to reset the password for your Animation Reference account. Click the button below to choose a new password:</p>
          <div class="btn-container">
            <a href="${resetLink}" class="btn">Reset My Password</a>
          </div>
          <p style="font-size: 13px; color: #a1a1aa;">This reset link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email — your account remains secure.</p>
          <div class="link-fallback">
            Button not working? Copy and paste this URL into your browser:<br />
            <a href="${resetLink}" style="color: #c084fc; text-decoration: underline;">${resetLink}</a>
          </div>
          <div class="footer">
            Animation Reference · The motion reference library &amp; portfolio builder for animators.<br />
            <a href="https://animationreference.org" style="color: #a1a1aa;">animationreference.org</a>
          </div>
        </div>
      </body>
    </html>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'AnimationReference <accounts@animationreference.org>';
  try {
    const data = await resend.emails.send({
      from: fromAddress,
      to: [toEmail],
      subject: 'Reset your Animation Reference password',
      html: htmlContent,
    });
    if (data.error) return { success: false, error: data.error.message };
    return { success: true, data };
  } catch (error: any) {
    console.error("Resend password reset email failed:", error);
    return { success: false, error: error.message || error };
  }
}

export interface WelcomeEmailPayload {
  toEmail: string;
  displayName?: string;
}

/** Sends a welcome onboarding email to new animators who created an account. */
export async function sendWelcomeEmail({ toEmail, displayName }: WelcomeEmailPayload) {
  if (!resendApiKey || !resend) {
    console.warn("RESEND_API_KEY missing in environment variables. Email simulation mode.");
    return { success: false, message: "RESEND_API_KEY not configured" };
  }

  const name = displayName ? esc(displayName) : 'Animator';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #07060b; color: #ffffff; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background-color: #12101b; border-radius: 20px; border: 1px solid rgba(168,85,247,0.3); padding: 36px 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
          h1 { font-size: 26px; font-weight: 900; color: #ffffff; margin: 0 0 14px 0; letter-spacing: -0.5px; }
          p { font-size: 14px; line-height: 1.6; color: #d4d4d8; margin: 0 0 18px 0; }
          .perks { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px 20px; margin: 24px 0; }
          .perk-item { margin-bottom: 12px; font-size: 13px; color: #e4e4e7; line-height: 1.5; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { display: inline-block; background: linear-gradient(135deg, #9333ea, #ec4899); color: #ffffff !important; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 20px rgba(147,51,234,0.4); }
          .footer { font-size: 12px; color: #71717a; margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">Welcome to Animation Reference</div>
          <h1>Welcome aboard, ${name}! 🎬</h1>
          <p>You're now part of the reference library built by animators, for animators. Your free account is loaded with everything you need to study motion and elevate your shots.</p>
          
          <div class="perks">
            <div class="perk-item">🍿 <strong>25 Free Clips Every Day:</strong> Study 25 new clips every 24 hours. Rewatching previously opened references never costs quota.</div>
            <div class="perk-item">⌨️ <strong>Frame-by-Frame Scrubbing:</strong> Press <code style="background: #27272a; padding: 2px 6px; border-radius: 4px; color: #e4e4e7;">,</code> and <code style="background: #27272a; padding: 2px 6px; border-radius: 4px; color: #e4e4e7;">.</code> to step frame by frame and break down arcs, anticipation, and spacing.</div>
            <div class="perk-item">📦 <strong>Maya &amp; Blender Viewport Plugins:</strong> Import references directly into your Maya camera planes or Blender 3D viewport.</div>
            <div class="perk-item">🌟 <strong>Animator Portfolio:</strong> Share your work at <span style="color: #c084fc;">animationreference.org/u/yourname</span> with zero ads and frame-scrubbing for recruiters.</div>
          </div>

          <div class="btn-container">
            <a href="https://animationreference.org/home" class="btn">Start Studying References</a>
          </div>

          <div class="footer">
            Animation Reference · <a href="https://animationreference.org" style="color: #a1a1aa;">animationreference.org</a><br />
            Questions or feedback? Reply directly to this email!
          </div>
        </div>
      </body>
    </html>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'AnimationReference <welcome@animationreference.org>';
  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY missing. Email simulation mode.");
    return { success: false, message: "RESEND_API_KEY not configured" };
  }

  try {
    const data = await client.emails.send({
      from: fromAddress,
      to: [toEmail],
      subject: 'Welcome to Animation Reference! 🎬 Here is how to get started',
      html: htmlContent,
    });
    if (data.error) return { success: false, error: data.error.message };
    return { success: true, data };
  } catch (error: any) {
    console.error("Resend welcome email failed:", error);
    return { success: false, error: error.message || error };
  }
}

/** Generates clean, dark-mode, high-converting HTML for the $1 intro offer. */
export function renderOneDollarPromoHtml(name = 'Animator', customMessage?: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #07060b; color: #ffffff; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background-color: #12101d; border-radius: 24px; border: 1px solid rgba(168,85,247,0.35); padding: 36px 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.8); }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: rgba(234,179,8,0.15); border: 1px solid rgba(234,179,8,0.4); color: #fde047; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 18px; }
          h1 { font-size: 25px; font-weight: 900; color: #ffffff; margin: 0 0 14px 0; letter-spacing: -0.5px; line-height: 1.25; }
          .highlight { color: #c084fc; }
          p { font-size: 14px; line-height: 1.65; color: #d4d4d8; margin: 0 0 16px 0; }
          .offer-box { background: linear-gradient(135deg, rgba(147,51,234,0.18), rgba(236,72,153,0.12)); border: 1px solid rgba(168,85,247,0.45); border-radius: 18px; padding: 22px; margin: 22px 0; text-align: center; }
          .price-strike { font-size: 16px; color: #71717a; text-decoration: line-through; margin-right: 8px; }
          .price-huge { font-size: 40px; font-weight: 900; color: #4ade80; }
          .price-sub { font-size: 12px; color: #a1a1aa; margin-top: 4px; }
          .features { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 18px; margin: 22px 0; }
          .feature-item { margin-bottom: 12px; font-size: 13px; color: #e4e4e7; line-height: 1.5; }
          .feature-item:last-child { margin-bottom: 0; }
          .btn-container { text-align: center; margin: 26px 0 14px 0; }
          .btn { display: inline-block; background: linear-gradient(135deg, #9333ea, #ec4899); color: #ffffff !important; font-weight: 800; font-size: 15px; padding: 15px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 20px rgba(147,51,234,0.45); }
          .terms { font-size: 11px; color: #71717a; text-align: center; margin-top: 8px; }
          .footer { font-size: 11px; color: #71717a; margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; text-align: center; line-height: 1.6; }
          .footer a { color: #a1a1aa; text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">⚡ Special Animator Invite</div>
          <h1>Unlock Full Pro for <span class="highlight">$1 for your first month</span></h1>
          <p>Hey ${esc(name)},</p>
          <p>${customMessage ? esc(customMessage) : "You're one of the early animators using Animation Reference. To help you elevate your shots and production workflow, we're giving you an exclusive invite to try Animation Reference Pro for just $1."}</p>
          
          <div class="offer-box">
            <div>
              <span class="price-strike">$5.00/mo</span>
              <span class="price-huge">$1.00</span>
            </div>
            <div class="price-sub">For your first month · Cancel anytime in 1 click</div>
          </div>

          <div class="features">
            <div class="feature-item">📥 <strong>Clean 24 FPS MP4 Downloads:</strong> Import reference clips directly into your Maya camera planes, Blender viewports, or SyncSketch sessions.</div>
            <div class="feature-item">⏱️ <strong>Synchronized Playblast Compare:</strong> Scrub your 3D playblast or 2D animation pass side-by-side with reference to spot spacing and arcs instantly.</div>
            <div class="feature-item">🍿 <strong>Zero Daily Limits:</strong> Unlimited daily references and frame-stepping (bypasses the 25-clip daily limit).</div>
            <div class="feature-item">🔒 <strong>Unlimited Private Boards:</strong> Organize references for NDA client studio work with private encrypted moodboards.</div>
          </div>

          <div class="btn-container">
            <a href="https://animationreference.org/pricing?deal=intro" class="btn">Claim Your $1 Pro Pass &rarr;</a>
          </div>
          <div class="terms">$1.00 for your first month, then $5.00/mo thereafter. Cancel anytime with 1 click in your account settings.</div>

          <div class="footer">
            Animation Reference · The motion reference library &amp; portfolio builder for animators.<br />
            You received this email because you created an account on <a href="https://animationreference.org">animationreference.org</a>.<br />
            <a href="https://animationreference.org/profile">Account Settings</a> · <a href="https://animationreference.org">Visit Library</a>
          </div>
        </div>
      </body>
    </html>
  `;
}

export interface PromoBroadcastPayload {
  toEmail: string;
  recipientName?: string;
  customMessage?: string;
}

/** Sends the $1 first month promo email to a single recipient. */
export async function sendOneDollarPromoEmail({ toEmail, recipientName, customMessage }: PromoBroadcastPayload) {
  const client = getResendClient();
  if (!client) {
    return { success: false, message: "RESEND_API_KEY not configured" };
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Animation Reference <team@animationreference.org>';
  const htmlContent = renderOneDollarPromoHtml(recipientName, customMessage);

  try {
    const data = await client.emails.send({
      from: fromAddress,
      to: [toEmail],
      subject: '⚡ Special Animator Offer: Get Pro for $1 (Normally $5/mo)',
      html: htmlContent,
    });
    if (data.error) return { success: false, error: data.error.message };
    return { success: true, data };
  } catch (error: any) {
    console.error("Resend promo email failed:", error);
    return { success: false, error: error.message || error };
  }
}

export interface NewsletterBroadcastPayload {
  toEmail: string;
  subject: string;
  htmlContent: string;
}

/** Sends a custom newsletter broadcast email. */
export async function sendNewsletterBroadcastEmail({ toEmail, subject, htmlContent }: NewsletterBroadcastPayload) {
  const client = getResendClient();
  if (!client) {
    return { success: false, message: "RESEND_API_KEY not configured" };
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Animation Reference <team@animationreference.org>';
  try {
    const data = await client.emails.send({
      from: fromAddress,
      to: [toEmail],
      subject,
      html: htmlContent,
    });
    if (data.error) return { success: false, error: data.error.message };
    return { success: true, data };
  } catch (error: any) {
    console.error("Resend newsletter email failed:", error);
    return { success: false, error: error.message || error };
  }
}
