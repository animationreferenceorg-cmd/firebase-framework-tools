
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getFirebaseStorage } from '@/lib/firebase-admin';

async function getSignedUrl(filePath: string) {
    getAdminApp(); // Ensure app is initialized
    const bucket = getFirebaseStorage().bucket();
    const file = bucket.file(filePath);
    const [exists] = await file.exists();

    if (!exists) {
        return null;
    }

    const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    return url;
}

export async function GET(
    request: NextRequest,
    context: any
) {
    getAdminApp(); // Ensure app is initialized
    
    const path = (await context?.params)?.path;
    if (!path || !Array.isArray(path)) {
        return new NextResponse('Invalid file path', { status: 400 });
    }

    const filePath = path.join('/');
    
    if (!filePath) {
        return new NextResponse('File path is required', { status: 400 });
    }

    try {
        const signedUrl = await getSignedUrl(filePath);

        if (!signedUrl) {
            return new NextResponse('File not found', { status: 404 });
        }

        // Redirect to the signed URL
        return NextResponse.redirect(signedUrl, { status: 307 });

    } catch (error) {
        console.error('Error generating signed URL:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
