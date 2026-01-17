
'use client';


import * as React from 'react';
import type { Video } from '@/lib/types';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Rewind, FastForward, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import ReactPlayer from 'react-player/lazy';
import { useToast } from '@/hooks/use-toast';

interface VideoPlayerProps {
    video: Video;
    onCapture?: (dataUrl: string) => void;
    showCaptureButton?: boolean;
    startsPaused?: boolean;
    muted?: boolean;
    hideFullscreenControl?: boolean;
    hidePlayControl?: boolean;
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


export const VideoPlayer = React.forwardRef<any, VideoPlayerProps>(({ video, onCapture, showCaptureButton = false, startsPaused = false, muted = true, hideFullscreenControl = false, hidePlayControl = false }, ref) => {
    const playerRef = React.useRef<ReactPlayer>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const { toast } = useToast();


    const [isPlaying, setIsPlaying] = React.useState(!startsPaused);
    const [isMuted, setIsMuted] = React.useState(muted);
    const [volume, setVolume] = React.useState(1);
    const [played, setPlayed] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    const [isSeeking, setIsSeeking] = React.useState(false);
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [showControls, setShowControls] = React.useState(true);
    const [playbackRate, setPlaybackRate] = React.useState(1);
    const controlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const stepFrame = (direction: 'forward' | 'backward') => {
        if (!playerRef.current) return;
        if (isPlaying) {
            setIsPlaying(false);
        }
        const frameTime = 1 / 24; // Common frame rate
        const internalPlayer = playerRef.current.getInternalPlayer();
        if (internalPlayer && typeof (internalPlayer as HTMLVideoElement).currentTime === 'number') {
            const newTime = direction === 'forward'
                ? Math.min(duration, (internalPlayer as HTMLVideoElement).currentTime + frameTime)
                : Math.max(0, (internalPlayer as HTMLVideoElement).currentTime - frameTime);
            playerRef.current.seekTo(newTime, 'seconds');
        }
    };

    const handleFullscreenToggle = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handlePlayPause = () => {
        setIsPlaying(prev => !prev);
        // Unmute when the user manually plays
        if (!isPlaying) {
            setIsMuted(false);
        }
    };

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [duration, isPlaying]);


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

    const handleMouseMove = () => {
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
                isFullScreen ? "rounded-none" : "rounded-lg",
                showControls ? "z-[100]" : "z-0"
            )}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { if (isPlaying) setShowControls(false) }}
            onClick={(e) => {
                // Ignore clicks on actual buttons/sliders if they bubble up (though most have stopPropagation)
                if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[role="slider"]')) {
                    return;
                }

                // Toggle controls
                setShowControls(prev => {
                    const newState = !prev;
                    if (newState) {
                        // If showing, set timer to hide again
                        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
                        controlsTimeoutRef.current = setTimeout(() => {
                            if (isPlaying) setShowControls(false);
                        }, isFullScreen ? 10000 : 5000); // Wait longer in fullscreen
                    }
                    return newState;
                });
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
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    loop
                    config={{
                        file: {
                            attributes: {
                                crossOrigin: 'anonymous'
                            }
                        }
                    }}
                />
            </div>

            {/* Dark Overlay for Controls Visibility */}
            <div
                className={cn(
                    "absolute inset-0 bg-black/40 transition-opacity duration-300 pointer-events-none",
                    showControls ? "opacity-100" : "opacity-0"
                )}
            />

            {/* Top Title Bar */}
            <div
                className={cn(
                    "absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent text-white z-20 transition-opacity duration-300 pointer-events-none",
                    showControls ? "opacity-100" : "opacity-0"
                )}
            >
                <h2 className="text-lg font-bold truncate drop-shadow-lg">{video.status === 'draft' ? 'Reference' : video.title}</h2>
            </div>

            {/* Center Play/Pause Button (YouTube Style) */}
            <div
                className={cn(
                    "absolute inset-0 flex items-center justify-center z-20 pointer-events-none transition-opacity duration-300",
                    showControls ? "opacity-100" : "opacity-0"
                )}
            >
                <div
                    className="bg-black/60 backdrop-blur-sm rounded-full p-4 text-white hover:bg-black/80 hover:scale-110 transition-all cursor-pointer pointer-events-auto"
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent toggling controls
                        handlePlayPause();
                    }}
                >
                    {isPlaying ? <Pause className="w-8 h-8 md:w-12 md:h-12 fill-white" /> : <Play className="w-8 h-8 md:w-12 md:h-12 fill-white ml-1" />}
                </div>
            </div>

            {/* Bottom Controls Container */}
            <div
                className={cn(
                    "absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-4 px-4 md:px-6",
                    showControls ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Progress Bar (Thin & Full Width) */}
                <div className="flex items-center gap-3 mb-4 group/timeline">
                    <p className="text-xs font-mono text-zinc-300 w-10 text-right mobile-hide block md:hidden">{formatTime(currentTime)}</p>
                    <Slider
                        value={[played]}
                        onValueChange={handleSeekChange}
                        onPointerDown={handleSeekMouseDown}
                        onPointerUp={handleSeekMouseUp}
                        max={1}
                        step={0.001}
                        className="w-full py-2 cursor-pointer"
                        trackClassName="bg-white/20 h-[2px] group-hover/timeline:h-[4px] transition-all"
                        rangeClassName="bg-red-600"
                        thumbClassName="h-3 w-3 group-hover/timeline:h-4 group-hover/timeline:w-4 bg-red-600 border-none transition-all scale-0 group-hover/timeline:scale-100"
                    />
                    <p className="text-xs font-mono text-zinc-300 w-10 mobile-hide block md:hidden">{formatTime(duration)}</p>
                </div>

                {/* Bottom Row: Time | Speed (Center) | Fullscreen */}
                <div className="flex justify-between items-center relative">

                    {/* Left: Time / Volume */}
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-medium text-zinc-300 hidden md:block">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>

                        <div className="flex items-center group/volume hidden md:flex">
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

                    {/* Center: Speed Control */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto">
                        {showCaptureButton ? (
                            <Button type="button" onClick={handleCaptureFrame} size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none h-8 text-xs">
                                <Camera className="mr-2 h-3 w-3" />
                                Capture
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2 bg-black/40 rounded-full px-3 py-1 backdrop-blur-md border border-white/5">
                                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Speed</span>
                                <div className="w-20">
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
                                <span className="text-[10px] font-mono w-6 text-right">{playbackRate}x</span>
                            </div>
                        )}
                    </div>

                    {/* Right: Fullscreen */}
                    <div className="flex items-center">
                        {!hideFullscreenControl && (
                            <Button type="button" onClick={handleFullscreenToggle} variant="ghost" size="icon" className="hover:bg-white/10 text-white rounded-full h-8 w-8">
                                {isFullScreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

VideoPlayer.displayName = 'VideoPlayer';
