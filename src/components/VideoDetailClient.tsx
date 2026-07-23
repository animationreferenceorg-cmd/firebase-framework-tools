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
import { ArrowLeft, ExternalLink, Instagram } from 'lucide-react';
import Link from 'next/link';

import { DonateDialog } from '@/components/DonateDialog';
import { recordReferenceView } from '@/lib/watch-tracker';

interface VideoDetailClientProps {
    id: string;
    initialData?: Video | null;
}

export function VideoDetailClient({ id, initialData }: VideoDetailClientProps) {
    const [video, setVideo] = useState<Video | null>(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const [showDonateDialog, setShowDonateDialog] = useState(false);
    const [donateForceTimer, setDonateForceTimer] = useState(false);
    const { userProfile } = useUser();

    useEffect(() => {
        if (video) {
            const triggerPopup = recordReferenceView(userProfile?.isPremium);
            if (triggerPopup) {
                setDonateForceTimer(true);
                setShowDonateDialog(true);
            }
        }
    }, [video?.id, userProfile?.isPremium]);

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
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{video.title}</h1>
                            {video.originalUrl && (
                                <a
                                    href={video.originalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 rounded-full text-white shadow-xl hover:shadow-[0_0_20px_rgba(236,72,153,0.6)] transition-all duration-300 group/link animate-bounce hover:animate-none hover:scale-110"
                                    title="View Original Post"
                                >
                                    {video.originalUrl.toLowerCase().includes('instagram.com') ? (
                                        <Instagram className="w-6 h-6" />
                                    ) : (
                                        <ExternalLink className="w-6 h-6" />
                                    )}
                                </a>
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

            <DonateDialog
                open={showDonateDialog}
                forceTimer={donateForceTimer}
                onOpenChange={(val) => {
                    setShowDonateDialog(val);
                    if (!val) setDonateForceTimer(false);
                }}
            />
        </div>
    );
}
