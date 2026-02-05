
import { NextResponse } from 'next/server';
import { getFirebaseStorage } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const storage = getFirebaseStorage();
        const bucket = storage.bucket('aniamtion-reference.firebasestorage.app'); // Explicitly using the bucket from the URL

        await bucket.setCorsConfiguration([
            {
                origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://animationreference.org'],
                method: ['GET', 'HEAD', 'OPTIONS'],
                responseHeader: ['Content-Type', 'Access-Control-Allow-Origin'],
                maxAgeSeconds: 3600
            }
        ]);

        return NextResponse.json({ success: true, message: 'CORS configuration updated for bucket.' });
    } catch (error: any) {
        console.error('Error setting CORS:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
