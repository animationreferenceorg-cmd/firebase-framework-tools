'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video } from '@/lib/types';
import { VideoStudyWorkspace } from '@/components/VideoStudyWorkspace';
import { useUser } from '@/hooks/use-user';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface VideoDetailClientProps {
    id: string;
    initialData?: Video | null;
}

import { useWatchTracker } from '@/hooks/use-watch-tracker';

export function VideoDetailClient({ id, initialData }: VideoDetailClientProps) {
    const router = useRouter();
    const [video, setVideo] = useState<Video | null>(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const { userProfile } = useUser();
    const { beginWatch, endWatch } = useWatchTracker();
    const isPro = Boolean(userProfile?.isPremium || userProfile?.role === 'admin' || userProfile?.tier === 'student_unlimited');

    // Opening a video page is deliberate viewing: it counts from the first
    // second, and leaving the page is the natural pause that can surface a
    // queued prompt.
    useEffect(() => {
        if (!video?.id) return;
        const key = `play:detail:${video.id}`;
        beginWatch(key, 'playback');
        return () => endWatch(key);
    }, [video?.id, beginWatch, endWatch]);

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
        <VideoStudyWorkspace
            video={video}
            title={video.title}
            description={video.description}
            isPro={isPro}
            onClose={() => {
                if (window.history.length > 1) router.back();
                else router.push('/home');
            }}
        />
    );
}
