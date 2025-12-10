
'use client';

import * as React from 'react';
import type { Video } from '@/lib/types';
import Image from 'next/image';
import { Button } from './ui/button';
import { Info, Play, Plus, Star, Share2, Check } from 'lucide-react';
import Link from 'next/link';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { likeVideo, unlikeVideo, saveShort, unsaveShort } from '@/lib/firestore';
import { VideoPlayer } from './VideoPlayer';

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
        description: `You gave this video ${rate > 1 ? 's' : ''}.`,
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

interface HeroSectionProps {
    video: Video | null;
    isShort?: boolean;
}

export function HeroSection({ video, isShort = false }: HeroSectionProps) {
  const { user: authUser } = useAuth();
  const { userProfile, mutate } = useUser();
  const { toast } = useToast();
  const [hasRated, setHasRated] = React.useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = React.useState(false);

  const isLiked = React.useMemo(() => {
    if (!userProfile || !video) return false;
    if (isShort) {
      return userProfile.savedShortIds?.includes(video.id);
    }
    return userProfile.likedVideoIds?.includes(video.id);
  }, [userProfile, video, isShort]);

  if (!video) {
    return null;
  }
  
  const href = isShort ? `/shorts/${video.id}` : (video.categoryIds && video.categoryIds.length > 0 ? `/browse/${video.categoryIds[0]}` : '#');


  const handleRate = (rating: number) => {
    // In a real app, you would save this to a database
    console.log(`Rated video ${video.id} with ${rating} stars`);
    setHasRated(true);
  };
  
  const handleLikeToggle = async () => {
    if (!authUser || !video) {
      toast({
        variant: "destructive",
        title: "Please sign in",
        description: "You need to be signed in to add items to your list.",
      });
      return;
    }

    try {
      if (isShort) {
        if (isLiked) {
          await unsaveShort(authUser.uid, video.id);
          toast({ title: "Removed from My List", description: video.title });
        } else {
          await saveShort(authUser.uid, video.id);
          toast({ title: "Added to My List!", description: video.title });
        }
      } else {
        if (isLiked) {
          await unlikeVideo(authUser.uid, video.id);
          toast({ title: "Removed from My List", description: video.title });
        } else {
          await likeVideo(authUser.uid, video.id);
          toast({ title: "Added to My List!", description: video.title });
        }
      }
      mutate();
    } catch (error) {
      console.error("Failed to update list status:", error);
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Could not update your list.",
      });
    }
  };


  return (
    <div className="relative w-full h-[56.25vw] max-h-[850px] min-h-[400px]">
      <div className="absolute inset-0">
        <Image
          src={video.thumbnailUrl}
          alt={video.title}
          fill
          className="object-cover"
          priority
          data-ai-hint={video.dataAiHint}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
      
      <div className="relative z-10 flex flex-col justify-center h-full px-4 md:px-16 w-full md:w-3/5 lg:w-1/2 text-white">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold drop-shadow-lg" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800 }}>
          {video.title}
        </h1>
        <p className="mt-4 text-base md:text-lg text-white/90 line-clamp-3 drop-shadow-md">
          {video.description}
        </p>

        <div className="mt-8">
            <div className="flex items-center gap-2">
                <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="h-12 px-6 text-lg bg-white text-black hover:bg-white/90">
                            <Play className="mr-2 h-7 w-7 fill-current" />
                            Play
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="p-0 border-0 max-w-4xl bg-black shadow-2xl">
                        <DialogHeader>
                          <DialogTitle className="sr-only">{video.title}</DialogTitle>
                        </DialogHeader>
                        {isPlayerOpen ? (
                           <VideoPlayer video={video} />
                        ) : (
                           <div className="aspect-video w-full flex items-center justify-center bg-black text-white">Loading player...</div>
                        )}
                    </DialogContent>
                </Dialog>

                 <Button onClick={handleLikeToggle} variant="outline" size="icon" className={cn("h-12 w-12 rounded-full border-white/50 bg-white/10 hover:bg-white/20", isLiked && "bg-primary/20 border-primary/50 text-primary hover:bg-primary/30")}>
                    {isLiked ? <Check className="h-7 w-7" /> : <Plus className="h-7 w-7" />}
                </Button>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className={cn("h-12 w-12 rounded-full border-white/50 bg-white/10 hover:bg-white/20", hasRated && "bg-yellow-400/20 border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/30")}>
                            <Star className={cn("h-6 w-6", hasRated && "fill-yellow-400")} />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto bg-background/80 backdrop-blur-sm border-white/30">
                        <RatingSelector onRate={handleRate} hasRated={hasRated} onRated={() => setHasRated(true)} />
                    </PopoverContent>
                </Popover>
                 <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-white/50 bg-white/10 hover:bg-white/20">
                    <Share2 className="h-6 w-6" />
                </Button>
            </div>
            <div className="w-full h-1 bg-white/20 rounded-full mt-6 overflow-hidden">
                <div className="h-full bg-white" style={{ width: '15%' }}></div>
            </div>
            <p className="text-xs text-white/70 mt-1">0M LEFT</p>
        </div>
      </div>
    </div>
  );
}
