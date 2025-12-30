'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VideoForm from "@/components/admin/VideoForm";
import { Skeleton } from "@/components/ui/skeleton";
import type { Video } from "@/lib/types";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

function EditVideoWrapper() {
    const params = useParams();
    const id = params.id as string;
    const [video, setVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                const docRef = doc(db, 'videos', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setVideo({ id: docSnap.id, ...docSnap.data() } as Video);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Video not found' });
                    router.push('/admin/videos');
                }
            } catch (error) {
                console.error("Error fetching video:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load video' });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchVideo();
        }
    }, [id, router, toast]);

    if (loading) {
        return <Skeleton className="h-[600px] w-full" />;
    }

    if (!video) return null;

    return <VideoForm isShort={!!video.isShort} video={video} />;
}

export default function EditVideoPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
            <EditVideoWrapper />
        </Suspense>
    );
}
