
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
}

// Client-side only component to wrap ReactPlayer
function Player({ playerRef, ...props }: any) {
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

export const VideoPlayer = React.forwardRef<any, VideoPlayerProps>(({ video, onCapture, showCaptureButton = false, startsPaused = false, muted = true }, ref) => {
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
    if(internalPlayer && typeof (internalPlayer as HTMLVideoElement).currentTime === 'number') {
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
        if(isPlaying) setShowControls(false);
    }, 3000);
  };
  
  const currentTime = played * duration;


  return (
    <div 
        ref={containerRef} 
        className="group/player relative w-full h-full flex items-center justify-center rounded-lg overflow-hidden bg-black"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { if(isPlaying) setShowControls(false) }}
    >
       <div className="relative w-full aspect-video max-w-full max-h-full">
            <Player 
                playerRef={playerRef}
                url={video.videoUrl}
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
            />
       </div>
        
        <div 
            className={cn(
                "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 pointer-events-none",
                showControls ? "opacity-100" : "opacity-0"
            )}
        />
        <div 
            className={cn(
                "absolute top-0 left-0 right-0 p-4 text-white z-10 transition-opacity duration-300 pointer-events-none",
                showControls ? "opacity-100" : "opacity-0"
            )}
        >
            <h2 className="text-lg font-bold truncate drop-shadow-lg">{video.title}</h2>
        </div>
        
        <div 
            className={cn(
                "absolute bottom-0 left-0 right-0 p-4 text-white z-10 transition-opacity duration-300",
                showControls ? "opacity-100" : "opacity-0"
            )}
        >
            <div className="flex items-center gap-2">
                <p className="text-sm font-mono w-14 text-center">{formatTime(currentTime)}</p>
                <Slider
                    value={[played]}
                    onValueChange={handleSeekChange}
                    onPointerDown={handleSeekMouseDown}
                    onPointerUp={handleSeekMouseUp}
                    max={1}
                    step={0.001}
                    className="w-full"
                />
                <p className="text-sm font-mono w-14 text-center">{formatTime(duration)}</p>
            </div>

            <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-2 w-[220px]">
                    <Button type="button" onClick={() => stepFrame('backward')} variant="ghost" size="icon">
                        <Rewind />
                    </Button>
                    <Button type="button" onClick={handlePlayPause} variant="ghost" size="icon">
                        {isPlaying ? <Pause /> : <Play />}
                    </Button>
                    <Button type="button" onClick={() => stepFrame('forward')} variant="ghost" size="icon">
                        <FastForward />
                    </Button>
                    <div className="flex items-center gap-2 w-32 group/volume">
                        <Button type="button" onClick={handleMuteToggle} variant="ghost" size="icon">
                            {isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
                        </Button>
                        <Slider
                            value={[isMuted ? 0 : volume]}
                            onValueChange={handleVolumeChange}
                            max={1}
                            step={0.05}
                            className="w-full opacity-0 group-hover/volume:opacity-100 transition-opacity"
                        />
                    </div>
                </div>
                
                <div className="flex-1 flex justify-center items-center gap-4 px-4 group/speed">
                    {showCaptureButton ? (
                        <Button type="button" onClick={handleCaptureFrame}>
                            <Camera className="mr-2 h-4 w-4" />
                            Capture Frame
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 w-full max-w-xs">
                            <p className="text-sm font-mono w-16 text-center">{playbackRate.toFixed(2)}x</p>
                            <Slider
                                value={[playbackRate]}
                                onValueChange={handlePlaybackRateChange}
                                min={0.01}
                                max={2}
                                step={0.01}
                                className="w-full"
                                trackClassName="bg-white/20 h-0.5 group-hover/speed:h-2 transition-all duration-200"
                                rangeClassName="bg-white"
                                thumbClassName="h-3 w-3 group-hover/speed:h-5 group-hover/speed:w-5 border-white transition-all duration-200"
                            />
                        </div>
                    )}
                </div>


                <div className="flex items-center justify-end w-[220px]">
                    <Button type="button" onClick={handleFullscreenToggle} variant="ghost" size="icon">
                        {isFullScreen ? <Minimize /> : <Maximize />}
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
