'use server';

export async function extractInstagramVideoUrl(url: string) {
    try {
        // robust headers to mimic a real browser
        const response = await fetch(url, {
            headers: {
                // "Magic" User-Agent: This mimics the Facebook Link Preview crawler, which is usually allowed to see OG tags.
                'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            // sometimes 403 or 302 means auth required, but we try anyway
            console.warn(`Instagram fetch status: ${response.status}`);
        }

        const html = await response.text();

        // 1. Try Open Graph tags
        let videoMatch = html.match(/<meta\s+property="og:video"\s+content="([^"]+)"/i);
        let imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);

        // 2. Try simple regex for "video_url" in JSON blobs
        if (!videoMatch) {
            // look for "video_url":"https://..."
            const specificMatch = html.match(/"video_url":"([^"]+)"/);
            if (specificMatch) {
                // Need to unescape json content (\u0026 -> &)
                videoMatch = specificMatch;
            }
        }

        if (videoMatch && videoMatch[1]) {
            // Decode HTML entities (simple) and JSON unicodes
            let videoUrl = videoMatch[1]
                .replace(/&amp;/g, '&')
                .replace(/\\u0026/g, '&')
                .replace(/\\u0025/g, '%')
                .replace(/\\/g, ''); // basic slash cleanup if double escaped

            let thumbnailUrl = '';
            if (imageMatch && imageMatch[1]) {
                thumbnailUrl = imageMatch[1]
                    .replace(/&amp;/g, '&')
                    .replace(/\\u0026/g, '&');
            } else {
                // Try backup json image
                const jsonImage = html.match(/"display_url":"([^"]+)"/);
                if (jsonImage) thumbnailUrl = jsonImage[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
            }

            return {
                success: true,
                videoUrl,
                thumbnailUrl,
            };
        }

        // Debugging: Log a snippet to see what we got
        console.error('Instagram HTML Snippet:', html.substring(0, 500));

        return {
            success: false,
            error: 'No video URL found. Instagram may require login or is detecting the bot.',
        };

    } catch (error: any) {
        console.error('Error extracting Instagram URL:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred',
        };
    }
}
