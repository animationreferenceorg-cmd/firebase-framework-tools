'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video } from '@/lib/types';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoActionsBar } from '@/components/VideoActionsBar';
import { useUser } from '@/hooks/use-user';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Instagram, Twitter, Facebook, Globe } from 'lucide-react';
import Link from 'next/link';

interface VideoDetailClientProps {
    id: string;
    initialData?: Video | null;
}

export function VideoDetailClient({ id, initialData }: VideoDetailClientProps) {
    const [video, setVideo] = useState<Video | null>(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const { userProfile } = useUser();

    useEffect(() => {
        const fetchVideo = async () => {
            if (!id || initialData) return;
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
        if (!initialData) {
            fetchVideo();
        }
    }, [id, initialData]);

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

    const getSocialIcon = (url: string) => {
        if (url.includes('instagram.com')) return Instagram;
        if (url.includes('twitter.com') || url.includes('x.com')) return Twitter;
        if (url.includes('facebook.com')) return Facebook;
        return Globe;
    };

    const SocialIcon = video.authorUrl ? getSocialIcon(video.authorUrl) : ExternalLink;

    function SocialAuthorCard({ name, url, avatarUrl }: { name?: string, url: string, avatarUrl?: string }) {
        // Extract handle if name is missing
        const displayHandle = name || (url.split('/').pop() || 'Creator');
        const Icon = getSocialIcon(url);

        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full pr-6 pl-2 py-2 transition-all duration-300 hover:scale-105 hover:border-white/20 active:scale-95 no-underline"
            >
                <div className="relative h-10 w-10 rounded-full overflow-hidden border border-white/10 bg-black/50 shrink-0">
                    {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt={displayHandle} className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center">
                            <Icon className="h-5 w-5 text-white/70" />
                        </div>
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">
                        {displayHandle}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold group-hover:text-zinc-400">
                        Visit Profile
                    </span>
                </div>
                <ExternalLink className="h-3 w-3 text-zinc-500 ml-1 group-hover:text-white transition-colors" />
            </a>
        );
    }

    return (
        <div className="min-h-screen bg-[#030014] text-white">
            <header className="fixed top-0 left-0 p-6 z-50">
                <Link href="/home">
                    <Button variant="ghost" size="icon" className="rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                </Link>
            </header>

            <main className="container mx-auto px-4 pt-24 pb-12">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Main Player */}
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-[0_0_50px_-10px_rgba(124,58,237,0.3)] bg-black border border-white/10">
                        <VideoPlayer video={video} startsPaused={false} muted={false} />
                        <VideoActionsBar video={video} userProfile={userProfile} />
                    </div>

                    {/* Meta Info */}
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{video.title}</h1>
                            {video.authorUrl && (
                                <SocialAuthorCard
                                    name={video.authorName}
                                    url={video.authorUrl}
                                    avatarUrl={video.authorAvatarUrl}
                                />
                            )}
                        </div>
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
