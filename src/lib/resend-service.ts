import { Resend } from 'resend';

// Initialize Resend client using RESEND_API_KEY environment variable
const resendApiKey = process.env.RESEND_API_KEY || '';
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface FounderEmailPayload {
  toEmail: string;
  displayName: string;
  username?: string;
}

/**
 * Sends automated welcome & 7-Day Free Trial / $2 Lifetime Founder Deal email via Resend.
 */
export async function sendFounderDealWelcomeEmail({ toEmail, displayName, username }: FounderEmailPayload) {
  if (!resendApiKey || !resend) {
    console.warn("RESEND_API_KEY missing in environment variables. Email simulation mode.");
    return { success: false, message: "RESEND_API_KEY not configured" };
  }

  const handleSlug = username || 'yourname';
  const profileLink = `https://animationreference.org/profile`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #09090b; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 580px; margin: 0 auto; background-color: #121215; border-radius: 20px; border: 1px solid rgba(168,85,247,0.3); padding: 32px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); }
          .badge { display: inline-block; padding: 6px 14px; background: linear-gradient(135deg, #a855f7, #ec4899); color: #ffffff; font-weight: 800; font-size: 11px; border-radius: 50px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px; }
          h1 { font-size: 26px; font-weight: 900; line-height: 1.25; margin-bottom: 12px; color: #ffffff; }
          p { font-size: 14px; line-height: 1.6; color: #d4d4d8; margin-bottom: 20px; }
          .highlight-box { background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.3); border-radius: 14px; padding: 16px; margin: 24px 0; }
          .feature-item { font-size: 13px; color: #e4e4e7; margin-bottom: 8px; display: flex; align-items: center; }
          .btn { display: inline-block; width: 100%; text-align: center; background: linear-gradient(135deg, #a855f7, #ec4899); color: #ffffff; font-weight: 800; font-size: 15px; padding: 14px 24px; border-radius: 14px; text-decoration: none; box-shadow: 0 10px 25px rgba(168,85,247,0.4); margin-top: 10px; }
          .footer { font-size: 11px; color: #71717a; text-align: center; margin-top: 28px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">🎁 7-Day Free Trial • $2/mo Lifetime Deal</div>
          <h1>Welcome to AnimationReference, ${displayName}!</h1>
          <p>Claim your personal animator portfolio handle and start sharing your blocking passes, WIPs, and reels with studio recruiters.</p>
          
          <div class="highlight-box">
            <div style="font-weight: 800; font-size: 14px; color: #c084fc; margin-bottom: 10px;">✨ What's Included in Your Portfolio:</div>
            <div class="feature-item">🌐 <strong>Custom Profile URL</strong>: animationreference.org/${handleSlug}</div>
            <div class="feature-item">🎬 <strong>Frame Scrubber</strong>: Pick keyframe cover thumbnails for video passes</div>
            <div class="feature-item">🏷️ <strong>Software & Hashtags</strong>: Tag Maya, Blender, Unreal, & mechanics</div>
            <div class="feature-item">🔒 <strong>$2/mo Lifetime Price Lock</strong>: Never upcharged as long as active</div>
          </div>

          <a href="${profileLink}" class="btn">🚀 Claim $2/mo Lifetime Founder Deal</a>

          <div class="footer">
            © 2026 AnimationReference.org • Free for all animators worldwide
          </div>
        </div>
      </body>
    </html>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'AnimationReference <onboarding@resend.dev>';

  try {
    const data = await resend.emails.send({
      from: fromAddress,
      to: [toEmail],
      subject: `🎉 Welcome ${displayName}! Claim your portfolio handle & $2 Founder Deal`,
      html: htmlContent,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Resend email failed:", error);
    return { success: false, error: error.message || error };
  }
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

  const projectLink = `https://animationreference.org/studio/projects/${projectId}`;
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
          <h1>🎬 ${applicantName} wants to join ${projectTitle}</h1>
          <p>Hey ${ownerName}, you've got a new crew application${roleTitle ? ` for <strong>${roleTitle}</strong>` : ''}.</p>
          <div class="quote">"${message}"</div>
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

  const projectLink = `https://animationreference.org/studio/projects/${projectId}`;
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
          <h1>🎉 You're in, ${applicantName}!</h1>
          <p>You've been accepted onto the crew for <strong>${projectTitle}</strong>. Head over to the Crew tab to see your onboarding checklist and say hi in the chat.</p>
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
