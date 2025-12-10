
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { doc, getDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoRow } from '@/components/VideoRow';
import { Button } from '@/components/ui/button';
import { PlayCircle, PlusCircle, Star, Share2, Check } from 'lucide-react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { saveShort, unsaveShort } from '@/lib/firestore';
import Image from 'next/image';


function RatingSelector({ onRate, hasRated, onRated }: { onRate: (rating: number) => void, hasRated: boolean, onRated: () => void }) {
  const [rating, setRating] = React.useState(0);
  const [hoverRating, setHoverRating] = React.useState(0);
  const { toast } = useToast();

  const handleRate = (rate: number) => {
    setRating(rate);
    onRate(rate);
    onRated();
    toast({
        title: "Rating Submitted!",
        description: `You gave this video ${rate} star${rate > 1 ? 's' : ''}.`,
    })
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => handleRate(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
        >
          <Star
            className={cn(
              "h-6 w-6 transition-colors",
              (hoverRating || rating) >= star
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-400"
            )}
          />
        </button>
      ))}
    </div>
  );
}

function ShortDetailSkeleton() {
    return (
        <main>
            <div className="relative w-full h-[56.25vw] max-h-[850px] min-h-[400px] bg-muted">
                 <Skeleton className="w-full h-full" />
            </div>
            <div className="container mx-auto px-4 md:px-6 py-8">
                <div className="mt-16">
                    <Skeleton className="h-8 w-1/4 mb-4" />
                    <div className="flex space-x-4">
                        <div className="w-1/5 flex-shrink-0">
                            <Skeleton className="w-full aspect-video rounded-lg" />
                        </div>
                        <div className="w-1/5 flex-shrink-0">
                            <Skeleton className="w-full aspect-video rounded-lg" />
                        </div>
                         <div className="w-1/5 flex-shrink-0">
                            <Skeleton className="w-full aspect-video rounded-lg" />
                        </div>
                         <div className="w-1/5 flex-shrink-0">
                            <Skeleton className="w-full aspect-video rounded-lg" />
                        </div>
                         <div className="w-1/5 flex-shrink-0">
                            <Skeleton className="w-full aspect-video rounded-lg" />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

/**
 * This is the client component that handles all the data fetching,
 * state management, and rendering for the short film detail page.
 */
export function ShortFilmDetailClient({ id }: { id: string }) {
  const [video, setVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasRated, setHasRated] = useState(false);
  
  const { user: authUser } = useAuth();
  const { userProfile, mutate } = useUser();
  const { toast } = useToast();

  const isSaved = useMemo(() => {
    return userProfile?.savedShortIds?.includes(id) ?? false;
  }, [userProfile, id]);


  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'videos', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const videoData = { id: docSnap.id, ...docSnap.data() } as Video;
          setVideo(videoData);

          if (videoData.categories && videoData.categories.length > 0) {
              const firstCategory = videoData.categories[0];
              const relatedQuery = query(
                  collection(db, 'videos'), 
                  where('isShort', '==', true),
                  where('categories', 'array-contains', firstCategory),
                  where('__name__', '!=', id),
                  limit(10)
              );
              const relatedSnapshot = await getDocs(relatedQuery);
              const relatedList = relatedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video));
              setRelatedVideos(relatedList);
          }
        } else {
          console.log('No such document!');
        }
      } catch (error) {
        console.error("Error fetching short film:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id]);
  
  const handleRate = (rating: number) => {
    // In a real app, you would save this to a database
    console.log(`Rated video ${video?.id} with ${rating} stars`);
    setHasRated(true);
  };

  const handleSaveToggle = async () => {
    if (!authUser || !video) {
      toast({
        variant: "destructive",
        title: "Please sign in",
        description: "You need to be signed in to save shorts.",
      });
      return;
    }

    try {
      if (isSaved) {
        await unsaveShort(authUser.uid, video.id);
        toast({ title: "Removed from My List" });
      } else {
        await saveShort(authUser.uid, video.id);
        toast({ title: "Added to My List!" });
      }
      mutate();
    } catch (error) {
      console.error("Failed to update saved status:", error);
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Could not update your saved shorts.",
      });
    }
  };


  if (loading) {
    return <ShortDetailSkeleton />;
  }

  if (!video) {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">Short Film not found.</div>
        </div>
    );
  }
  
  return (
    <main className="flex-1 overflow-y-auto bg-black">
      <div className="w-full">
        <div className="relative w-full aspect-video">
            <VideoPlayer video={video} />
        </div>
      </div>
      
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{video.title}</h1>
                <p className="text-muted-foreground">{video.description}</p>
            </div>
            <div className="flex md:flex-col items-start md:items-end gap-4">
                 <div className="flex items-center gap-2">
                    <Button onClick={handleSaveToggle} variant="outline" className={cn(isSaved && "bg-primary/80 border-primary/70 text-primary-foreground hover:bg-primary/90")}>
                        {isSaved ? <Check className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        {isSaved ? 'Saved' : 'Save to List'}
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className={cn(hasRated && "bg-yellow-400/20 border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/30")}>
                                <Star className={cn("h-4 w-4", hasRated && "fill-yellow-400")} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto bg-background/80 backdrop-blur-sm border-white/30">
                            <RatingSelector onRate={handleRate} hasRated={hasRated} onRated={() => setHasRated(true)} />
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="icon">
                        <Share2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
        <div className="mt-16">
            {relatedVideos.length > 0 && (
                <VideoRow title="You Might Also Like" videos={relatedVideos} poster />
            )}
        </div>
      </div>
    </main>
  );
}
