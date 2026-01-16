'use client';

import * as React from 'react';
import type { Video } from '@/lib/types';
import { Play, Pause, Volume2, VolumeX, Heart, Share2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import ReactPlayer from 'react-player/lazy';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { likeVideo, unlikeVideo, saveShort, unsaveShort } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { checkLimit } from '@/lib/limits';
import { LimitReachedDialog } from '@/components/LimitReachedDialog';
import { DonateDialog } from '@/components/DonateDialog';

interface ShortsPlayerProps {
    video: Video;
    onCapture?: (dataUrl: string) => void;
    startsPaused?: boolean;
    muted?: boolean;
}

// Client-side only component to wrap ReactPlayer
function Player({ playerRef, video, ...props }: any) {
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
            controls={false}
            playsinline
            {...props}
            style={{ position: 'absolute', top: 0, left: 0, ...(props.style || {}) }}
        />
    )
}

export const ShortsPlayer = React.forwardRef<any, ShortsPlayerProps>(({ video, startsPaused = false, muted = true }, ref) => {
    const playerRef = React.useRef<ReactPlayer>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const { user: authUser } = useAuth();
    const { userProfile, mutate } = useUser();
    const { toast } = useToast();

    const [isPlaying, setIsPlaying] = React.useState(!startsPaused);
    const [isMuted, setIsMuted] = React.useState(muted);
    const [played, setPlayed] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    const [showUI, setShowUI] = React.useState(false);
    const [showLimitDialog, setShowLimitDialog] = React.useState(false);
    const [showDonateDialog, setShowDonateDialog] = React.useState(false);
    const [isSeeking, setIsSeeking] = React.useState(false);
    const [playbackRate, setPlaybackRate] = React.useState(1);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsPlaying(entry.isIntersecting);
                if (!entry.isIntersecting) {
                    setShowUI(false);
                }
            },
            { threshold: 0.2 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, []);

    const isLiked = React.useMemo(() => {
        if (!userProfile || !video) return false;
        return userProfile.savedShortIds?.includes(video.id);
    }, [userProfile, video]);


    const handleVideoClick = () => {
        if (!showUI) {
            setShowUI(true);
        } else {
            setIsPlaying(prev => !prev);
        }
    };

    const handlePlayPause = () => {
        setIsPlaying(prev => !prev);
    };

    const handleLikeToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!authUser || !video) {
            toast({
                variant: "destructive",
                title: "Please sign in",
                description: "You need to be signed in to save shorts.",
            });
            return;
        }

        try {
            if (isLiked) {
                await unsaveShort(authUser.uid, video.id);
            } else {
                // ENFORCE LIMIT
                const currentSaved = userProfile?.savedShortIds?.length || 0;
                // We use 'likes' limit for saved shorts as they are effectively likes in this context
                const limitCheck = checkLimit(userProfile, 'likes', currentSaved);

                if (!limitCheck.allowed) {
                    setShowLimitDialog(true);
                    return;
                }

                await saveShort(authUser.uid, video.id);
            }
            mutate();
        } catch (error) {
            console.error("Failed to update list status:", error);
        }
    };

    const handleProgress = (state: { played: number, playedSeconds: number }) => {
        if (!isSeeking) {
            setPlayed(state.played);
        }
    }

    const handleSeekChange = (value: number[]) => {
        setPlayed(value[0]);
        if (playerRef.current) {
            playerRef.current.seekTo(value[0]);
        }
    };

    const handleSeekMouseDown = () => setIsSeeking(true);
    const handleSeekMouseUp = () => setIsSeeking(false);

    const handlePlaybackRateChange = (newRate: number) => {
        setPlaybackRate(newRate);
    };

    const speedOptions = [0.5, 1, 1.5, 2];


    // Format time for display (optional, if we want to show it)
    const formatTime = (timeInSeconds: number) => {
        if (isNaN(timeInSeconds)) return "0:00";
        const time = Math.round(timeInSeconds);
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };


    return (
        <div ref={containerRef} className={cn(
            "flex flex-col h-full w-full bg-black transition-all duration-300",
            showUI ? "z-[100]" : "z-0"
        )}>

            {/* 1. Main Video Area */}
            <div
                className="relative flex-1 bg-black overflow-hidden group"
                onClick={handleVideoClick}
            >
                {/* Blurred Background Video */}


                {/* Main Video Content */}
                <div className="absolute inset-0 z-10 flex items-center justify-center p-0 md:p-12 lg:p-24 transition-all duration-300 pointer-events-none">
                    <div className={cn(
                        "relative group/video pointer-events-auto",
                        video.isShort ? "h-full max-w-full aspect-[9/16]" : "w-full max-h-full aspect-video"
                    )}>
                        {/* Glowing Animation */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl blur-xl opacity-50 animate-pulse" />

                        <div className="relative w-full h-full rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl bg-black">
                            <Player
                                playerRef={playerRef}
                                video={video}
                                url={video.videoUrl}
                                playing={isPlaying}
                                volume={1}
                                muted={isMuted}
                                playbackRate={playbackRate}
                                onProgress={handleProgress}
                                onDuration={setDuration}
                                loop
                                config={{
                                    file: {
                                        attributes: {
                                            crossOrigin: 'anonymous',
                                            style: {
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                backgroundColor: 'transparent'
                                            }
                                        }
                                    }
                                }}
                                style={{ backgroundColor: 'transparent', position: 'absolute', top: 0, left: 0 }}
                            />
                        </div>
                    </div>
                </div>

                {/* Overlays */}
                {!isPlaying && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 pointer-events-none">
                        <Play className="w-20 h-20 text-white/80 drop-shadow-xl" />
                    </div>
                )}

                {/* Info Overlay (Top) */}
                <div className={cn(
                    "absolute top-0 left-0 right-0 p-6 z-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none transition-all duration-300",
                    showUI ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
                )}>
                    <h3 className="font-bold text-lg text-white drop-shadow-md mb-1">
                        {video.status === 'draft' ? 'Reference' : video.title}
                    </h3>
                    {video.status !== 'draft' && (
                        <p className="text-sm text-zinc-300 line-clamp-2 drop-shadow-md">{video.description}</p>
                    )}
                </div>

                {/* Side Actions (Like & Share) */}
                <div className="absolute bottom-20 right-4 z-30 flex flex-col gap-4 sm:gap-6 items-center">
                    <div className="flex flex-col items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLikeToggle}
                            className="bg-black/20 backdrop-blur-md hover:bg-black/40 text-white rounded-full h-14 w-14 sm:h-20 sm:w-20 transition-all active:scale-95"
                        >
                            <Heart className={cn("w-7 h-7 sm:w-10 sm:h-10", isLiked ? "fill-red-500 text-red-500" : "")} />
                        </Button>
                        <span className="text-[10px] sm:text-sm font-bold text-white drop-shadow-md">Like</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="bg-black/20 backdrop-blur-md hover:bg-black/40 text-white rounded-full h-14 w-14 sm:h-20 sm:w-20 transition-all active:scale-95"
                        >
                            <Share2 className="w-7 h-7 sm:w-10 sm:h-10" />
                        </Button>
                        <span className="text-[10px] sm:text-sm font-bold text-white drop-shadow-md">Share</span>
                    </div>
                </div>
            </div>

            {/* 2. Controls Area (Totally Separate) */}
            <div className={cn(
                "shrink-0 bg-black border-t border-white/10 px-4 py-4 z-30 pb-safe w-full transition-all duration-300",
                showUI ? "opacity-100 translate-y-0 h-auto" : "opacity-0 translate-y-full h-0 py-0 border-0 overflow-hidden"
            )}>
                <div className="flex flex-col gap-2 w-full">

                    {/* Speed Control (Above Timeline) - Centered & Large */}
                    <div className="flex justify-center w-full px-1 mb-2">
                        <div className="flex items-center gap-3 sm:gap-4 bg-zinc-900/80 backdrop-blur-sm rounded-full px-4 sm:px-6 py-1.5 sm:py-2 border border-zinc-700 shadow-lg max-w-[95%] sm:max-w-none">
                            <span className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">Speed</span>
                            <Slider
                                value={[playbackRate]}
                                onValueChange={(val) => handlePlaybackRateChange(val[0])}
                                min={0.5}
                                max={2}
                                step={0.1}
                                className="w-[120px] sm:w-[200px]"
                                trackClassName="h-1.5 sm:h-2 bg-zinc-700"
                                rangeClassName="bg-primary"
                                thumbClassName="h-3.5 w-3.5 sm:h-4 sm:w-4 bg-white hover:scale-125 transition-transform"
                            />
                            <span className="text-[10px] sm:text-xs font-mono text-white font-bold w-6 sm:w-8 text-right">{playbackRate}x</span>
                        </div>
                    </div>

                    {/* Scrubber */}
                    <div className="flex items-center gap-3 w-full">
                        <span className="text-[10px] text-zinc-500 font-mono w-[35px]">{formatTime(played * duration)}</span>
                        <Slider
                            value={[played]}
                            onValueChange={handleSeekChange}
                            onPointerDown={handleSeekMouseDown}
                            onPointerUp={handleSeekMouseUp}
                            max={1}
                            step={0.001}
                            className="flex-1 cursor-pointer"
                            trackClassName="h-1.5 bg-zinc-800"
                            rangeClassName="bg-white"
                            thumbClassName="h-4 w-4 bg-white hover:scale-110 transition-transform"
                        />
                        <span className="text-[10px] text-zinc-500 font-mono w-[35px] text-right">{formatTime(duration)}</span>
                    </div>

                    {/* Control Actions Row */}
                    <div className="relative flex items-center justify-center w-full">
                        {/* Play/Pause (Absolute Center) */}
                        <Button
                            variant="secondary"
                            size="icon"
                            onClick={handlePlayPause}
                            className="h-12 w-12 rounded-full bg-white text-black hover:bg-zinc-200 transition-transform active:scale-95 z-10"
                        >
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                        </Button>

                        {/* Right: Volume (Absolute Right) */}
                        <div className="absolute right-0 flex items-center gap-3">

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                                className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full h-10 w-10"
                            >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </Button>
                        </div>
                    </div>
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
        </div >
    );
});

ShortsPlayer.displayName = 'ShortsPlayer';
