import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || 'Michael';
  const username = searchParams.get('username') || 'michaelfredanim';

  const profileLink = `http://localhost:3000/profile`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Email Preview - AnimationReference Welcome & $2 Founder Deal</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #09090b; color: #ffffff; margin: 0; padding: 40px 20px; }
          .container { max-width: 580px; margin: 0 auto; background-color: #121215; border-radius: 24px; border: 1px solid rgba(168,85,247,0.3); padding: 36px; box-shadow: 0 25px 60px rgba(0,0,0,0.9); }
          .badge { display: inline-block; padding: 6px 16px; background: linear-gradient(135deg, #a855f7, #ec4899); color: #ffffff; font-weight: 800; font-size: 11px; border-radius: 50px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(168,85,247,0.4); }
          h1 { font-size: 28px; font-weight: 900; line-height: 1.25; margin-bottom: 12px; color: #ffffff; letter-spacing: -0.5px; }
          p { font-size: 14px; line-height: 1.6; color: #d4d4d8; margin-bottom: 20px; font-weight: 400; }
          .highlight-box { background: rgba(168,85,247,0.08); border: 1px solid rgba(168,85,247,0.25); border-radius: 16px; padding: 20px; margin: 24px 0; }
          .feature-item { font-size: 13px; color: #e4e4e7; margin-bottom: 10px; display: flex; align-items: center; line-height: 1.4; }
          .btn { display: inline-block; width: 100%; text-align: center; background: linear-gradient(135deg, #a855f7, #ec4899); color: #ffffff; font-weight: 800; font-size: 15px; padding: 16px 24px; border-radius: 16px; text-decoration: none; box-shadow: 0 10px 30px rgba(168,85,247,0.45); margin-top: 12px; box-sizing: border-box; }
          .footer { font-size: 11px; color: #71717a; text-align: center; margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; }
        </style>
      </head>
      <body>
        <div className="preview-bar" style="max-width: 580px; margin: 0 auto 16px auto; text-align: center; font-size: 12px; color: #a1a1aa;">
          👁️ <strong>Local Email Preview Mode</strong> (Simulated email output for Resend)
        </div>

        <div class="container">
          <div class="badge">🎁 7-Day Free Trial • $2/mo Lifetime Deal</div>
          <h1>Welcome to AnimationReference, ${name}!</h1>
          <p>Claim your personal animator portfolio handle and start sharing your blocking passes, WIPs, and reels with studio recruiters.</p>
          
          <div class="highlight-box">
            <div style="font-weight: 800; font-size: 14px; color: #c084fc; margin-bottom: 12px;">✨ Included in Your Animator Portfolio:</div>
            <div class="feature-item">🌐 &nbsp;<strong>Custom Profile URL</strong>: &nbsp;<span style="color: #c084fc; font-family: monospace;">animationreference.org/${username}</span></div>
            <div class="feature-item">🎬 &nbsp;<strong>Keyframe Scrubber</strong>: &nbsp;Select cover thumbnail frames for video passes</div>
            <div class="feature-item">🏷️ &nbsp;<strong>Software & Hashtags</strong>: &nbsp;Tag Maya, Blender, Unreal, & mechanics</div>
            <div class="feature-item">🔒 &nbsp;<strong>$2/mo Lifetime Price Lock</strong>: &nbsp;Never upcharged as long as active</div>
          </div>

          <a href="${profileLink}" class="btn">🚀 Claim $2/mo Lifetime Founder Deal</a>

          <div class="footer">
            © 2026 AnimationReference.org • Free for all animators worldwide
          </div>
        </div>
      </body>
    </html>
  `;

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
