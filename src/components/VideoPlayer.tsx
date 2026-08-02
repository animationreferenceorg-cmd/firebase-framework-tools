'use client';


import * as React from 'react';
import type { Video } from '@/lib/types';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Rewind, FastForward, Camera, ExternalLink, Instagram, Film, Share2, Heart, Bookmark } from 'lucide-react';
import { CreatorBadge } from '@/components/CreatorBadge';
import { SaveToBoardModal } from '@/components/SaveToBoardModal';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import ReactPlayer from 'react-player/lazy';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { likeVideo, unlikeVideo } from '@/lib/firestore';

interface VideoPlayerProps {
    video: Video;
    onCapture?: (dataUrl: string) => void;
    showCaptureButton?: boolean;
    startsPaused?: boolean;
    muted?: boolean;
    hideFullscreenControl?: boolean;
    hidePlayControl?: boolean;
    onEnded?: () => void;
    autoPlay?: boolean;
    loop?: boolean;
    alwaysShowControls?: boolean;
    onToggleTimeline?: () => void;
    isTimelineVisible?: boolean;
}

// Client-side only component to wrap ReactPlayer
function Player({ playerRef, video, ...props }: any) {
    const [hasMounted, setHasMounted] = React.useState(false);

    React.useEffect(() => {
        setHasMounted(true);
    }, []);

    if (!hasMounted) {
        return <div className="w-full h-full bg-black flex items-center justify-center text-white">Loading Player...</div>;
    }

    return (
        <ReactPlayer
            ref={playerRef}
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
            controls={false} // We are using our own controls
            {...props}
        />
    )
}


export const VideoPlayer = React.forwardRef<any, VideoPlayerProps>(({ video, onCapture, showCaptureButton = false, startsPaused = false, muted = true, hideFullscreenControl = false, hidePlayControl = false, onEnded, autoPlay, loop = false, alwaysShowControls = true, onToggleTimeline, isTimelineVisible = true }, ref) => {
    const playerRef = React.useRef<ReactPlayer>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const { userProfile, mutate } = useUser();
    const [showSaveBoardModal, setShowSaveBoardModal] = React.useState(false);

    const isLiked = React.useMemo(() => {
        return userProfile?.likedVideoIds?.includes(video.id) ?? false;
    }, [userProfile, video.id]);

    const handleLikeToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!authUser) {
            toast({ variant: "destructive", title: "Please sign in to like videos" });
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
            mutate();
        } catch (err) {
            console.error("Failed to update like status", err);
        }
    };

    const [isPlaying, setIsPlaying] = React.useState(autoPlay ?? !startsPaused);
    
    React.useEffect(() => {
        if (autoPlay !== undefined) {
            setIsPlaying(autoPlay);
        }
    }, [autoPlay, video.videoUrl]);
    const [isMuted, setIsMuted] = React.useState(muted);
    const [volume, setVolume] = React.useState(1);
    const [played, setPlayed] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    const [isSeeking, setIsSeeking] = React.useState(false);
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [showControls, setShowControls] = React.useState(true);
    const [playbackRate, setPlaybackRate] = React.useState(1);
    const [videoError, setVideoError] = React.useState(false);
    const [fps, setFps] = React.useState<number>(video.fps || 24);
    const controlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        setFps(video.fps || 24);
    }, [video.fps]);

    const stepFrame = React.useCallback((direction: 'forward' | 'backward') => {
        if (!playerRef.current) return;
        if (isPlaying) {
            setIsPlaying(false);
        }
        const frameTime = 1 / fps;
        const internalPlayer = playerRef.current.getInternalPlayer();
        if (internalPlayer && typeof (internalPlayer as HTMLVideoElement).currentTime === 'number') {
            const newTime = direction === 'forward'
                ? Math.min(duration, (internalPlayer as HTMLVideoElement).currentTime + frameTime)
                : Math.max(0, (internalPlayer as HTMLVideoElement).currentTime - frameTime);
            playerRef.current.seekTo(newTime, 'seconds');
        }
    }, [duration, isPlaying, fps]);

    const handleFullscreenToggle = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const [clickFeedback, setClickFeedback] = React.useState<'play' | 'pause' | null>(null);
    const clickFeedbackTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    const handlePlayPause = React.useCallback(() => {
        setIsPlaying(prev => {
            const nextState = !prev;
            setClickFeedback(nextState ? 'play' : 'pause');
            if (clickFeedbackTimerRef.current) {
                clearTimeout(clickFeedbackTimerRef.current);
            }
            clickFeedbackTimerRef.current = setTimeout(() => {
                setClickFeedback(null);
            }, 600);

            if (nextState) {
                setIsMuted(false);
            }
            return nextState;
        });
    }, []);

    React.useImperativeHandle(ref, () => ({
        handlePlayPause,
    }));

    React.useEffect(() => {
        const onFullScreenChange = () => {
            const isCurrentlyFullScreen = !!document.fullscreenElement;
            setIsFullScreen(isCurrentlyFullScreen);
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.key === ',') {
                e.preventDefault();
                stepFrame('backward');
            } else if (e.key === '.') {
                e.preventDefault();
                stepFrame('forward');
            } else if (e.key === ' ') {
                e.preventDefault();
                handlePlayPause();
            }
        };

        document.addEventListener('fullscreenchange', onFullScreenChange);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('fullscreenchange', onFullScreenChange);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [duration, isPlaying, stepFrame, handlePlayPause]);


    const handleMuteToggle = () => {
        setIsMuted(!isMuted);
    };

    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0];
        setVolume(newVolume);
        if (newVolume > 0 && isMuted) {
            setIsMuted(false);
        } else if (newVolume === 0 && !isMuted) {
            setIsMuted(true);
        }
    };

    const handleProgress = (state: { played: number, playedSeconds: number }) => {
        if (!isSeeking) {
            setPlayed(state.played);
        }
    }

    const handleSeekMouseDown = () => {
        setIsSeeking(true);
    };

    const handleSeekChange = (value: number[]) => {
        setPlayed(value[0]);
        if (playerRef.current) {
            playerRef.current.seekTo(value[0]);
        }
    };

    const handleSeekMouseUp = () => {
        setIsSeeking(false);
    };

    const handlePlaybackRateChange = (value: number[]) => {
        const newRate = value[0];
        setPlaybackRate(newRate);
    };


    const handleCaptureFrame = () => {
        if (!playerRef.current || !onCapture) return;

        const internalPlayer = playerRef.current.getInternalPlayer();
        if (internalPlayer instanceof HTMLVideoElement) {
            const videoElement = internalPlayer;
            videoElement.crossOrigin = "anonymous";
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                onCapture(dataUrl);
                toast({
                    title: "Frame Captured!",
                    description: "The thumbnail has been updated with the current frame."
                })
            }
        } else {
            toast({
                variant: "destructive",
                title: "Capture Not Supported",
                description: "Frame capture is only available for direct video files, not embeds from YouTube, Vimeo, etc."
            });
        }
    };

    const formatTime = (timeInSeconds: number) => {
        if (isNaN(timeInSeconds)) return "0:00";
        const time = Math.round(timeInSeconds);
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const [isNearBottom, setIsNearBottom] = React.useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const mouseY = e.clientY - rect.top;
            const containerHeight = rect.height;
            // Check if mouse cursor is within bottom 32% of video player container
            const nearBottom = mouseY > containerHeight * 0.68;
            setIsNearBottom(nearBottom);
        }
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, isFullScreen ? 10000 : 5000);
    };

    const currentTime = played * duration;


    return (
        <div
            ref={containerRef}
            className={cn(
                "group/player relative w-full h-full flex items-center justify-center overflow-hidden bg-black select-none transition-all duration-300",
                isFullScreen ? "rounded-none" : "rounded-lg"
            )}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
                setIsNearBottom(false);
                if (isPlaying) setShowControls(false);
            }}
            onClick={(e) => {
                // Ignore clicks on actual buttons, sliders, or select inputs
                if (
                    (e.target as HTMLElement).closest('button') || 
                    (e.target as HTMLElement).closest('[role="slider"]') ||
                    (e.target as HTMLElement).closest('select')
                ) {
                    return;
                }
                handlePlayPause();
            }}
        >
            <div className="relative w-full aspect-video max-w-full max-h-full">
                <Player
                    playerRef={playerRef}
                    url={video.videoUrl}
                    video={video}
                    playing={isPlaying}
                    volume={volume}
                    muted={isMuted}
                    playbackRate={playbackRate}
                    onProgress={handleProgress}
                    onDuration={setDuration}
                    onPlay={() => { setIsPlaying(true); setVideoError(false); }}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => {
                        setIsPlaying(false);
                        if (onEnded) onEnded();
                    }}
                    onError={(e: any) => {
                        // HLS/CORS errors are expected for Instagram/TikTok CDN links
                        const isSocialUrl = video.originalUrl && (
                            video.originalUrl.includes('instagram.com') ||
                            video.originalUrl.includes('tiktok.com')
                        );
                        if (isSocialUrl) {
                            setVideoError(true); // Show friendly fallback
                        } else {
                            console.warn("Video Player Error:", e);
                        }
                    }}
                    loop={loop}
                    config={{
                        file: {
                            attributes: showCaptureButton ? {
                                crossOrigin: 'anonymous'
                            } : {}
                        }
                    }}
                />

                {/* Fallback overlay when social video can't be played due to CORS */}
                {videoError && video.originalUrl && (
                    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm rounded-lg gap-4 p-6 text-center">
                        <div className="w-16 h-16 bg-gradient-to-tr from-pink-500 to-purple-500 rounded-full flex items-center justify-center shadow-xl animate-bounce">
                            {video.originalUrl.toLowerCase().includes('instagram.com') ? (
                                <Instagram className="w-8 h-8 text-white" />
                            ) : (
                                <ExternalLink className="w-8 h-8 text-white" />
                            )}
                        </div>
                        <div>
                            <p className="text-white font-bold text-lg mb-1">View on Original Platform</p>
                            <p className="text-zinc-400 text-sm mb-4">This video can only be played on the original platform.</p>
                            <a
                                href={video.originalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white font-semibold px-6 py-2.5 rounded-full transition-all hover:scale-105 shadow-lg"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Open Original Post
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Dark Overlay for Controls Visibility */}
            <div
                className={cn(
                    "absolute inset-0 bg-black/40 transition-opacity duration-300 pointer-events-none",
                    showControls ? "opacity-100" : "opacity-0"
                )}
            />

            {/* Top Title Bar - Only show if NO creator info, to avoid overlap */}
            {(!video.uploader || !video.originalUrl) && (
                <div
                    className={cn(
                        "absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent text-white z-20 transition-opacity duration-300 pointer-events-none",
                        showControls ? "opacity-100" : "opacity-0"
                    )}
                >
                    <h2 className="text-lg font-bold truncate drop-shadow-lg">{video.status === 'draft' ? 'Reference' : video.title}</h2>
                </div>
            )}

            {/* Subtle creator badge — top-left, shown when controls are visible */}
            {video.originalUrl || video.uploader ? (
                <div className={cn(
                    "absolute top-3 left-3 z-50 transition-all duration-300",
                    showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                )}>
                    <CreatorBadge
                        uploader={video.uploader}
                        originalUrl={video.originalUrl}
                        videoUrl={video.videoUrl}
                    />
                </div>
            ) : null}

            {/* Quick Click Flash Play/Pause Animation (YouTube/Netflix Style) */}
            {clickFeedback && (
                <div className="absolute inset-0 flex items-center justify-center z-[140] pointer-events-none transition-all duration-200">
                    <div className="bg-black/70 backdrop-blur-md rounded-full p-5 text-white shadow-2xl border border-white/20 animate-in fade-in zoom-in-75 duration-200">
                        {clickFeedback === 'play' ? (
                            <Play className="w-10 h-10 md:w-14 md:h-14 fill-white ml-1 text-white" />
                        ) : (
                            <Pause className="w-10 h-10 md:w-14 md:h-14 fill-white text-white" />
                        )}
                    </div>
                </div>
            )}

            {/* Bottom Controls Container - Reveals on hover or tap */}
            <div
                className={cn(
                    "absolute bottom-0 left-0 right-0 z-[150] bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-8 md:pt-10 pb-3 md:pb-4 px-3 md:px-6 transition-all duration-300 ease-in-out",
                    isSeeking || isNearBottom || showControls ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-4 opacity-0 pointer-events-none"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Progress Bar (Thin & Full Width) */}
                <div className="flex items-center gap-3 mb-4 group/timeline z-[120] relative">
                    <p className="text-xs font-mono font-bold text-white w-12 text-right">{formatTime(currentTime)}</p>
                    <Slider
                        value={[played]}
                        onValueChange={handleSeekChange}
                        onPointerDown={handleSeekMouseDown}
                        onPointerUp={handleSeekMouseUp}
                        max={1}
                        step={0.001}
                        className="w-full py-2 cursor-pointer"
                        trackClassName="bg-white/20 h-2 rounded-full cursor-pointer hover:h-2.5 transition-all"
                        rangeClassName="bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.8)] rounded-full"
                        thumbClassName="w-0 h-0 opacity-0 pointer-events-none"
                    />
                    <p className="text-xs font-mono font-bold text-white w-12">{formatTime(duration)}</p>
                </div>

                {/* Bottom Row: Time | Speed | Actions (Like, Save, Share, Fullscreen) */}
                <div className="flex items-center justify-between gap-1.5 sm:gap-3 relative">

                    {/* Left: Play/Pause, Frame Steppers & Time */}
                    <div className="flex items-center gap-1.5 md:gap-3">
                        <Button
                            type="button"
                            onClick={handlePlayPause}
                            variant="ghost"
                            size="icon"
                            className="hover:bg-white/20 text-white rounded-full h-8 w-8 shrink-0 bg-white/10"
                            title={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white ml-0.5" />}
                        </Button>

                        {/* Step Frame buttons for mobile & desktop */}
                        <div className="flex items-center gap-0.5 bg-white/10 rounded-full px-1.5 py-0.5 border border-white/10">
                            <button
                                type="button"
                                onClick={() => stepFrame('backward')}
                                className="text-[10px] font-mono text-zinc-200 hover:text-white px-1 py-0.5 rounded hover:bg-white/10 cursor-pointer"
                                title="Previous Frame (,)"
                            >
                                ◄
                            </button>
                            <span className="text-[9px] font-mono text-zinc-400 hidden sm:inline">FRAME</span>
                            <button
                                type="button"
                                onClick={() => stepFrame('forward')}
                                className="text-[10px] font-mono text-zinc-200 hover:text-white px-1 py-0.5 rounded hover:bg-white/10 cursor-pointer"
                                title="Next Frame (.)"
                            >
                                ►
                            </button>
                        </div>

                        <span className="text-xs font-mono text-zinc-400 border-l border-white/20 pl-2 hidden lg:block">
                            Frame {Math.floor(currentTime * fps)} / {duration ? Math.floor(duration * fps) : 0}
                        </span>

                        <div className="flex items-center gap-1 border-l border-white/20 pl-2 hidden md:flex">
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mr-1">FPS</span>
                            <select
                                value={fps}
                                onChange={(e) => setFps(Number(e.target.value))}
                                className="bg-black/60 hover:bg-black/80 text-zinc-300 text-[11px] font-mono rounded px-1 py-0.5 border border-white/10 focus:outline-none focus:border-white/30 cursor-pointer transition-all duration-200"
                            >
                                <option value={24}>24</option>
                                <option value={25}>25</option>
                                <option value={29.97}>29.97</option>
                                <option value={30}>30</option>
                                <option value={50}>50</option>
                                <option value={60}>60</option>
                            </select>
                        </div>

                        <div className="flex items-center group/volume hidden md:flex border-l border-white/20 pl-2">
                            <Button type="button" onClick={handleMuteToggle} variant="ghost" size="icon" className="hover:bg-white/10 text-white rounded-full h-8 w-8">
                                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </Button>
                            <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300 ease-out flex items-center px-2">
                                <Slider
                                    value={[isMuted ? 0 : volume]}
                                    onValueChange={handleVolumeChange}
                                    max={1}
                                    step={0.05}
                                    className="w-full"
                                    trackClassName="bg-white/20 h-1"
                                    rangeClassName="bg-purple-400"
                                    thumbClassName="w-0 h-0 opacity-0 pointer-events-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Center: Speed Control (Hidden on small mobile, visible on sm+) */}
                    <div className="hidden sm:flex items-center justify-center">
                        {showCaptureButton ? (
                            <Button type="button" onClick={handleCaptureFrame} size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none h-8 text-xs">
                                <Camera className="mr-2 h-3 w-3" />
                                Capture
                            </Button>
                        ) : (
                            <div className="flex items-center gap-1.5 bg-black/40 rounded-full px-2.5 py-1 backdrop-blur-md border border-white/5">
                                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Speed</span>
                                <div className="w-16 md:w-20">
                                    <Slider
                                        value={[playbackRate]}
                                        onValueChange={handlePlaybackRateChange}
                                        min={0.25}
                                        max={2}
                                        step={0.25}
                                        className="w-full"
                                        trackClassName="bg-white/20 h-1"
                                        rangeClassName="bg-purple-400"
                                        thumbClassName="w-0 h-0 opacity-0 pointer-events-none"
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-zinc-200">{playbackRate}x</span>
                            </div>
                        )}
                    </div>

                    {/* Right: Like, Save, Share, Timeline Toggle & Fullscreen */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {/* Like Button */}
                        <Button
                            type="button"
                            onClick={handleLikeToggle}
                            variant="ghost"
                            size="icon"
                            title="Like Video"
                            className="hover:bg-white/20 text-white rounded-full h-8 w-8 transition-colors cursor-pointer bg-white/10 sm:bg-transparent"
                        >
                            <Heart className={cn("h-4 w-4 transition-colors", isLiked ? "fill-red-500 text-red-500" : "text-white")} />
                        </Button>

                        {/* Save to Moodboard Button */}
                        <Button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowSaveBoardModal(true);
                            }}
                            variant="ghost"
                            size="icon"
                            title="Save to Moodboard"
                            className="hover:bg-white/20 text-white rounded-full h-8 w-8 transition-colors cursor-pointer bg-white/10 sm:bg-transparent"
                        >
                            <Bookmark className="h-4 w-4 text-purple-300 fill-purple-400/20 hover:fill-purple-400" />
                        </Button>

                        {/* Share Button */}
                        <Button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(window.location.href);
                                toast({ title: "Link Copied!", description: "Video link copied to clipboard." });
                            }}
                            variant="ghost"
                            size="icon"
                            title="Share Video"
                            className="hover:bg-white/20 text-white rounded-full h-8 w-8 transition-colors cursor-pointer bg-white/10 sm:bg-transparent"
                        >
                            <Share2 className="h-4 w-4" />
                        </Button>

                        {onToggleTimeline && (
                            <Button
                                type="button"
                                onClick={onToggleTimeline}
                                variant="ghost"
                                size="icon"
                                title="Toggle Reel Clips Timeline"
                                className={cn(
                                    "hover:bg-white/10 text-white rounded-full h-8 w-8 transition-colors",
                                    isTimelineVisible && "bg-primary text-white"
                                )}
                            >
                                <Film className="h-4 w-4" />
                            </Button>
                        )}
                        {!hideFullscreenControl && (
                            <Button type="button" onClick={handleFullscreenToggle} variant="ghost" size="icon" title="Toggle Fullscreen" className="hover:bg-white/20 text-white rounded-full h-8 w-8 bg-white/10 sm:bg-transparent">
                                {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                            </Button>
                        )}
                    </div>
                </div>

                <SaveToBoardModal
                    open={showSaveBoardModal}
                    onOpenChange={setShowSaveBoardModal}
                    video={video}
                />
            </div>
        </div>
    );
});

VideoPlayer.displayName = 'VideoPlayer';
