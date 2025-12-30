
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const apiKey = process.env.BUNNY_API_KEY;
    const libraryId = process.env.BUNNY_LIBRARY_ID;

    if (!apiKey || !libraryId) {
        return NextResponse.json({ error: 'Bunny.net configuration missing (BUNNY_API_KEY or BUNNY_LIBRARY_ID)' }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const page = searchParams.get('page') || '1';
        const search = searchParams.get('search') || '';

        let url = `https://video.bunnycdn.com/library/${libraryId}/videos?page=${page}&itemsPerPage=1000&orderBy=date`;

        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }

        const response = await fetch(url, {
            headers: {
                'AccessKey': apiKey,
                'accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: `Bunny API error: ${response.statusText}`, details: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Error fetching from Bunny.net:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
