
"use client";

import * as React from 'react';
import { useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import { Heart, Maximize, Share2, PlayCircle, ArrowLeft } from 'lucide-react';
import { VideoActionsBar } from '@/components/VideoActionsBar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from './ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { likeVideo, unlikeVideo } from '@/lib/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { VideoPlayer } from './VideoPlayer';
import Link from 'next/link';
import ReactPlayer from 'react-player/lazy';
import type { Video } from '@/lib/types';


function Player({ playerRef, ...props }: any) {
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <div className="w-full h-full bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <ReactPlayer
      ref={playerRef}
      width="100%"
      height="100%"
      style={{ position: 'absolute', top: 0, left: 0 }}
      {...props}
    />
  )
}

interface VideoCardProps {
  video: Video;
  poster?: boolean;
}

export function VideoCard({ video, poster }: VideoCardProps) {
  const { user: authUser } = useAuth();
  const { userProfile, mutate } = useUser();
  const { toast } = useToast();

  const [isHovered, setIsHovered] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isLiked = useMemo(() => {
    return userProfile?.likedVideoIds?.includes(video.id) ?? false;
  }, [userProfile, video.id]);

  const handleMouseEnter = () => {
    if (video.isShort || poster) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (video.isShort || poster) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(false);
  };

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
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
        toast({ title: "Removed from Likes", description: video.title });
      } else {
        await likeVideo(authUser.uid, video.id);
        toast({ title: "Added to Likes!", description: video.title });
      }
      mutate();
    } catch (error) {
      console.error("Failed to update like status:", error);
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Could not update your liked videos.",
      });
    }
  }

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied!",
      description: "You can now share this page.",
    });
  };

  const imageUrl = (video.isShort || poster) ? video.posterUrl : video.thumbnailUrl;
  const aspectRatio = (video.isShort || poster) ? "aspect-[2/3]" : "aspect-[3/4] md:aspect-video";

  const videoUrlForPreview = video.videoUrl;

  if (video.isShort || poster) {
    return (
      <Link href={`/shorts/${video.id}`} className="w-full cursor-pointer group/card block">
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-[15px] bg-card shadow-lg transform-gpu transition-all duration-300 ease-in-out",
            aspectRatio
          )}
        >
          {!isImageLoaded && <Skeleton className="absolute inset-0" />}
          <Image
            src={imageUrl}
            alt={video.title}
            fill
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              !isImageLoaded && "opacity-0",
            )}
            data-ai-hint={video.dataAiHint}
            onLoad={() => setIsImageLoaded(true)}
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
            <PlayCircle className="h-12 w-12 text-white/80" />
          </div>
        </div>
      </Link>
    )
  }

  if (video.type === 'social' || (video.type as string) === 'instagram') {
    return (
      <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-[15px] bg-card shadow-lg transform-gpu transition-all duration-300 ease-in-out group/card cursor-pointer",
            aspectRatio
          )}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-600/20 to-pink-600/20">
            <Share2 className="h-12 w-12 text-white/80 mb-2" />
            <span className="text-white font-medium px-4 text-center truncate w-full">{video.title}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover/card:opacity-100 transition-all duration-300 bg-black/60 backdrop-blur-sm">
            <div className="flex items-center justify-end">
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/90 text-black hover:bg-white backdrop-blur-sm">
                  <Maximize className="h-4 w-4" />
                </Button>
              </DialogTrigger>
            </div>
          </div>

          <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none border-0 bg-[#0f0c1d]/95 backdrop-blur-xl overflow-y-auto">
            <div className="flex flex-col h-full items-center justify-center p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPlayerOpen(false)}
                className="absolute top-4 left-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md h-10 w-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="w-full max-w-md bg-white rounded-xl overflow-hidden shadow-2xl">
                <VideoPlayer video={video} />
              </div>
            </div>
          </DialogContent>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "relative w-full overflow-hidden rounded-[15px] bg-card shadow-lg transform-gpu transition-all duration-300 ease-in-out group/card cursor-pointer",
          isHovered && !video.isShort && !poster ? "scale-110 z-10 shadow-2xl" : "",
          aspectRatio
        )}>
        {!isImageLoaded && <Skeleton className="absolute inset-0" />}
        <Image
          src={imageUrl}
          alt={video.title}
          fill
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            (isHovered && !video.isShort && !poster || !isImageLoaded) && "opacity-0",
            (video.isShort || poster) && isImageLoaded && "opacity-100"
          )}
          data-ai-hint={video.dataAiHint}
          onLoad={() => setIsImageLoaded(true)}
        />
        {!video.isShort && !poster && video.videoUrl && isHovered && (
          <div className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            <Player
              url={videoUrlForPreview}
              playing={isHovered}
              loop={true}
              muted={true}
              playsinline={true}
              controls={false}
            />
          </div>
        )}

        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none",
          isHovered ? 'opacity-100' : 'opacity-0',
          'transition-opacity duration-300'
        )} />

        <div className={cn(
          "absolute bottom-0 left-0 right-0 p-3 opacity-0 transition-all duration-300",
          !video.isShort && !poster && "group-hover/card:opacity-100"
        )}>
          <h3 className="text-white font-bold text-base truncate mb-2 drop-shadow-md">{video.title}</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/90 text-black hover:bg-white backdrop-blur-sm">
                  <PlayCircle className="fill-black h-5 w-5" />
                </Button>
              </DialogTrigger>
              <Button variant="ghost" size="icon" onClick={handleLikeToggle} className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                <Heart className={cn("text-white h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                <Share2 className="text-white h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                  <Maximize className="text-white h-4 w-4" />
                </Button>
              </DialogTrigger>
            </div>
          </div>
        </div>
      </div>
      <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none border-0 bg-[#0f0c1d]/40 backdrop-blur-xl overflow-y-auto">
        <DialogHeader className="hidden">
          <DialogTitle className="sr-only">{video.title}</DialogTitle>
        </DialogHeader>

        {isPlayerOpen ? (
          <div className="min-h-screen w-full relative">
            {/* Content Container - Centered like VideoPage */}
            <main className="container mx-auto px-4 pt-10 pb-12">
              <div className="max-w-6xl mx-auto space-y-6">
                {/* Back Button */}
                <div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPlayerOpen(false)}
                    className="rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md h-10 w-10 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </div>

                {/* Main Player Container */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-[0_0_50px_-10px_rgba(124,58,237,0.3)] bg-black border border-white/10">
                  <VideoPlayer video={video} muted={false} />
                  <VideoActionsBar video={video} userProfile={userProfile} />
                </div>

                {/* Meta Info */}
                <div className="space-y-4 text-white">
                  <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{video.title}</h1>
                  <p className="text-zinc-400 text-lg leading-relaxed max-w-3xl">{video.description}</p>

                  {/* Tags */}
                  {video.tags && video.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {video.tags.map((tag: string) => (
                        <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-zinc-300">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </main>
          </div>
        ) : (
          <div className="h-screen w-full flex items-center justify-center bg-black text-white">Loading player...</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
