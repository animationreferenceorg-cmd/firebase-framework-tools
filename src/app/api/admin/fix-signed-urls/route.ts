import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, getFirebaseStorage } from '@/lib/firebase-admin';

export const maxDuration = 300;

/**
 * Repairs video records whose videoUrl is a Cloud Storage *signed* URL.
 *
 * Those URLs were minted with `expires: '03-01-2500'`, which looks permanent
 * but is only valid while the signing service account still holds its key.
 * When that account was removed every signature became invalid at once and the
 * clips began returning SignatureDoesNotMatch, leaving blank cards.
 *
 * Reference clips are public, so the fix is to make each object public and
 * store a plain unsigned URL, which depends on no key at all.
 *
 * Guarded by CRON_SECRET. Call with ?secret=...&dryRun=1 first to preview.
 */

const SIGNED_URL_MARKER = /GoogleAccessId=|X-Goog-Signature=/;

/** Pulls the object path out of a storage URL, whichever host form it uses. */
function objectPathFromUrl(url: string, bucketName: string): string | null {
    try {
        const parsed = new URL(url);
        const raw = decodeURIComponent(parsed.pathname);
        // https://storage.googleapis.com/<bucket>/<path>
        const prefix = `/${bucketName}/`;
        if (raw.startsWith(prefix)) return raw.slice(prefix.length);
        // https://<bucket>.storage.googleapis.com/<path>
        if (parsed.hostname.startsWith(`${bucketName}.`)) return raw.replace(/^\//, '');
        return null;
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret');
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';

    try {
        const db = getFirestore();
        const bucket = getFirebaseStorage().bucket();

        const snapshot = await db.collection('videos').get();
        const affected = snapshot.docs.filter((doc) => SIGNED_URL_MARKER.test(doc.data()?.videoUrl || ''));

        const result = {
            dryRun,
            scanned: snapshot.size,
            affected: affected.length,
            published: 0,
            updated: 0,
            skipped: [] as { id: string; reason: string }[],
            failed: [] as { id: string; error: string }[],
        };

        if (dryRun) {
            return NextResponse.json({
                ...result,
                sample: affected.slice(0, 5).map((d) => ({
                    id: d.id,
                    title: d.data()?.title,
                    objectPath: objectPathFromUrl(d.data()?.videoUrl || '', bucket.name),
                })),
            });
        }

        // Firestore caps a batch at 500 writes.
        let batch = db.batch();
        let pending = 0;

        for (const doc of affected) {
            const data = doc.data();
            const objectPath = data.storagePath || objectPathFromUrl(data.videoUrl || '', bucket.name);

            if (!objectPath) {
                result.skipped.push({ id: doc.id, reason: 'could not derive object path' });
                continue;
            }

            try {
                const file = bucket.file(objectPath);
                const [exists] = await file.exists();
                if (!exists) {
                    result.skipped.push({ id: doc.id, reason: `object missing: ${objectPath}` });
                    continue;
                }

                await file.makePublic();
                result.published += 1;

                const encoded = objectPath.split('/').map(encodeURIComponent).join('/');
                batch.update(doc.ref, {
                    videoUrl: `https://storage.googleapis.com/${bucket.name}/${encoded}`,
                    storagePath: objectPath,
                    updatedAt: new Date(),
                });
                result.updated += 1;
                pending += 1;

                if (pending >= 400) {
                    await batch.commit();
                    batch = db.batch();
                    pending = 0;
                }
            } catch (error: any) {
                result.failed.push({ id: doc.id, error: error?.message || String(error) });
            }
        }

        if (pending > 0) await batch.commit();

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[fix-signed-urls]', error);
        return NextResponse.json({ error: error?.message || 'Migration failed' }, { status: 500 });
    }
}
