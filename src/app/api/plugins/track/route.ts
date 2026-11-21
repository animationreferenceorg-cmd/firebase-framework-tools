import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore } from '@/lib/firebase-admin';
import { apiErrorResponse, requireFirebaseUser } from '@/lib/api-auth';

export const runtime = 'nodejs';

const VALID_EVENTS = new Set(['download', 'account_linked', 'upgrade_click']);
const VALID_PLUGINS = new Set(['maya', 'blender', 'extension']);

/**
 * POST /api/plugins/track
 * Tracks Maya/Blender plugin funnel events in Firebase Firestore:
 * - download (anonymous or signed-in)
 * - account_linked (signed-in — also stamps users/{uid}.linkedPlugins for Pro conversion attribution)
 * - upgrade_click
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const event = String(body?.event || '').trim().toLowerCase();
    const plugin = String(body?.plugin || '').trim().toLowerCase();
    const source = String(body?.source || 'web').trim().slice(0, 60);

    if (!VALID_EVENTS.has(event) || !VALID_PLUGINS.has(plugin)) {
      return NextResponse.json({ error: 'Invalid event or plugin.' }, { status: 400 });
    }

    let uid: string | null = null;
    if (request.headers.get('authorization')?.startsWith('Bearer ')) {
      try {
        const identity = await requireFirebaseUser(request);
        uid = identity.uid;
      } catch {
        uid = null;
      }
    }

    const db = getFirestore();
    const now = FieldValue.serverTimestamp();
    const rollupRef = db.collection('analytics_rollups').doc('plugin_funnel');

    const rollupUpdates: Record<string, any> = { updatedAt: now };
    if (event === 'download') {
      rollupUpdates.downloads_total = FieldValue.increment(1);
      rollupUpdates[`downloads_${plugin}`] = FieldValue.increment(1);
    } else if (event === 'account_linked') {
      rollupUpdates.accounts_linked_total = FieldValue.increment(1);
      rollupUpdates[`accounts_linked_${plugin}`] = FieldValue.increment(1);
    } else if (event === 'upgrade_click') {
      rollupUpdates.upgrade_clicks_total = FieldValue.increment(1);
      rollupUpdates[`upgrade_clicks_${plugin}`] = FieldValue.increment(1);
    }

    const writes: Promise<any>[] = [
      rollupRef.set(rollupUpdates, { merge: true }),
      db.collection('plugin_analytics_events').add({
        event,
        plugin,
        source,
        uid,
        createdAt: now,
      }),
    ];

    // Stamp user profile so future Stripe Pro conversions are attributed back to the plugin!
    if (uid && event === 'account_linked') {
      writes.push(
        db.collection('users').doc(uid).set(
          {
            linkedPlugins: FieldValue.arrayUnion(plugin),
            lastLinkedPlugin: plugin,
            lastLinkedPluginAt: now,
          },
          { merge: true }
        )
      );
    }

    await Promise.all(writes);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * GET /api/plugins/track
 * Admin-only rollup of plugin downloads, linked accounts, and attributed Pro conversions.
 */
export async function GET(request: NextRequest) {
  try {
    const identity = await requireFirebaseUser(request);
    if (identity.admin !== true) {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const db = getFirestore();
    const [rollupSnap, recentSnap] = await Promise.all([
      db.collection('analytics_rollups').doc('plugin_funnel').get(),
      db.collection('plugin_analytics_events').orderBy('createdAt', 'desc').limit(25).get().catch(() => null),
    ]);

    return NextResponse.json({
      summary: rollupSnap.exists ? rollupSnap.data() : {},
      recentEvents: recentSnap
        ? recentSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        : [],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
