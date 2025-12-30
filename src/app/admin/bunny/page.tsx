'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, Search, Download, ExternalLink, RefreshCw, Eye, FileEdit, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BunnyVideo {
    guid: string;
    title: string;
    date: string;
    length: number;
    views: number;
    thumbnailFileName: string;
    description?: string;
    metaTags?: { property: string; value: string }[];
}

export default function BunnyAdminPage() {
    const [videos, setVideos] = useState<BunnyVideo[]>([]); // New to Import
    const [allBunnyVideos, setAllBunnyVideos] = useState<BunnyVideo[]>([]); // All from API
    const [importedGuids, setImportedGuids] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [previewVideo, setPreviewVideo] = useState<BunnyVideo | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<{ current: number, total: number } | null>(null);
    const [activeTab, setActiveTab] = useState('new');

    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        fetchVideos();
    }, []);

    const fetchVideos = async () => {
        setLoading(true);
        try {
            // 1. Fetch existing video GUIDs from Firestore to identify duplicates
            const videosRef = collection(db, 'videos');
            const querySnapshot = await getDocs(videosRef);

            const existingGuids = new Set<string>();

            querySnapshot.docs.forEach(doc => {
                const data = doc.data();
                // Check explicit external ID
                if (data.externalBunnyId) {
                    existingGuids.add(data.externalBunnyId);
                }

                // Also check videoUrl regex for legacy imports
                // Matches format: ...bunny.net/.../GUID/...
                // or just standard guid pattern in url if possible
                if (data.videoUrl) {
                    const match = data.videoUrl.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
                    if (match) {
                        existingGuids.add(match[1]);
                    }
                }
            });

            setImportedGuids(existingGuids);

            // 2. Fetch from Bunny API
            const params = new URLSearchParams();
            if (search) params.set('search', search);

            const res = await fetch(`/api/admin/bunny/list?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch videos');

            const data = await res.json();
            const fetchedVideos: BunnyVideo[] = data.items || [];

            setAllBunnyVideos(fetchedVideos);

            // Filter out videos that are already imported
            const newVideos = fetchedVideos.filter(v => !existingGuids.has(v.guid));
            setVideos(newVideos);

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load videos from Bunny.net' });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchVideos();
    };

    const getThumbnailUrl = (video: BunnyVideo) => {
        const host = process.env.NEXT_PUBLIC_BUNNY_STREAM_HOST;
        if (host) {
            return `https://${host}/${video.guid}/${video.thumbnailFileName}`;
        }
        return `https://vz-79893c7f-720.b-cdn.net/${video.guid}/${video.thumbnailFileName}`;
    };

    const getHlsUrl = (video: BunnyVideo) => {
        const host = process.env.NEXT_PUBLIC_BUNNY_STREAM_HOST;
        if (host) {
            return `https://${host}/${video.guid}/playlist.m3u8`;
        }
        return `https://vz-79893c7f-720.b-cdn.net/${video.guid}/playlist.m3u8`;
    };

    // Helper logic to import a single video
    const importSingleVideo = async (video: BunnyVideo) => {
        // Force generate first frame thumbnail
        try {
            await fetch('/api/admin/bunny/set-thumbnail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId: video.guid,
                    libraryId: process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || '481593'
                })
            });
        } catch (err) {
            console.error("Failed to set thumbnail time:", err);
        }

        const videoData = {
            title: video.title,
            description: video.description || '',
            videoUrl: getHlsUrl(video),
            thumbnailUrl: getThumbnailUrl({ ...video, thumbnailFileName: 'thumbnail.jpg' }),
            posterUrl: getThumbnailUrl({ ...video, thumbnailFileName: 'thumbnail.jpg' }),
            status: 'draft',
            tags: video.metaTags?.map(t => t.value) || [],
            createdAt: serverTimestamp(),
            externalBunnyId: video.guid,
            isShort: false,
        };

        await addDoc(collection(db, 'videos'), videoData);
    };

    const handleImportDraft = async (video: BunnyVideo) => {
        setIsImporting(true);
        try {
            await importSingleVideo(video);
            toast({ title: "Draft Created", description: "Video imported as draft." });
            router.push('/admin/videos?tab=draft');
        } catch (error) {
            console.error("Import failed:", error);
            toast({ variant: "destructive", title: "Import Failed", description: "Could not create draft." });
        } finally {
            setIsImporting(false);
        }
    };

    const handleImportAll = async () => {
        if (videos.length === 0) return;

        setIsImporting(true);
        setImportProgress({ current: 0, total: videos.length });

        try {
            let successCount = 0;
            for (let i = 0; i < videos.length; i++) {
                try {
                    await importSingleVideo(videos[i]);
                    successCount++;
                } catch (err) {
                    console.error(`Failed to import ${videos[i].title}`, err);
                }
                setImportProgress({ current: i + 1, total: videos.length });
            }

            toast({
                title: "Bulk Import Complete",
                description: `Successfully imported ${successCount} videos to drafts.`
            });

            router.push('/admin/videos?tab=draft');

        } catch (error) {
            console.error("Bulk import failed:", error);
            toast({ variant: "destructive", title: "Bulk Import Error", description: "Something went wrong during bulk import." });
        } finally {
            setIsImporting(false);
            setImportProgress(null);
        }
    };

    const VideoGrid = ({ items, showStatus }: { items: BunnyVideo[], showStatus?: boolean }) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((video) => {
                const isImported = importedGuids.has(video.guid);
                return (
                    <Card key={video.guid} className="overflow-hidden group flex flex-col">
                        <div className="aspect-video bg-muted relative group-hover:opacity-90 transition-opacity cursor-pointer" onClick={() => setPreviewVideo(video)}>
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-black/10">
                                <Video className="h-10 w-10 opacity-50" />
                            </div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={getThumbnailUrl(video)}
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                alt={video.title}
                            />

                            {/* Status Badge Overlay */}
                            {showStatus && isImported && (
                                <div className="absolute top-2 right-2 bg-green-500/90 text-white text-xs px-2 py-0.5 rounded font-medium z-10 flex items-center gap-1">
                                    <CheckCircle size={12} /> Imported
                                </div>
                            )}

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="h-8 w-8 text-white drop-shadow-lg" />
                            </div>
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1 rounded">
                                {Math.floor(video.length / 60)}:{String(video.length % 60).padStart(2, '0')}
                            </div>
                        </div>
                        <CardContent className="p-3 flex-1 flex flex-col gap-2">
                            <div className="font-semibold truncate text-sm" title={video.title}>{video.title}</div>
                            <div className="flex justify-between items-center text-xs text-muted-foreground mt-auto">
                                <span>{new Date(video.date).toLocaleDateString()}</span>
                                <span>{video.views} views</span>
                            </div>
                        </CardContent>
                        <CardFooter className="p-3 pt-0 gap-2">
                            {isImported ? (
                                <Button size="sm" variant="secondary" className="w-full opacity-50 cursor-not-allowed" disabled>
                                    <CheckCircle className="h-3 w-3 mr-2" /> Imported
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleImportDraft(video)}
                                    disabled={isImporting}
                                >
                                    {isImporting ? <RefreshCw className="h-3 w-3 animate-spin mr-2" /> : <Download className="h-3 w-3 mr-2" />}
                                    Import Draft
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    );

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
                    <Tabs defaultValue="new" value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="flex justify-between items-center mb-4">
                            <TabsList>
                                <TabsTrigger value="new">New to Import ({videos.length})</TabsTrigger>
                                <TabsTrigger value="all">All Videos ({allBunnyVideos.length})</TabsTrigger>
                            </TabsList>

                            {/* Import All Button - Only visible on New tab and when there are videos */}
                            {activeTab === 'new' && videos.length > 0 && (
                                <Button
                                    onClick={handleImportAll}
                                    disabled={isImporting || loading}
                                    variant="default" // Primary color
                                >
                                    {isImporting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            {importProgress
                                                ? `Importing ${importProgress.current}/${importProgress.total}...`
                                                : 'Importing...'}
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-4 w-4 mr-2" />
                                            Import All ({videos.length})
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>

                        <TabsContent value="new">
                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <Skeleton key={i} className="aspect-video rounded-lg" />
                                    ))}
                                </div>
                            ) : videos.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    No new videos found to import.
                                </div>
                            ) : (
                                <VideoGrid items={videos} />
                            )}
                        </TabsContent>

                        <TabsContent value="all">
                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <Skeleton key={i} className="aspect-video rounded-lg" />
                                    ))}
                                </div>
                            ) : allBunnyVideos.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    No videos found in library.
                                </div>
                            ) : (
                                <VideoGrid items={allBunnyVideos} showStatus={true} />
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
                <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800">
                    <DialogHeader>
                        <DialogTitle>{previewVideo?.title}</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {new Date(previewVideo?.date || '').toLocaleDateString()} • {previewVideo?.views} views
                        </DialogDescription>
                    </DialogHeader>

                    {previewVideo && (
                        <div className="space-y-6">
                            <div className="aspect-video w-full bg-black rounded-lg overflow-hidden border border-zinc-800">
                                <iframe
                                    src={`https://iframe.mediadelivery.net/embed/${process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || '481593'}/${previewVideo.guid}?autoplay=true`}
                                    className="w-full h-full"
                                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                                    allowFullScreen={true}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-medium text-white mb-2">Description</h4>
                                    <p className="text-sm text-zinc-400 min-h-[60px] p-3 bg-zinc-900/50 rounded-md border border-zinc-800/50">
                                        {previewVideo.description || "No description provided."}
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-white mb-2">Metadata</h4>
                                        <div className="space-y-2 text-sm text-zinc-400">
                                            <div className="flex justify-between border-b border-zinc-800 pb-1">
                                                <span>GUID:</span>
                                                <span className="font-mono text-xs">{previewVideo.guid}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-zinc-800 pb-1">
                                                <span>Duration:</span>
                                                <span>{Math.floor(previewVideo.length / 60)}m {previewVideo.length % 60}s</span>
                                            </div>
                                        </div>
                                    </div>
                                    {previewVideo.metaTags && previewVideo.metaTags.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-white mb-2">Tags</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {previewVideo.metaTags.map((tag, i) => (
                                                    <Badge key={i} variant="secondary" className="text-xs">{tag.value}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        {previewVideo && importedGuids.has(previewVideo.guid) ? (
                            <Button disabled variant="secondary">
                                <CheckCircle className="h-4 w-4 mr-2" /> Already Imported
                            </Button>
                        ) : (
                            <Button
                                className="w-full md:w-auto"
                                onClick={() => {
                                    if (previewVideo) handleImportDraft(previewVideo);
                                    setPreviewVideo(null);
                                }}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Import as Draft
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );

}
