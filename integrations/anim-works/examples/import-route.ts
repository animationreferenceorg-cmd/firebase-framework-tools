/**
 * Feature B: receiving a reference sent from animationreference.org.
 *
 * A user clicks the Anim.works button on a clip and their browser arrives here
 * with ?token=…&source=animationreference. Exchange the token once, server side,
 * then open the clip in the review tool.
 *
 * Written for a Next.js App Router route handler. The logic is framework
 * agnostic - see the Express version at the bottom.
 */

import { ArefClient, ArefApiError } from '../src';

const client = new ArefClient({ apiKey: process.env.AREF_API_KEY! });

// GET /import
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');

  if (!token) {
    return Response.redirect(new URL('/?error=missing_token', request.url), 302);
  }

  try {
    // Single use. This must happen exactly once per token, on the server.
    const { video, user } = await client.redeemHandoff(token);

    if (!video.streamUrl) {
      // The key is missing the media:stream scope. A configuration problem,
      // not a user error - do not silently show a broken player.
      console.error('[aref] handoff redeemed but no streamUrl: key lacks media:stream scope');
      return Response.redirect(new URL('/?error=integration_misconfigured', request.url), 302);
    }

    // Create the review session. `user.id` is a stable pseudonym for this
    // person - the same every time they send you something - so returning users
    // land back in their own workspace without any shared login.
    const session = await createReviewSession({
      mediaUrl: video.streamUrl,
      title: video.title,
      durationSeconds: video.durationSeconds,
      fps: video.fps,
      width: video.width,
      height: video.height,
      // Required attribution, shown in the review UI.
      attribution: {
        creator: video.credit.name,
        creatorUrl: video.credit.sourceUrl,
        sourceLabel: 'Animation Reference',
        sourceUrl: video.url,
      },
      guestKey: user.id,
    });

    return Response.redirect(new URL(`/review/${session.id}`, request.url), 302);
  } catch (error) {
    if (error instanceof ArefApiError) {
      // None of these are worth retrying - the client already retried anything
      // transient before throwing.
      const message =
        error.code === 'TOKEN_EXPIRED' || error.code === 'TOKEN_ALREADY_USED'
          ? 'link_expired'
          : error.code === 'VIDEO_UNAVAILABLE'
            ? 'reference_unavailable'
            : 'invalid_link';

      console.warn(`[aref] handoff failed: ${error.code}`, error.message);
      return Response.redirect(new URL(`/?error=${message}`, request.url), 302);
    }
    throw error;
  }
}

// Your existing code - stubbed here.
declare function createReviewSession(input: {
  mediaUrl: string;
  title: string;
  durationSeconds?: number;
  fps?: number;
  width?: number;
  height?: number;
  attribution: {
    creator: string | null;
    creatorUrl: string | null;
    sourceLabel: string;
    sourceUrl: string;
  };
  guestKey: string;
}): Promise<{ id: string }>;

/* ---------------------------------------------------------------------------
 * Express equivalent:
 *
 *   app.get('/import', async (req, res) => {
 *     const token = String(req.query.token || '');
 *     if (!token) return res.redirect('/?error=missing_token');
 *     try {
 *       const { video, user } = await client.redeemHandoff(token);
 *       if (!video.streamUrl) return res.redirect('/?error=integration_misconfigured');
 *       const session = await createReviewSession({ ... });
 *       res.redirect(`/review/${session.id}`);
 *     } catch (error) {
 *       if (error instanceof ArefApiError) return res.redirect('/?error=invalid_link');
 *       throw error;
 *     }
 *   });
 * ------------------------------------------------------------------------- */
