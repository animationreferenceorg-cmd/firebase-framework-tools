import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

// Helper to fetch JSON from Sakugabooru using curl to bypass Cloudflare bot check
function fetchJsonWithCurl(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
        const args = ['-s', '-L', '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', url];
        const proc = spawn(curlCmd, args, { shell: true });
        let stdout = '';
        let stderr = '';
        
        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });
        
        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`curl failed with code ${code}: ${stderr}`));
            } else {
                try {
                    resolve(JSON.parse(stdout));
                } catch (e: any) {
                    reject(new Error(`Failed to parse json: ${e.message}. Output was: ${stdout.substring(0, 200)}`));
                }
            }
        });
    });
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limitParam = searchParams.get('limit') || '40';
        const tagsParam = searchParams.get('tags') || '';
        
        const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10)));
        
        // We add order:random to the tags parameter to fetch random posts
        let queryTags = 'order:random';
        if (tagsParam) {
            // Clean up tags to match Booru format (space-separated, lowercase, underscores)
            const cleanTags = tagsParam.trim().toLowerCase().replace(/-/g, '_');
            queryTags += ' ' + cleanTags;
        }
        
        const apiUrl = `https://www.sakugabooru.com/post.json?tags=${encodeURIComponent(queryTags)}&limit=${limit * 2}`;
        console.log(`[API] Sakugabooru random fetching: ${apiUrl}`);
        
        const posts = await fetchJsonWithCurl(apiUrl);
        if (!Array.isArray(posts)) {
            return NextResponse.json({ error: 'Invalid response from Sakugabooru.' }, { status: 502 });
        }
        
        // Filter for videos only and map to standard database schema
        const videos = posts
            .filter((p: any) => ['mp4', 'webm', 'mkv'].includes((p.file_ext || '').toLowerCase()))
            .slice(0, limit)
            .map((p: any) => {
                const mappedTags = (p.tags || '')
                    .split(' ')
                    .map((t: string) => t.trim().toLowerCase().replace(/_/g, '-'))
                    .filter(Boolean);
                
                return {
                    id: `sakugabooru-${p.id}`,
                    name: p.source || `Sakugabooru Post #${p.id}`,
                    title: p.source || `Sakugabooru Post #${p.id}`,
                    description: `Source: ${p.source || 'Unknown'}\nRating: ${p.rating.toUpperCase()}, Score: ${p.score}\nOriginal: https://www.sakugabooru.com/post/show/${p.id}`,
                    videoUrl: p.file_url,
                    thumbnailUrl: p.preview_url || '',
                    posterUrl: p.preview_url || '',
                    tags: mappedTags,
                    width: p.width || 854,
                    height: p.height || 480,
                    duration: 0,
                    category: 'sakugabooru',
                    importSource: 'sakugabooru',
                    originalUrl: `https://www.sakugabooru.com/post/show/${p.id}`
                };
            });
            
        return NextResponse.json(videos);
    } catch (error: any) {
        console.error('[API] Sakugabooru random error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
