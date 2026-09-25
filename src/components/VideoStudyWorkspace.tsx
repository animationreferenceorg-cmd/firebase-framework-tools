'use client';

import { useRef } from 'react';
import { ArrowLeft, BookOpenCheck, ExternalLink, Instagram } from 'lucide-react';
import type { Video } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { StudyNotesPanel } from '@/components/StudyNotesPanel';
import { VideoPlayer, type VideoPlayerHandle } from '@/components/VideoPlayer';

type VideoStudyWorkspaceProps = {
    video: Video;
    title: string;
    description?: string;
    isPro: boolean;
    onClose: () => void;
};

export function VideoStudyWorkspace({ video, title, description, isPro, onClose }: VideoStudyWorkspaceProps) {
    const playerRef = useRef<VideoPlayerHandle>(null);
    const originalIsInstagram = video.originalUrl?.toLowerCase().includes('instagram.com');

    return (
        <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#080611] text-white">
            <header className="relative z-[210] flex h-16 shrink-0 items-center gap-3 border-b border-white/10 bg-[#0d0a18]/95 px-3 backdrop-blur-xl sm:px-5">
                <Button
                    variant="ghost"
                    onClick={onClose}
                    className="h-10 shrink-0 gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-zinc-200 hover:bg-white/10 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Back</span>
                </Button>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="hidden items-center gap-1.5 rounded-full border border-purple-400/20 bg-purple-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-purple-200 sm:inline-flex">
                            <BookOpenCheck className="h-3 w-3" />
                            Study mode
                        </span>
                        <h1 className="truncate text-sm font-semibold text-white sm:text-base">{title}</h1>
                    </div>
                </div>

                {video.originalUrl && (
                    <a
                        href={video.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-purple-400/40 hover:bg-purple-500/15 hover:text-white"
                        title="Open original post"
                    >
                        {originalIsInstagram ? <Instagram className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                        <span className="hidden md:inline">Original</span>
                    </a>
                )}
            </header>

            <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_380px]">
                <main className="min-h-0 overflow-y-auto">
                    <div className="mx-auto flex min-h-full w-full max-w-[1500px] flex-col justify-center px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
                        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_24px_80px_-24px_rgba(124,58,237,0.45)] sm:rounded-2xl">
                            <VideoPlayer ref={playerRef} video={video} startsPaused={false} muted hideStudyAction />
                        </div>

                        <div className="flex flex-col gap-4 px-1 pb-2 pt-5 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
                                {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">{description}</p>}
                                {video.tags && video.tags.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {video.tags.slice(0, 8).map(tag => (
                                            <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400">#{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-2 xl:hidden">
                            <StudyNotesPanel
                                videoId={video.id}
                                getCurrentTime={() => playerRef.current?.getCurrentTime() || 0}
                                onSeek={(seconds) => playerRef.current?.seekTo(seconds)}
                                isPro={isPro}
                            />
                        </div>
                    </div>
                </main>

                <aside className="hidden min-h-0 overflow-y-auto border-l border-white/10 bg-[#0b0914] xl:block">
                    <StudyNotesPanel
                        videoId={video.id}
                        getCurrentTime={() => playerRef.current?.getCurrentTime() || 0}
                        onSeek={(seconds) => playerRef.current?.seekTo(seconds)}
                        isPro={isPro}
                        variant="sidebar"
                    />
                </aside>
            </div>
        </div>
    );
}
