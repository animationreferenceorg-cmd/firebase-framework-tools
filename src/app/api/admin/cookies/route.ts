import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin';

/**
 * POST /api/admin/cookies
 * Upload cookies.txt content for yt-dlp authentication.
 * Body: raw text content of a Netscape-format cookies.txt file.
 * Query param: ?platform=instagram (default: instagram)
 */
export async function POST(request: NextRequest) {
    try {
        const platform = request.nextUrl.searchParams.get('platform') || 'instagram';
        const cookieContent = await request.text();

        if (!cookieContent || cookieContent.trim().length < 10) {
            return NextResponse.json({ error: 'Cookie content is empty or too short' }, { status: 400 });
        }

        const db = getFirestore();
        await db.collection('config').doc('cookies').set({
            [platform]: cookieContent,
            [`${platform}_updatedAt`]: new Date().toISOString(),
        }, { merge: true });

        return NextResponse.json({
            success: true,
            message: `Cookies for ${platform} saved successfully.`,
            size: cookieContent.length,
        });
    } catch (error: any) {
        console.error('[Cookies API] Error saving cookies:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/admin/cookies
 * Check if cookies are configured (does NOT return cookie content).
 */
export async function GET() {
    try {
        const db = getFirestore();
        const doc = await db.collection('config').doc('cookies').get();

        if (!doc.exists) {
            return NextResponse.json({ configured: false, platforms: [] });
        }

        const data = doc.data() || {};
        const platforms = Object.keys(data)
            .filter(k => !k.endsWith('_updatedAt'))
            .map(platform => ({
                platform,
                updatedAt: data[`${platform}_updatedAt`] || 'unknown',
                size: (data[platform] as string)?.length || 0,
            }));

        return NextResponse.json({ configured: platforms.length > 0, platforms });
    } catch (error: any) {
        console.error('[Cookies API] Error checking cookies:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/cookies
 * Remove stored cookies.
 */
export async function DELETE(request: NextRequest) {
    try {
        const platform = request.nextUrl.searchParams.get('platform');
        const db = getFirestore();

        if (platform) {
            // Delete specific platform cookies
            const { FieldValue } = require('firebase-admin/firestore');
            await db.collection('config').doc('cookies').update({
                [platform]: FieldValue.delete(),
                [`${platform}_updatedAt`]: FieldValue.delete(),
            });
            return NextResponse.json({ success: true, message: `Cookies for ${platform} removed.` });
        } else {
            // Delete all cookies
            await db.collection('config').doc('cookies').delete();
            return NextResponse.json({ success: true, message: 'All cookies removed.' });
        }
    } catch (error: any) {
        console.error('[Cookies API] Error deleting cookies:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
