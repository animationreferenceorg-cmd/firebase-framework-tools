
"use client";

import * as React from 'react';
import { useState, useRef, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Heart, Maximize, Share2, PlayCircle, ArrowLeft, ExternalLink, Instagram } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

import { CreatorBadge } from '@/components/CreatorBadge';
import { VideoActionsBar } from '@/components/VideoActionsBar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from './ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { likeVideo, unlikeVideo } from '@/lib/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { checkLimit } from '@/lib/limits';
import { LimitReachedDialog } from '@/components/LimitReachedDialog';
import { DonateDialog } from '@/components/DonateDialog';
import { VideoPlayer } from './VideoPlayer';
import Link from 'next/link';
import type { Video } from '@/lib/types';

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
  const [hasImageError, setHasImageError] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showDonateDialog, setShowDonateDialog] = useState(false);
  const { ref: cardRef, inView: cardInView } = useInView({ threshold: 0, triggerOnce: true });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
const [socialAccessible, setSocialAccessible] = useState(true);

  const displayTitle = video.status === 'draft' ? 'Reference' : video.title;
  const displayDescription = video.status === 'draft' ? '' : video.description;

  const isSocialType = video.type === 'social' || (video.type as string) === 'instagram';
  const isSocialLink = video.originalUrl && (video.originalUrl.includes('instagram.com') || video.originalUrl.includes('tiktok.com'));
  const isCommunityVideo = isSocialType || isSocialLink || !!video.uploader;


  const isLiked = useMemo(() => {
    return userProfile?.likedVideoIds?.includes(video.id) ?? false;
  }, [userProfile, video.id]);

  useEffect(() => {
    if (isHovered && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else if (!isHovered && videoRef.current) {
      videoRef.current.pause();
      try {
        videoRef.current.currentTime = 0;
      } catch {}
    }
  }, [isHovered]);

  const handleMouseEnter = () => {
    if (video.isShort || poster) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    if (video.isShort || poster) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(false);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPlayerOpen(true);
  };

  const handleOpenPlayerChange = (open: boolean) => {
    setIsPlayerOpen(open);
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
        toast({ title: "Removed from Likes", description: displayTitle });
      } else {
        // ENFORCE LIMIT
        const currentLikes = userProfile?.likedVideoIds?.length || 0;
        const limitCheck = checkLimit(userProfile, 'likes', currentLikes);

        if (!limitCheck.allowed) {
          setShowLimitDialog(true);
          return;
        }

        await likeVideo(authUser.uid, video.id);
        toast({ title: "Added to Likes!", description: video.status === 'draft' ? "Reference" : video.title });
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

  const imageUrl = (video.isShort || poster) ? (video.posterUrl || video.thumbnailUrl) : (video.thumbnailUrl || video.posterUrl);
  const aspectRatio = (video.isShort || poster) ? "aspect-[2/3]" : "aspect-[3/4] md:aspect-video";

  // Bypass Next.js image optimizer for external CDNs that block server-side fetches (403)
  const isExternalCdn = imageUrl?.includes('.b-cdn.net') || imageUrl?.includes('cdninstagram.com') || imageUrl?.includes('instagram.com');

  // Source for the lightweight native <video> fallback (only used when a card
  // has no thumbnail image). The grid no longer mounts hls.js players on hover —
  // full playback happens in the click-to-open VideoPlayer dialog instead.
  const videoUrlForPreview = video.videoUrl;

  // Universal: show link badge on ANY video that has an uploader or originalUrl
  const linkUrl = video.originalUrl || (video.uploader ? video.videoUrl : null);

  if (video.isShort || poster) {
    return (
      <Link href={`/shorts/${video.id}`} className="w-full cursor-pointer group/card block">
        <div ref={cardRef} onMouseEnter={() => {
            setIsHovered(true);
            if (videoRef.current) {
              videoRef.current.play().catch(() => {});
            }
          }} onMouseLeave={() => {
            setIsHovered(false);
            if (videoRef.current) {
              videoRef.current.pause();
              videoRef.current.currentTime = 0;
            }
          }}
          className={cn(
            "relative w-full overflow-hidden rounded-[15px] bg-card shadow-lg transform-gpu transition-all duration-300 ease-in-out",
            aspectRatio
          )}
        >
          {!isImageLoaded && <Skeleton className="absolute inset-0" />}
          {imageUrl && !hasImageError ? (
            <>
              <Image loading="lazy"
                src={imageUrl}
                alt={video.title}
                fill
                unoptimized={isExternalCdn}
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  (!isImageLoaded || (isHovered && video.videoUrl && isCommunityVideo)) && "opacity-0"
                )}
                data-ai-hint={video.dataAiHint}
                onLoad={() => setIsImageLoaded(true)}
                onError={() => {
                  setHasImageError(true);
                  setIsImageLoaded(true);
                }}
              />
            </>
          ) : isCommunityVideo && video.videoUrl ? (
            <video
              ref={videoRef}
              src={cardInView ? `${videoUrlForPreview}#t=0.1` : undefined}
              preload="metadata"
              muted
              playsInline
              onLoadedData={() => setIsImageLoaded(true)}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                !isImageLoaded && "opacity-0"
              )}
            />
          ) : (
            <div className={cn(
              "absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-white/5",
              (isHovered && video.videoUrl && isCommunityVideo) && "opacity-0"
            )}>
              <PlayCircle className="h-10 w-10 text-white/40 mb-2" />
              <span className="text-white/70 font-medium px-4 text-center text-sm line-clamp-2 w-full">{displayTitle}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <PlayCircle className="h-12 w-12 text-white/80" />
          </div>
          
          {/* Subtle creator badge — top-left, always visible */}
          <CreatorBadge uploader={video.uploader} originalUrl={video.originalUrl} videoUrl={video.videoUrl} size="sm" />
        </div>
      </Link>
    )
  }

  // --- Dedicated Component for Community/Social Cards ---
  // A video is "social" if it has a social type, a social originalUrl, OR has an uploader (community submitted)


  // Best link to use: prefer originalUrl, fall back to videoUrl (for older imports)
  const communityLinkUrl = video.originalUrl || (video.uploader ? video.videoUrl : null);

  if (isCommunityVideo) {
    return (
      <>
      <Dialog open={isPlayerOpen} onOpenChange={handleOpenPlayerChange}>
        <div ref={cardRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "relative w-full overflow-hidden rounded-[15px] bg-card shadow-lg transform-gpu transition-all duration-300 ease-in-out group/card cursor-pointer",
            isHovered && !isPlayerOpen ? "scale-105 z-[100] shadow-2xl" : "z-0",
            aspectRatio
          )}
        >
          {!isImageLoaded && <Skeleton className="absolute inset-0" />}
          
          {/* Main Social Background / Thumbnail */}
          {imageUrl && !hasImageError ? (
            <>
              <Image loading="lazy"
                src={imageUrl}
                alt={video.title}
                fill
                unoptimized={isExternalCdn}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-500",
                  isHovered && !isPlayerOpen ? "scale-110" : "scale-100",
                  !isImageLoaded && "opacity-0"
                )}
                data-ai-hint={video.dataAiHint}
                onLoad={() => setIsImageLoaded(true)}
                onError={() => {
                  setHasImageError(true);
                  setIsImageLoaded(true);
                }}
              />
            </>
          ) : video.videoUrl ? (
            <video
              ref={videoRef}
              src={cardInView ? `${videoUrlForPreview}#t=0.1` : undefined}
              preload="metadata"
              muted
              playsInline
              onLoadedData={() => setIsImageLoaded(true)}
              className={cn(
                "w-full h-full object-cover transition-transform duration-500",
                isHovered && !isPlayerOpen ? "scale-110" : "scale-100",
                !isImageLoaded && "opacity-0"
              )}
            />
          ) : (
            <div className={cn(
              "absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-white/10 group-hover/card:from-purple-600/40 group-hover/card:to-pink-600/40 transition-colors"
            )}>
              <Share2 className="h-12 w-12 text-white/60 mb-3 group-hover/card:scale-110 transition-transform duration-300" />
            </div>
          )}

          {/* Native video hover preview */}
          {video.videoUrl && (
            <video
              ref={videoRef}
              src={cardInView ? video.videoUrl : undefined}
              preload="metadata"
              muted
              loop
              playsInline
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none z-10",
                isHovered && !isPlayerOpen ? "opacity-100 scale-110" : "opacity-0 scale-100"
              )}
            />
          )}

          {/* Dark Overlay Gradient (always visible on hover to make text readable) */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none transition-opacity duration-300",
            isHovered ? "opacity-100" : "opacity-60"
          )} />

          {/* Bouncing link moved to bottom title bar */}

          {/* Subtle creator badge — top-left, always visible for community videos */}
          <CreatorBadge uploader={video.uploader} originalUrl={video.originalUrl} videoUrl={video.videoUrl} />

          {/* Bottom Actions Bar */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 p-3 transition-all duration-300",
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-white font-bold text-base truncate drop-shadow-md">
                {displayTitle}
              </h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
  <Button
    variant="ghost"
    size="icon"
    className="h-8 w-8 rounded-full bg-white/90 text-black hover:bg-white backdrop-blur-sm"
    onClick={handlePlayClick}
  >
    <PlayCircle className="fill-black h-5 w-5" />
  </Button>
<Button
  variant="ghost"
  size="icon"
  onClick={handleLikeToggle}
  className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
>
  <Heart className={cn("text-white h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
</Button>
              </div>
            </div>
          </div>

          <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none border-0 bg-[#0f0c1d]/95 backdrop-blur-xl overflow-y-auto">
            {/* Back button — top RIGHT so it doesn't cover the top-left social link */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPlayerOpen(false)}
              className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md h-10 w-10 z-[200]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {/* Creator badge — top left of the fullscreen dialog */}
            <div className="absolute top-4 left-4 z-[200]">
              <CreatorBadge
                uploader={video.uploader}
                originalUrl={communityLinkUrl || video.originalUrl}
                videoUrl={video.videoUrl}
              />
            </div>

            <div className="flex flex-col h-full items-center justify-center p-4">
              <div className="w-full max-w-6xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative mb-6">
                 <VideoPlayer video={video} />
              </div>
              <div className="w-full max-w-6xl flex items-center gap-4">
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white">
                  {displayTitle}
                </h1>
                {video.originalUrl && (
                  <span className="text-zinc-400 text-sm">← Click the icon above to view original post</span>
                )}
              </div>
            </div>
          </DialogContent>
        </div>
      </Dialog>

      <LimitReachedDialog
        open={showLimitDialog}
        onOpenChange={setShowLimitDialog}
        feature="likes"
        onDonateClick={() => setShowDonateDialog(true)}
      />

      <DonateDialog
        open={showDonateDialog}
        forceTimer={true}
        onOpenChange={setShowDonateDialog}
      />
      </>
    );
  }

  return (
    <>
    <Dialog open={isPlayerOpen} onOpenChange={handleOpenPlayerChange}>
      <div
        ref={cardRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "relative w-full overflow-hidden rounded-[15px] bg-card shadow-lg transform-gpu transition-all duration-300 ease-in-out group/card cursor-pointer",
          isHovered && !isPlayerOpen && !video.isShort && !poster ? "scale-110 z-[100] shadow-2xl" : "z-0",
          aspectRatio
        )}>
        {!isImageLoaded && <Skeleton className="absolute inset-0" />}
        {imageUrl && !hasImageError ? (
          <Image
            src={imageUrl}
            alt={video.title}
            fill
            unoptimized={isExternalCdn}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              !isImageLoaded && "opacity-0",
              (video.isShort || poster) && isImageLoaded && "opacity-100"
            )}
            data-ai-hint={video.dataAiHint}
            onLoad={() => setIsImageLoaded(true)}
            onError={() => {
              setHasImageError(true);
              setIsImageLoaded(true);
            }}
          />
        ) : (
          <div className={cn(
            "absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-white/5"
          )}>
            <PlayCircle className="h-10 w-10 text-white/40 mb-2" />
            <span className="text-white/70 font-medium px-4 text-center text-sm truncate w-full">{displayTitle}</span>
          </div>
          )}
        
        {/* Native video hover preview for standard cards */}
        {video.videoUrl && !video.isShort && !poster && (
          <video
            ref={videoRef}
            src={cardInView ? video.videoUrl : undefined}
            preload="metadata"
            muted
            loop
            playsInline
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none z-10",
              isHovered && !isPlayerOpen ? "opacity-100 scale-110" : "opacity-0 scale-100"
            )}
          />
        )}

        {/* Subtle creator badge — top-left, always visible for any video with uploader/originalUrl */}
        <CreatorBadge uploader={video.uploader} originalUrl={video.originalUrl} videoUrl={video.videoUrl} />

        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none",
          isHovered ? 'opacity-100' : 'opacity-0',
          'transition-opacity duration-300'
        )} />

        <div className={cn(
          "absolute bottom-0 left-0 right-0 p-3 opacity-0 transition-all duration-300",
          !video.isShort && !poster && "group-hover/card:opacity-100"
        )}>
          <h3 className="text-white font-bold text-base truncate drop-shadow-md mb-2">
            {displayTitle}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="icon" onClick={handlePlayClick} className="h-8 w-8 rounded-full bg-white/90 text-black hover:bg-white backdrop-blur-sm">
                  <PlayCircle className="fill-black h-5 w-5" />
                </Button>
              <Button variant="ghost" size="icon" onClick={handleLikeToggle} className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                <Heart className={cn("text-white h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                <Share2 className="text-white h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handlePlayClick} className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                  <Maximize className="text-white h-4 w-4" />
                </Button>
            </div>
          </div>
        </div>
      </div>
      <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none border-0 bg-[#0f0c1d]/40 backdrop-blur-xl overflow-y-auto">
        <DialogHeader className="hidden">
          <DialogTitle className="sr-only">{displayTitle}</DialogTitle>
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
                  <div className="flex items-center gap-4">
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                      {displayTitle}
                    </h1>
                    {video.originalUrl && (socialAccessible ? (
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
) : (
  <span className="flex items-center justify-center w-12 h-12 bg-gray-600 rounded-full text-white opacity-50" title="Link disabled after free limit reached">
    <ExternalLink className="w-6 h-6" />
  </span>
))}
                  </div>
                  {displayDescription && (
                    <p className="text-zinc-400 text-lg leading-relaxed max-w-3xl">{displayDescription}</p>
                  )}

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

      <LimitReachedDialog
        open={showLimitDialog}
        onOpenChange={setShowLimitDialog}
        feature="likes"
        onDonateClick={() => setShowDonateDialog(true)}
      />

      <DonateDialog
        open={showDonateDialog}
        forceTimer={true}
        onOpenChange={setShowDonateDialog}
      />
    </>
  );
}
