
'use client';

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Video } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import VideoForm from "@/components/admin/VideoForm";

export default function EditShortPage() {
  const { id } = useParams();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) {
        setError("No ID provided");
        setLoading(false);
        return;
    };
    
    const fetchVideo = async () => {
        if (!db) return;
        try {
            const docRef = doc(db, 'videos', id as string);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Handle the 'categories' to 'categoryIds' mapping for shorts
                const videoData = { 
                  id: docSnap.id, 
                  ...data,
                  categoryIds: data.categories || [] // map categories to categoryIds
                } as Video;
                setVideo(videoData);
            } else {
                setError("Short film not found.");
                toast({ variant: 'destructive', title: 'Error', description: 'Could not find the requested short film.'});
            }
        } catch (e) {
            console.error(e);
            setError("Failed to fetch short film data.");
            toast({ variant: 'destructive', title: 'Error', description: 'There was a problem fetching the data from the database.'});
        } finally {
            setLoading(false);
        }
    }
    fetchVideo();
  }, [id, toast]);

  if (loading) {
    return (
        <div className="p-8 space-y-8">
            <Skeleton className="h-12 w-1/4" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <Skeleton className="w-full aspect-video rounded-lg" />
                    <Skeleton className="h-40 w-full rounded-lg" />
                    <Skeleton className="h-40 w-full rounded-lg" />
                    <Skeleton className="h-40 w-full rounded-lg" />
                </div>
                <div className="lg:col-span-1 space-y-8">
                    <Skeleton className="w-full aspect-[2/3] rounded-lg" />
                </div>
            </div>
        </div>
    )
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">{error}</div>;
  }
  
  if (!video) {
    return <div className="p-8 text-center">No short film data available.</div>;
  }

  return <VideoForm video={video} isShort={true} />;
}
