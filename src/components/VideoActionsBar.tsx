
'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { likeVideo, unlikeVideo } from '@/lib/firestore';
import type { Video, UserProfile } from '@/lib/types';

interface VideoActionsBarProps {
  video: Video;
  userProfile: UserProfile | null;
}

export function VideoActionsBar({ video, userProfile }: VideoActionsBarProps) {
  const { user: authUser } = useAuth();
  const { mutate } = useUser();
  const { toast } = useToast();

  const isLiked = useMemo(() => {
    return userProfile?.likedVideoIds?.includes(video.id) ?? false;
  }, [userProfile, video.id]);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!authUser) {
      toast({
        variant: "destructive",
        title: "Please sign in",
        description: "You need to be signed in to like videos.",
      });
      return;
    }
    try {
      if (isLiked) {
        await unlikeVideo(authUser.uid, video.id);
        toast({ title: "Removed from Liked Videos" });
      } else {
        await likeVideo(authUser.uid, video.id);
        toast({ title: "Added to Liked Videos!" });
      }
      mutate(); // Re-fetch user profile to update like status
    } catch (error) {
      console.error("Failed to update like status:", error);
      toast({ variant: "destructive", title: "Something went wrong" });
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/video/${video.id}`);
    toast({ title: "Link Copied!", description: "Video link copied to clipboard." });
  };
  

  return (
    <div className="absolute right-4 bottom-28 z-10 flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <Button variant="ghost" size="icon" onClick={handleLikeToggle} className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white">
          <Heart className={cn("h-7 w-7", isLiked && "fill-red-500 text-red-500")} />
        </Button>
        <span className="text-white text-xs font-semibold drop-shadow-md">{userProfile?.likedVideoIds?.length || 0}</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Button variant="ghost" size="icon" onClick={handleShare} className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white">
          <Share2 className="h-7 w-7" />
        </Button>
         <span className="text-white text-xs font-semibold drop-shadow-md">Share</span>
      </div>
    </div>
  );
}
