'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { likeVideo, unlikeVideo } from '@/lib/firestore';
import type { Video, UserProfile } from '@/lib/types';
import { LimitReachedDialog } from '@/components/LimitReachedDialog';
import { DonateDialog } from '@/components/DonateDialog';
import { checkLimit } from '@/lib/limits';

interface VideoActionsBarProps {
  video: Video;
  userProfile: UserProfile | null;
}

export function VideoActionsBar({ video, userProfile }: VideoActionsBarProps) {
  const { user: authUser } = useAuth();
  const { mutate } = useUser();
  const { toast } = useToast();

  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showDonateDialog, setShowDonateDialog] = useState(false);

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
        // ENFORCE LIMIT: Check against user tier
        const currentLikes = userProfile?.likedVideoIds?.length || 0;
        const limitCheck = checkLimit(userProfile, 'likes', currentLikes);

        if (!limitCheck.allowed) {
          setShowLimitDialog(true);
          return;
        }

        await likeVideo(authUser.uid, video.id);
        toast({ title: "Added to Liked Videos!" });
      }
      mutate(); // Re-fetch user profile to update like status
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update like status.",
      });
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/video/${video.id}`);
    toast({ title: "Link Copied!", description: "Video link copied to clipboard." });
  };

  return (
    <>
      <div className="absolute right-4 bottom-28 z-10 flex flex-col items-center gap-4">
        {/* Like Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLikeToggle}
            className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white backdrop-blur-sm transition-all"
          >
            <Heart className={cn("h-7 w-7 transition-transform", isLiked && "fill-red-500 text-red-500 scale-110")} />
          </Button>
          {/* We don't display like count here per previous design, usually just share label or similar. 
              But checking the messed up file, it had {userProfile?.likedVideoIds?.length || 0} 
              Wait, that count is total user likes? Or video likes? 
              The previous code had userProfile.likedVideoIds.length which is User's total likes.
              That seems odd to display next to a video like button (usually it's video's total likes).
              However, if the user had it, I'll keep it? 
              Actually, the messed up code showed: <span ...>{userProfile?.likedVideoIds?.length || 0}</span>
              I will assume that was 'Total Liked Videos' count the user has? 
              Let's keep it if it was there.
          */}
          {/* <span className="text-white text-xs font-semibold drop-shadow-md">{userProfile?.likedVideoIds?.length || 0}</span> */}
        </div>

        {/* Share Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white backdrop-blur-sm transition-all"
          >
            <Share2 className="h-7 w-7" />
          </Button>
          <span className="text-white text-xs font-semibold drop-shadow-md">Share</span>
        </div>
      </div>

      <LimitReachedDialog
        open={showLimitDialog}
        onOpenChange={setShowLimitDialog}
        feature="likes"
        onDonateClick={() => setShowDonateDialog(true)}
      />

      <DonateDialog
        open={showDonateDialog}
        onOpenChange={setShowDonateDialog}
      />
    </>
  );
}
