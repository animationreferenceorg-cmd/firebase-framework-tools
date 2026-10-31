/** Escapes user-supplied text before it goes into email HTML (names, titles, messages). */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CDN_LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/site-assets%2Femail%2Flogo-transparent.png?alt=media&token=email-public-token-2026';
const CDN_BANNER_URL = 'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/site-assets%2Femail%2Fproduction-studio.png?alt=media&token=email-public-token-2026';

/** Generates clean, dark-mode, high-converting HTML for the $1 intro offer. */
export function renderOneDollarPromoHtml(name = 'Animator', customMessage?: string): string {
  const recipient = esc(name || 'Animator');
  const greeting = customMessage
    ? esc(customMessage)
    : "As an active member of our animation community, we&#39;re giving you an exclusive VIP invite to unlock the complete Animation Reference Pro studio for just $1.00.";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your Animation Reference Pro Pass is Ready</title>
    <!--[if mso]>
    <style type="text/css">
      body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
    </style>
    <![endif]-->
    <style type="text/css">
      body {
        margin: 0;
        padding: 0;
        background-color: #07060b;
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      table { border-collapse: separate; }
      a { text-decoration: none; }
      .wrapper { width: 100%; table-layout: fixed; background-color: #07060b; padding-bottom: 40px; }
      .webkit { max-width: 600px; margin: 0 auto; }
      .outer {
        margin: 0 auto;
        width: 100%;
        max-width: 600px;
        background: #0f0d1a;
        border: 1px solid rgba(168, 85, 247, 0.35);
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
      }
      .btn-primary:hover {
        background: linear-gradient(135deg, #a855f7 0%, #f43f5e 100%) !important;
      }
      @media only screen and (max-width: 600px) {
        .inner-padding { padding: 24px 18px !important; }
        .hero-title { font-size: 24px !important; line-height: 1.25 !important; }
        .price-huge { font-size: 38px !important; }
        .feature-col { display: block !important; width: 100% !important; margin-bottom: 12px !important; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #07060b; color: #ffffff;">
    <!-- HIDDEN INBOX PREHEADER (Prevents promo classification snippet) -->
    <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0; mso-hide: all;">
      Your account pass to Animation Reference Pro has been activated. Clean 24 FPS MP4 downloads, playblast compare, and unlimited scrubbing. &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    </div>

    <center class="wrapper" style="width: 100%; table-layout: fixed; background-color: #07060b; padding: 24px 10px 48px 10px;">
      <div class="webkit" style="max-width: 600px; margin: 0 auto;">
        
        <!-- TOP BRAND HEADER -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 18px;">
          <tr>
            <td align="center" style="padding: 10px 0;">
              <a href="https://animationreference.org" target="_blank" style="display: inline-flex; align-items: center; text-decoration: none;">
                <img src="${CDN_LOGO_URL}" alt="Animation Reference" width="180" style="display: block; border: 0; max-width: 180px; height: auto;" />
              </a>
            </td>
          </tr>
        </table>

        <!-- MAIN CARD CONTAINER -->
        <table class="outer" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f0d1a; border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 24px; overflow: hidden;">
          
          <!-- HERO HEADER WITH AMBIENT GRADIENT -->
          <tr>
            <td style="background: linear-gradient(180deg, rgba(147, 51, 234, 0.22) 0%, rgba(15, 13, 26, 0) 100%); padding: 36px 32px 12px 32px; text-align: center;">
              
              <!-- VIP INVITE PILL -->
              <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 16px auto;">
                <tr>
                  <td style="background: rgba(234, 179, 8, 0.12); border: 1px solid rgba(234, 179, 8, 0.45); border-radius: 9999px; padding: 5px 16px;">
                    <span style="font-size: 11px; font-weight: 800; color: #fde047; text-transform: uppercase; letter-spacing: 0.8px;">
                      &#9733; Exclusive Animator Invitation
                    </span>
                  </td>
                </tr>
              </table>

              <!-- MAIN HEADLINE -->
              <h1 class="hero-title" style="margin: 0 0 14px 0; font-size: 28px; font-weight: 900; line-height: 1.25; color: #ffffff; letter-spacing: -0.5px;">
                Upgrade Your Shot Polish with Pro for Just <span style="color: #c084fc; text-shadow: 0 0 25px rgba(192, 132, 252, 0.45);">$1.00</span>
              </h1>

              <p style="margin: 0 auto; max-width: 480px; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                Hey ${recipient}, ${greeting}
              </p>
            </td>
          </tr>

          <!-- HERO VISUAL PREVIEW BANNER -->
          <tr>
            <td align="center" style="padding: 16px 28px 0 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius: 16px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.9);">
                <tr>
                  <td style="line-height: 0; background-color: #07060b;">
                    <a href="https://animationreference.org/pricing?deal=intro" target="_blank">
                      <img src="${CDN_BANNER_URL}" alt="Animation Reference Pro Studio" width="100%" style="display: block; width: 100%; max-width: 544px; height: auto; border: 0;" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TICKET STYLE PRICING DEAL BOX -->
          <tr>
            <td style="padding: 24px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, rgba(88, 28, 135, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%); border: 1px solid rgba(192, 132, 252, 0.4); border-radius: 18px; padding: 22px; text-align: center;">
                <tr>
                  <td>
                    <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 8px auto;">
                      <tr>
                        <td style="background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 6px; padding: 3px 10px;">
                          <span style="font-size: 10px; font-weight: 800; color: #4ade80; text-transform: uppercase; letter-spacing: 0.5px;">80% Off &bull; Limited Founder Invite</span>
                        </td>
                      </tr>
                    </table>

                    <div style="margin: 10px 0 4px 0;">
                      <span style="font-size: 17px; color: #71717a; text-decoration: line-through; margin-right: 10px; font-weight: 600;">$5.00/mo</span>
                      <span class="price-huge" style="font-size: 44px; font-weight: 900; color: #4ade80; letter-spacing: -1px; text-shadow: 0 0 20px rgba(74, 222, 128, 0.35);">$1.00</span>
                    </div>
                    <div style="font-size: 12px; color: #d4d4d8; font-weight: 500;">
                      For your first full month of Pro access &bull; Cancel anytime with 1 click
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- WHAT PRO GIVES YOU: 4 GRAPHICAL FEATURE CARDS -->
          <tr>
            <td style="padding: 0 28px 24px 28px;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #c084fc; margin-bottom: 14px; text-align: center;">
                Everything Included in Your Pro Pass
              </div>

              <!-- Feature Grid -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <!-- Row 1 -->
                <tr>
                  <!-- Card 1 -->
                  <td class="feature-col" width="48%" valign="top" style="background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 16px; margin-bottom: 12px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="top" style="font-size: 22px; line-height: 1; padding-right: 10px;">📥</td>
                        <td valign="top">
                          <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">Clean 24 FPS MP4 Downloads</div>
                          <div style="font-size: 11px; color: #a1a1aa; line-height: 1.5;">Import clips straight into Maya camera image planes, Blender viewports, or SyncSketch reviews.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="4%">&nbsp;</td>
                  <!-- Card 2 -->
                  <td class="feature-col" width="48%" valign="top" style="background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 16px; margin-bottom: 12px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="top" style="font-size: 22px; line-height: 1; padding-right: 10px;">⏱️</td>
                        <td valign="top">
                          <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">Playblast Side-by-Side</div>
                          <div style="font-size: 11px; color: #a1a1aa; line-height: 1.5;">Scrub your 3D playblast or 2D pass locked with real motion to diagnose weight, spacing, and arcs.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr><td height="12" colspan="3"></td></tr>

                <!-- Row 2 -->
                <tr>
                  <!-- Card 3 -->
                  <td class="feature-col" width="48%" valign="top" style="background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 16px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="top" style="font-size: 22px; line-height: 1; padding-right: 10px;">🍿</td>
                        <td valign="top">
                          <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">Unlimited 4K Frame Scrubbing</div>
                          <div style="font-size: 11px; color: #a1a1aa; line-height: 1.5;">No 25-clip daily quota. Inspect micro-breakdowns and arcs across all 7,800+ motion references anytime.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="4%">&nbsp;</td>
                  <!-- Card 4 -->
                  <td class="feature-col" width="48%" valign="top" style="background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 16px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="top" style="font-size: 22px; line-height: 1; padding-right: 10px;">🔒</td>
                        <td valign="top">
                          <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">Private NDA Boards & Folders</div>
                          <div style="font-size: 11px; color: #a1a1aa; line-height: 1.5;">Keep confidential studio production research safe in organized, password-encrypted personal boards.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HIGH CONVERTING CALL TO ACTION BUTTON -->
          <tr>
            <td align="center" style="padding: 12px 28px 16px 28px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 14px; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); box-shadow: 0 8px 30px rgba(147, 51, 234, 0.5);">
                    <a href="https://animationreference.org/pricing?deal=intro" target="_blank" class="btn-primary" style="display: inline-block; padding: 18px 42px; font-size: 16px; font-weight: 900; color: #ffffff; text-decoration: none; border-radius: 14px; letter-spacing: 0.2px;">
                      Claim Your $1 Pro Pass &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Trust Reassurance -->
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #71717a; text-align: center;">
                🔒 Secure checkout powered by Stripe &bull; $1 for month 1, then $5/mo &bull; Cancel in 1 click anytime
              </p>
            </td>
          </tr>

          <!-- PERSONAL CONVERSATIONAL NOTE (Helps Primary Inbox Placement) -->
          <tr>
            <td style="padding: 18px 28px; background: rgba(255, 255, 255, 0.015); border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: left;">
              <p style="margin: 0 0 10px 0; font-size: 13px; line-height: 1.6; color: #a1a1aa;">
                We built Animation Reference to give animators the best motion study tools in the industry. If you have any feedback, questions, or requests for specific action or locomotion references, reply directly to this email &mdash; I read every message.
              </p>
              <p style="margin: 0; font-size: 13px; font-weight: 700; color: #ffffff;">
                Michael &amp; the Animation Reference Team
              </p>
            </td>
          </tr>

          <!-- COMMUNITY TRUST BAR -->
          <tr>
            <td style="padding: 14px 28px; background: rgba(0, 0, 0, 0.4); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #71717a;">
                ⚡ Trusted by <strong>2,000+</strong> 3D animators, rigging TDs, and character artists worldwide.
              </p>
            </td>
          </tr>
        </table>

        <!-- PROFESSIONAL FOOTER -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
          <tr>
            <td align="center" style="font-size: 11px; line-height: 1.6; color: #52525b; text-align: center;">
              <p style="margin: 0 0 8px 0;">
                <strong style="color: #71717a;">Animation Reference</strong> &bull; The motion reference &amp; shot polish studio for animators.
              </p>
              <p style="margin: 0 0 8px 0;">
                You received this exclusive invite because you have an account on <a href="https://animationreference.org" target="_blank" style="color: #a1a1aa; text-decoration: underline;">animationreference.org</a>.
              </p>
              <p style="margin: 0;">
                <a href="https://animationreference.org/profile" target="_blank" style="color: #71717a; text-decoration: underline;">Account Settings</a> &bull;
                <a href="https://animationreference.org/pricing" target="_blank" style="color: #71717a; text-decoration: underline;">View All Plans</a> &bull;
                <a href="https://animationreference.org" target="_blank" style="color: #71717a; text-decoration: underline;">Browse Library</a>
              </p>
            </td>
          </tr>
        </table>

      </div>
    </center>
  </body>
</html>`;
}
