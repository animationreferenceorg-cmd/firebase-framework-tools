'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, Search, Download, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface BunnyVideo {
    guid: string;
    title: string;
    date: string;
    length: number;
    views: number;
    thumbnailFileName: string;
    // Add other fields as needed from Bunny API
}

export default function BunnyAdminPage() {
    const [videos, setVideos] = useState<BunnyVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { toast } = useToast();

    const fetchVideos = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);

            const res = await fetch(`/api/admin/bunny/list?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch videos');

            const data = await res.json();
            // Bunny API returns { totalItems: ..., items: [...] } or just [...] depend on endpoint version?
            // Usually it's `items`. Let's assume standard pagination response or array.
            // Docs: GET /library/{id}/videos returns { totalItems: number, currentPage: number, items: [...] }
            setVideos(data.items || []);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load videos from Bunny.net' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchVideos();
    };

    // Construct the direct import link
    const getImportLink = (video: BunnyVideo) => {
        // Bunny Play URL usually: https://iframe.mediadelivery.net/embed/{libraryId}/{guid} - this is embed
        // OR direct HLS: https://bz-full-url/playlist.m3u8
        // User likely wants the MP4 or the Embed URL. 
        // For now, let's construct a standard Bunny Direct Play URL if we can, or just pass the GUID for the form to handle.
        // But our Form expects a 'videoUrl'. 
        // Let's assume the user has a pull zone configured.
        // Actually, without the Pull Zone Hostname, we can't construct the public URL perfectly. 
        // We might need to ask the user for their public hostname in ENV too.
        // For now, let's pass the GUID and Title.

        // BETTER: Use the "Direct Play" url structure if we can guess it, or just use the GUID as a placeholder.
        const pullZone = process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE || 'your-pull-zone.b-cdn.net'; // We don't have this in client.

        // Let's just pass the title and a placeholder URL that mentions the GUID, the user can fix it or we can smart-detect.
        // Actually, typically it's `https://{pullzone}/{guid}/play_720p.mp4` or similar.

        return `/admin/videos/new?title=${encodeURIComponent(video.title)}&bunnyId=${video.guid}&thumbnailUrl=${encodeURIComponent(`https://${video.guid}.b-cdn.net/${video.thumbnailFileName}`)}`;
        // Note: Thumbnail URL above is a guess, usually it's tied to the pull zone.
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bunny.net Sync</h1>
                    <p className="text-muted-foreground">Import videos directly from your Bunny.net library.</p>
                </div>
                <Button onClick={fetchVideos} variant="outline" size="icon">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search videos..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button type="submit">Search</Button>
                    </form>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <Skeleton key={i} className="aspect-video rounded-lg" />
                            ))}
                        </div>
                    ) : videos.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No videos found. Check your API configuration.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {videos.map((video) => (
                                <Card key={video.guid} className="overflow-hidden group">
                                    <div className="aspect-video bg-muted relative">
                                        {/* We'll try to show the thumbnail using the GUID based URL if possible, otherwise placeholder */}
                                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-black/10">
                                            <Video className="h-10 w-10 opacity-50" />
                                        </div>
                                        <img
                                            src={`https://vz-${video.guid.split('-')[0]}.b-cdn.net/${video.guid}/${video.thumbnailFileName}`}
                                            // Note: The hostname for thumbnails varies by region (vz-...). This is tricky without info.
                                            // Fallback to a generic bunny placeholder or just text.
                                            className="absolute inset-0 w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                            alt={video.title}
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Link href={`/admin/videos/new?title=${encodeURIComponent(video.title)}&videoUrl=${encodeURIComponent(`https://video.bunnycdn.com/play/${video.guid}`)}`}>
                                                <Button size="sm" variant="secondary">
                                                    <Download className="mr-2 h-4 w-4" />
                                                    Import
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                    <CardContent className="p-4">
                                        <div className="font-semibold truncate" title={video.title}>{video.title}</div>
                                        <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                                            <span>{Math.round(video.length / 60)} min</span>
                                            <span>{new Date(video.date).toLocaleDateString()}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
