'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video } from '@/lib/types';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoActionsBar } from '@/components/VideoActionsBar';
import { useUser } from '@/hooks/use-user';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { BrowseHero } from '@/components/BrowseHero';

export default function VideoPage() {
    const params = useParams();
    const id = params.id as string;
    const [video, setVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const { userProfile } = useUser();

    useEffect(() => {
        const fetchVideo = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "videos", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setVideo({ id: docSnap.id, ...docSnap.data() } as Video);
                } else {
                    console.error("No such video!");
                }
            } catch (error) {
                console.error("Error fetching video:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchVideo();
    }, [id]);

    if (loading) {
        return (
            <div className="h-screen w-full bg-black flex items-center justify-center">
                <Skeleton className="w-full max-w-6xl aspect-video rounded-xl bg-zinc-800" />
            </div>
        );
    }

    if (!video) {
        return (
            <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-white space-y-4">
                <h1 className="text-2xl font-bold text-red-500">Video Not Found</h1>
                <Link href="/browse">
                    <Button variant="outline">Back to Browse</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#030014] text-white">
            <header className="fixed top-0 left-0 p-6 z-50">
                <Link href="/browse">
                    <Button variant="ghost" size="icon" className="rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                </Link>
            </header>

            <main className="container mx-auto px-4 pt-24 pb-12">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Main Player */}
                    {/* Main Player */}
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-[0_0_50px_-10px_rgba(124,58,237,0.3)] bg-black border border-white/10">
                        <VideoPlayer video={video} startsPaused={false} muted={false} />
                        <VideoActionsBar video={video} userProfile={userProfile} />
                    </div>

                    {/* Meta Info */}
                    <div className="space-y-4">
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{video.title}</h1>
                        <p className="text-zinc-400 text-lg leading-relaxed max-w-3xl">{video.description}</p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            {video.tags?.map(tag => (
                                <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-zinc-300">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
