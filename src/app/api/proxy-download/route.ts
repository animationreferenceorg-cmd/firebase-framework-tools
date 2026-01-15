import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch source: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';

        return new NextResponse(response.body, {
            headers: {
                'Content-Type': contentType,
                // Optional: Add caching headers if needed
            },
        });
    } catch (error) {
        console.error('Proxy download error:', error);
        return new NextResponse('Failed to download file', { status: 500 });
    }
}
