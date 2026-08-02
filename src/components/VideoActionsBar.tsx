'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Share2, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { likeVideo, unlikeVideo } from '@/lib/firestore';
import type { Video, UserProfile } from '@/lib/types';
import { LimitReachedDialog } from '@/components/LimitReachedDialog';
import { DonateDialog } from '@/components/DonateDialog';
import { checkLimit } from '@/lib/limits';
import { SaveToBoardModal } from '@/components/SaveToBoardModal';

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
  const [showSaveBoardModal, setShowSaveBoardModal] = useState(false);

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
        const currentLikes = userProfile?.likedVideoIds?.length || 0;
        const limitCheck = checkLimit(userProfile, 'likes', currentLikes);

        if (!limitCheck.allowed) {
          setShowLimitDialog(true);
          return;
        }

        await likeVideo(authUser.uid, video.id);
        toast({ title: "Added to Liked Videos!" });
      }
      mutate();
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

  const handleSaveToBoard = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSaveBoardModal(true);
  };

  return (
    <>
      <div className="absolute right-4 bottom-28 z-[160] flex flex-col items-center gap-4 pointer-events-auto">
        {/* Like Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLikeToggle}
            className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white backdrop-blur-sm transition-all cursor-pointer"
          >
            <Heart className={cn("h-7 w-7 transition-transform", isLiked && "fill-red-500 text-red-500 scale-110")} />
          </Button>
        </div>

        {/* Save to Moodboard Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSaveToBoard}
            className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white backdrop-blur-sm transition-all cursor-pointer"
          >
            <Bookmark className="h-7 w-7 text-purple-400 fill-purple-400/20 hover:fill-purple-400" />
          </Button>
          <span className="text-white text-xs font-semibold drop-shadow-md">Save</span>
        </div>

        {/* Share Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white backdrop-blur-sm transition-all cursor-pointer"
          >
            <Share2 className="h-7 w-7" />
          </Button>
          <span className="text-white text-xs font-semibold drop-shadow-md">Share</span>
        </div>
      </div>

      <SaveToBoardModal
        open={showSaveBoardModal}
        onOpenChange={setShowSaveBoardModal}
        video={video}
      />

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
