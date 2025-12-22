import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }

        const html = await response.text();

        const getMetaTag = (property: string) => {
            const regex = new RegExp(`<meta property="${property}" content="([^"]*)"`, 'i');
            const match = html.match(regex);
            return match ? match[1] : '';
        };

        // Also try 'name' attribute if 'property' is missing (common for description)
        const getMetaName = (name: string) => {
            const regex = new RegExp(`<meta name="${name}" content="([^"]*)"`, 'i');
            const match = html.match(regex);
            return match ? match[1] : '';
        };

        const title = getMetaTag('og:title') || html.match(/<title>([^<]*)<\/title>/i)?.[1] || '';
        const description = getMetaTag('og:description') || getMetaName('description') || '';
        const image = getMetaTag('og:image') || '';

        return NextResponse.json({
            title: title.replace(/&amp;/g, '&'),
            description: description.replace(/&amp;/g, '&'),
            image
        });

    } catch (error: any) {
        console.error('Metadata fetch error:', error);
        return NextResponse.json({ error: `Failed to fetch metadata: ${error.message}` }, { status: 500 });
    }
}
