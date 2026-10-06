'use client';


import * as React from 'react';
import type { Video } from '@/lib/types';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Rewind, FastForward, Camera, ExternalLink, Instagram, Film, Share2, Heart, Bookmark, FlipHorizontal } from 'lucide-react';
import { CreatorBadge } from '@/components/CreatorBadge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import ReactPlayer from 'react-player';
import FilePlayer from 'react-player/file';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { likeVideo, unlikeVideo, saveVideo, unsaveVideo } from '@/lib/firestore';
import { SaveToBoardModal } from '@/components/SaveToBoardModal';
import { ProDownloadButton } from '@/components/ProDownloadButton';
import { PricingDialog } from '@/components/PricingDialog';
import { OnionSkinOverlay, type OnionSettings, type OnionSkinHandle, type OnionStatus } from '@/components/player/OnionSkinOverlay';
import { StudyToolsPanel, VIEW_MODES, VIEW_MODE_FILTER, nextViewMode, type ViewMode } from '@/components/player/StudyToolsPanel';
import { isForeignKeyTarget, isKeyboardTarget, registerPlayer, setHoveredPlayer } from '@/lib/player-focus';
import { getEntitlements } from '@/lib/plans';
import { resolveLoop, shouldWrapLoop } from '@/lib/loop-range';
import { isVideoSourceAvailable } from '@/lib/video-availability';
import { track } from '@/lib/analytics';
import { useViewingQuota } from '@/hooks/use-viewing-quota';
import { VideoQuotaSlate } from '@/components/VideoQuotaSlate';

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
    hideLibraryActions?: boolean;
    /**
     * Apply the free-plan reference quota. Only the library viewer opts in;
     * card previews, portfolios, boards and admin previews never count or block.
     */
    enforceViewingQuota?: boolean;
}

export interface VideoPlayerHandle {
    handlePlayPause: () => void;
    getCurrentTime: () => number;
    seekTo: (seconds: number) => void;
}

// Direct files use the statically bundled file player. The default ReactPlayer
// lazy-loads this implementation in a separate browser chunk, which can leave
// the fullscreen study view black when that chunk is stale or unavailable.
function Player({ playerRef, video, url, config, ...props }: any) {
    const [hasMounted, setHasMounted] = React.useState(false);

    React.useEffect(() => {
        setHasMounted(true);
    }, []);

    if (!hasMounted) {
        return <div className="w-full h-full bg-black flex items-center justify-center text-white">Loading Player...</div>;
    }

    const PlayerComponent: React.ElementType = typeof url === 'string' && FilePlayer.canPlay(url)
        ? FilePlayer
        : ReactPlayer;
    const poster = video.posterUrl || video.thumbnailUrl;
    const fileConfig = config?.file || {};

    return (
        <PlayerComponent
            ref={playerRef}
            url={url}
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
            controls={false} // We are using our own controls
            playsinline
            config={{
                ...config,
                file: {
                    ...fileConfig,
                    attributes: {
                        preload: 'auto',
                        playsInline: true,
                        poster,
                        ...fileConfig.attributes,
                    }
                }
            }}
            {...props}
        />
    )
}


export const VideoPlayer = React.forwardRef<VideoPlayerHandle, VideoPlayerProps>(({ video, onCapture, showCaptureButton = false, startsPaused = false, muted = true, hideFullscreenControl = false, hidePlayControl = false, onEnded, autoPlay, loop = false, alwaysShowControls = true, onToggleTimeline, isTimelineVisible = true, hideLibraryActions = false, enforceViewingQuota = false }, ref) => {
    const playerRef = React.useRef<ReactPlayer>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const { userProfile, mutate } = useUser();
    const isLiked = React.useMemo(() => {
        return userProfile?.likedVideoIds?.includes(video.id) ?? false;
    }, [userProfile, video.id]);

    const isSaved = React.useMemo(() => {
        return userProfile?.savedVideoIds?.includes(video.id) ?? false;
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

    const [showSaveToBoard, setShowSaveToBoard] = React.useState(false);

    const handleBookmarkToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!authUser) {
            toast({ variant: "destructive", title: "Please sign in to save videos" });
            return;
        }
        setShowSaveToBoard(true);
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
    const [playerReloadToken, setPlayerReloadToken] = React.useState(0);
    // Retries that failed again, so the overlay can say so instead of looking unchanged.
    const [failedRetries, setFailedRetries] = React.useState(0);
    // Hosted on a library that went offline: no retry can ever succeed.
    const sourceGone = !isVideoSourceAvailable(video.videoUrl);
    const [fps, setFps] = React.useState<number>(video.fps || 24);
    const [isFlipped, setIsFlipped] = React.useState(false);
    const controlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Study tools: A–B loop, view filters and onion skin.
    const [viewMode, setViewMode] = React.useState<ViewMode>('normal');
    const [loopIn, setLoopIn] = React.useState<number | null>(null);
    const [loopOut, setLoopOut] = React.useState<number | null>(null);
    const [mediaEl, setMediaEl] = React.useState<HTMLVideoElement | null>(null);
    const [onionEnabled, setOnionEnabled] = React.useState(false);
    const [onionSettings, setOnionSettings] = React.useState<OnionSettings>({ frames: 2, step: 1 });
    const [onionStatus, setOnionStatus] = React.useState<OnionStatus>('idle');
    const [onionExportable, setOnionExportable] = React.useState(false);
    const [exportingOnion, setExportingOnion] = React.useState(false);
    const [showPricing, setShowPricing] = React.useState(false);
    const [containerSize, setContainerSize] = React.useState({ w: 0, h: 0 });
    const onionRef = React.useRef<OnionSkinHandle>(null);
    const playerIdRef = React.useRef(Symbol('video-player'));
    const isPro = getEntitlements(userProfile).isPro;
    const quota = useViewingQuota();
    const isBlockedByQuota = enforceViewingQuota && quota.hasReachedLimit && !quota.isVideoUnlocked(video.id);

    // A reference is "unlocked" when it actually starts playing in the library viewer.
    const recordQuotaView = () => {
        if (!enforceViewingQuota || !video.id) return;
        quota.attemptUnlock(video.id).then(({ allowed }) => {
            if (!allowed) setIsPlaying(false);
        });
    };

    // Onion skin decodes frames from the file itself, so embeds (YouTube etc.) can't use it.
    const onionSupported = mediaEl !== null && typeof video.videoUrl === 'string' && video.videoUrl.length > 0;

    // A new video (or a reloaded player) starts with a clean loop and a fresh media element.
    React.useEffect(() => {
        setLoopIn(null);
        setLoopOut(null);
        setMediaEl(null);
    }, [video.id, video.videoUrl, playerReloadToken]);

    React.useEffect(() => registerPlayer(playerIdRef.current, () => containerRef.current), []);

    React.useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => setContainerSize({ w: el.clientWidth, h: el.clientHeight }));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    React.useEffect(() => {
        setFps(video.fps || 24);
    }, [video.fps]);

    React.useEffect(() => {
        setVideoError(false);
        setPlayerReloadToken(0);
    }, [video.videoUrl]);

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
            if (duration > 0) setPlayed(newTime / duration);
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

    const getTimeNow = React.useCallback((): number => {
        if (mediaEl) return mediaEl.currentTime;
        const t = playerRef.current?.getCurrentTime();
        return typeof t === 'number' && Number.isFinite(t) ? t : played * duration;
    }, [mediaEl, played, duration]);
    const getTimeNowRef = React.useRef(getTimeNow);
    getTimeNowRef.current = getTimeNow;

    const seekToTime = React.useCallback((t: number) => {
        if (!playerRef.current) return;
        playerRef.current.seekTo(t, 'seconds');
        if (duration > 0) setPlayed(t / duration);
    }, [duration]);

    const loopRange = React.useMemo(() => resolveLoop(loopIn, loopOut, duration, fps), [loopIn, loopOut, duration, fps]);
    const { start: loopStart, end: loopEnd, active: loopActive } = loopRange;

    const handleSetLoopIn = React.useCallback(() => {
        const t = getTimeNowRef.current();
        setLoopIn(t);
        setLoopOut((out) => (out !== null && out <= t ? null : out));
    }, []);

    const handleSetLoopOut = React.useCallback(() => {
        const t = getTimeNowRef.current();
        setLoopOut(t);
        setLoopIn((start) => (start !== null && start >= t ? null : start));
    }, []);

    const clearLoop = React.useCallback(() => {
        setLoopIn(null);
        setLoopOut(null);
    }, []);

    // Enforce the loop every animation frame; onProgress (once a second) is far too coarse.
    React.useEffect(() => {
        if (!loopRange.active || !isPlaying) return;
        let raf = 0;
        let cooldownUntil = 0;
        const tick = () => {
            const now = performance.now();
            if (now >= cooldownUntil && shouldWrapLoop(getTimeNowRef.current(), loopRange, duration, fps)) {
                seekToTime(loopRange.start);
                cooldownUntil = now + 150; // let the seek land before checking again
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [loopRange, isPlaying, duration, fps, seekToTime]);

    const requestUpgrade = React.useCallback((trigger: string) => {
        // The pricing dialog renders in a portal, which is invisible inside native fullscreen.
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        track('upgrade_prompt_viewed', { trigger, source: 'player' });
        setShowPricing(true);
    }, []);

    const handleExportOnion = async () => {
        if (!isPro) {
            requestUpgrade('onion_export');
            return;
        }
        if (!onionRef.current || exportingOnion) return;
        setExportingOnion(true);
        try {
            const blob = await onionRef.current.exportPng();
            const url = URL.createObjectURL(blob);
            const slug = (video.title || 'reference').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/\s+/g, '-') || 'reference';
            const a = document.createElement('a');
            a.href = url;
            a.download = `${slug}-onion-skin-f${Math.round(getTimeNowRef.current() * fps)}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 10_000);
            track('export_completed', { format: 'png', source: 'onion_skin' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Export unavailable', description: err?.message || 'Could not export this frame.' });
        } finally {
            setExportingOnion(false);
        }
    };

    React.useImperativeHandle(ref, () => ({
        handlePlayPause,
        getCurrentTime: () => played * duration,
        seekTo: (seconds: number) => {
            if (!playerRef.current || !Number.isFinite(seconds)) return;
            const safeTime = Math.max(0, Math.min(duration || seconds, seconds));
            playerRef.current.seekTo(safeTime, 'seconds');
            if (duration > 0) setPlayed(safeTime / duration);
            setIsPlaying(false);
        },
    }), [handlePlayPause, played, duration]);

    React.useEffect(() => {
        const onFullScreenChange = () => {
            const isCurrentlyFullScreen = !!document.fullscreenElement;
            setIsFullScreen(isCurrentlyFullScreen);
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (isForeignKeyTarget(e.target, containerRef.current)) return;
            // Many players can be mounted (clip cards); only one should react.
            if (!isKeyboardTarget(playerIdRef.current)) return;
            const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

            if (key === 'i') {
                e.preventDefault();
                handleSetLoopIn();
            } else if (key === 'o') {
                e.preventDefault();
                handleSetLoopOut();
            } else if (key === 'l') {
                e.preventDefault();
                clearLoop();
            } else if (key === 'c') {
                e.preventDefault();
                setViewMode(nextViewMode);
            } else if (key === 'g') {
                if (!onionSupported) return;
                e.preventDefault();
                setOnionEnabled((on) => !on);
            } else if (e.key === ',' || (e.key === 'ArrowLeft' && e.shiftKey)) {
                e.preventDefault();
                stepFrame('backward');
            } else if (e.key === '.' || (e.key === 'ArrowRight' && e.shiftKey)) {
                e.preventDefault();
                stepFrame('forward');
            } else if (e.key === ' ') {
                e.preventDefault();
                handlePlayPause();
            } else if (key === 'm') {
                e.preventDefault();
                setIsFlipped(prev => !prev);
            } else if (e.key === '[') {
                e.preventDefault();
                setPlaybackRate(prev => Math.max(0.25, Number((prev - 0.25).toFixed(2))));
            } else if (e.key === ']') {
                e.preventDefault();
                setPlaybackRate(prev => Math.min(2.0, Number((prev + 0.25).toFixed(2))));
            }
        };

        document.addEventListener('fullscreenchange', onFullScreenChange);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('fullscreenchange', onFullScreenChange);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [duration, isPlaying, stepFrame, handlePlayPause, handleSetLoopIn, handleSetLoopOut, clearLoop, onionSupported]);


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

    if (isBlockedByQuota) {
        return (
            <div
                ref={containerRef}
                className={cn(
                    "group/player relative w-full h-full flex items-center justify-center overflow-hidden bg-black select-none",
                    isFullScreen ? "rounded-none" : "rounded-lg"
                )}
            >
                <VideoQuotaSlate
                    posterUrl={video.thumbnailUrl || video.posterUrl}
                    unlockedCount={quota.unlockedCount}
                    limit={quota.limit}
                />
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                "group/player relative w-full h-full flex items-center justify-center overflow-hidden bg-black select-none transition-all duration-300",
                isFullScreen ? "rounded-none" : "rounded-lg"
            )}
            onMouseMove={handleMouseMove}
            onPointerEnter={() => setHoveredPlayer(playerIdRef.current, true)}
            onPointerLeave={() => setHoveredPlayer(playerIdRef.current, false)}
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
                {/* Only the picture is mirrored and filtered; overlays and text stay readable. */}
                <div
                    className={cn("absolute inset-0 transition-transform duration-200", isFlipped && "-scale-x-100")}
                    style={{ filter: VIEW_MODE_FILTER[viewMode] }}
                >
                {!sourceGone && <Player
                    key={`${video.id}-${playerReloadToken}`}
                    playerRef={playerRef}
                    url={video.videoUrl}
                    video={video}
                    playing={isPlaying}
                    volume={volume}
                    muted={isMuted}
                    playbackRate={playbackRate}
                    onProgress={handleProgress}
                    onDuration={setDuration}
                    onPlay={() => { setIsPlaying(true); setVideoError(false); recordQuotaView(); }}
                    onPause={() => setIsPlaying(false)}
                    onReady={(player: any) => {
                        const el = player?.getInternalPlayer?.();
                        setMediaEl(el instanceof HTMLVideoElement ? el : null);
                    }}
                    onEnded={() => {
                        if (loopActive) {
                            // Out point at (or past) the end: wrap back to the in point.
                            seekToTime(loopStart);
                            if (mediaEl) {
                                mediaEl.play().catch(() => {});
                            } else {
                                setIsPlaying(false);
                                setTimeout(() => setIsPlaying(true), 0);
                            }
                            return;
                        }
                        setIsPlaying(false);
                        if (onEnded) onEnded();
                    }}
                    onError={(e: any) => {
                        console.warn("Video Player Error:", e);
                        setIsPlaying(false);
                        setVideoError(true);
                        if (playerReloadToken > 0) setFailedRetries(playerReloadToken);
                    }}
                    loop={loop}
                    config={{
                        file: {
                            attributes: showCaptureButton ? {
                                crossOrigin: 'anonymous'
                            } : {}
                        }
                    }}
                />}
                {onionSupported && (
                    <OnionSkinOverlay
                        ref={onionRef}
                        src={video.videoUrl}
                        mediaEl={mediaEl}
                        fps={fps}
                        settings={onionSettings}
                        enabled={onionEnabled}
                        paused={!isPlaying}
                        onStatusChange={(status, exportable) => {
                            setOnionStatus(status);
                            setOnionExportable(exportable);
                        }}
                    />
                )}
                </div>

                {/* Never strand the user on a black player when a source fails. */}
                {(videoError || sourceGone) && (
                    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm rounded-lg gap-4 p-6 text-center">
                        <div className="w-16 h-16 bg-gradient-to-tr from-pink-500 to-purple-500 rounded-full flex items-center justify-center shadow-xl animate-bounce">
                            {video.originalUrl?.toLowerCase().includes('instagram.com') ? (
                                <Instagram className="w-8 h-8 text-white" />
                            ) : (
                                <ExternalLink className="w-8 h-8 text-white" />
                            )}
                        </div>
                        <div>
                            <p className="text-white font-bold text-lg mb-1">
                                {sourceGone ? 'This reference is unavailable' : "Video couldn't load"}
                            </p>
                            <p className="text-zinc-400 text-sm mb-4 max-w-sm mx-auto">
                                {sourceGone
                                    ? 'It was hosted by a third-party library that has gone offline. We’re working on restoring it.'
                                    : failedRetries > 0
                                        ? `Still couldn't load it after ${failedRetries === 1 ? 'a retry' : `${failedRetries} retries`}. The file may be temporarily unavailable — try again later${video.originalUrl ? ' or open the original post' : ''}.`
                                        : video.originalUrl ? 'Retry the player or open the original post.' : 'Retry the player to load this reference.'}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                {!sourceGone && <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setVideoError(false);
                                        setPlayerReloadToken((token) => token + 1);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-white/20"
                                >
                                    Retry video
                                </button>}
                                {video.originalUrl && (
                                    <a
                                        href={video.originalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(event) => event.stopPropagation()}
                                        className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white font-semibold px-6 py-2.5 rounded-full transition-all hover:scale-105 shadow-lg"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Open Original Post
                                    </a>
                                )}
                            </div>
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

            {/* Active study tools, so a filtered or looping view is never a mystery. */}
            {(loopActive || viewMode !== 'normal' || onionEnabled) && (
                <div className={cn(
                    "absolute top-3 right-3 z-50 flex flex-wrap justify-end gap-1 transition-opacity duration-300 pointer-events-none",
                    showControls ? "opacity-100" : "opacity-0"
                )}>
                    {loopActive && (
                        <span className="rounded-full border border-amber-400/40 bg-black/70 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                            LOOP f{Math.round(loopStart * fps)}–f{Math.round(loopEnd * fps)}
                        </span>
                    )}
                    {viewMode !== 'normal' && (
                        <span className="rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-200">
                            {VIEW_MODES.find((m) => m.id === viewMode)?.label}
                        </span>
                    )}
                    {onionEnabled && (
                        <span className="rounded-full border border-purple-400/40 bg-black/70 px-2 py-0.5 text-[10px] font-bold text-purple-200">
                            ONION ±{onionSettings.frames}{isPlaying ? ' · pause to view' : ''}
                        </span>
                    )}
                </div>
            )}

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
                    <div className="relative w-full">
                    <Slider
                        value={[played]}
                        onValueChange={handleSeekChange}
                        onPointerDown={handleSeekMouseDown}
                        onPointerUp={handleSeekMouseUp}
                        max={1}
                        step={0.001}
                        className="w-full py-2 cursor-pointer"
                        trackClassName="bg-white/30 h-2.5 rounded-full cursor-pointer hover:h-3.5 transition-all"
                        rangeClassName="bg-red-600 shadow-md"
                        thumbClassName="h-4.5 w-4.5 bg-red-600 border-2 border-white rounded-full shadow-xl scale-100 transition-transform hover:scale-125 cursor-grab active:cursor-grabbing"
                    />
                    {loopActive && duration > 0 && (
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 h-4 -translate-y-1/2 rounded-sm border-x-2 border-amber-300 bg-amber-300/25"
                            style={{
                                left: `${(loopStart / duration) * 100}%`,
                                width: `${(Math.min(loopEnd + 1 / fps, duration) - loopStart) / duration * 100}%`,
                            }}
                        />
                    )}
                    </div>
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
                                    rangeClassName="bg-white"
                                    thumbClassName="h-3 w-3 bg-white"
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
                                        rangeClassName="bg-white"
                                        thumbClassName="h-3 w-3 bg-white hover:scale-125 transition-transform"
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-zinc-200">{playbackRate}x</span>
                            </div>
                        )}

                        {/* Horizontal Flip / Mirror Button for Animators */}
                        <Button
                            type="button"
                            onClick={() => setIsFlipped(prev => !prev)}
                            variant="ghost"
                            size="icon"
                            title="Mirror Video Horizontally (M)"
                            className={cn(
                                "hover:bg-white/20 text-white rounded-full h-8 w-8 transition-colors cursor-pointer shrink-0 ml-1.5",
                                isFlipped 
                                    ? "bg-purple-500/30 text-purple-300 border border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.4)]" 
                                    : "bg-black/40 border border-white/5 sm:bg-transparent"
                            )}
                        >
                            <FlipHorizontal className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Right: Like, Save, Share, Timeline Toggle & Fullscreen */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {/* Reference clips use their own Save to Board action outside the player. */}
                        {!hideLibraryActions && <Button
                            type="button"
                            onClick={handleLikeToggle}
                            variant="ghost"
                            size="icon"
                            title="Like Video"
                            className="hover:bg-white/20 text-white rounded-full h-8 px-2 w-auto gap-1 transition-colors cursor-pointer bg-white/10 sm:bg-transparent"
                        >
                            <Heart className={cn("h-4 w-4 transition-colors", isLiked ? "fill-red-500 text-red-500" : "text-white")} />
                            <span className="text-xs font-semibold">{video.likeCount ?? 0}</span>
                        </Button>}

                        {/* Save Button */}
                        {!hideLibraryActions && <Button
                            type="button"
                            onClick={handleBookmarkToggle}
                            variant="ghost"
                            size="icon"
                            title="Save Video"
                            className="hover:bg-white/20 text-white rounded-full h-8 w-8 transition-colors cursor-pointer bg-white/10 sm:bg-transparent"
                        >
                            <Bookmark className={cn("h-4 w-4", isSaved ? "fill-purple-400 text-purple-400" : "text-purple-300 fill-purple-400/20 hover:fill-purple-400")} />
                        </Button>}

                        {containerSize.w >= 420 && (
                            <StudyToolsPanel
                                fps={fps}
                                loopIn={loopIn}
                                loopOut={loopOut}
                                loopActive={loopActive}
                                onSetIn={handleSetLoopIn}
                                onSetOut={handleSetLoopOut}
                                onClearLoop={clearLoop}
                                viewMode={viewMode}
                                onViewModeChange={setViewMode}
                                onionEnabled={onionEnabled}
                                onionSupported={onionSupported}
                                onionStatus={onionStatus}
                                onionExportable={onionExportable}
                                onionSettings={onionSettings}
                                onOnionToggle={() => setOnionEnabled((on) => !on)}
                                onOnionSettingsChange={setOnionSettings}
                                onExportOnion={handleExportOnion}
                                exporting={exportingOnion}
                                isPro={isPro}
                                maxHeight={Math.max(160, containerSize.h - 110)}
                            />
                        )}

                        {/* Pro-only clean MP4 download */}
                        {video.id && <ProDownloadButton videoId={video.id} />}

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
            </div>

            <SaveToBoardModal
                video={video}
                open={showSaveToBoard}
                onOpenChange={setShowSaveToBoard}
            />
            <PricingDialog open={showPricing} onOpenChange={setShowPricing} />
        </div>
    );
});

VideoPlayer.displayName = 'VideoPlayer';
