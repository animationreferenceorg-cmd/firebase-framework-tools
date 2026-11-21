'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Instagram,
    Split,
    LayoutGrid,
    BookmarkPlus,
    Sparkles,
    Plug,
    Play,
    X,
} from 'lucide-react';
import type { Video } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from '@/components/VideoPlayer';
import { ArtworkDetailModal } from '@/components/reference/ArtworkDetailModal';
import { SideBySideCompareModal } from '@/components/reference/SideBySideCompareModal';
import { ContactSheetModal } from '@/components/reference/ContactSheetModal';
import { ProDownloadButton } from '@/components/ProDownloadButton';
import { SaveToBoardModal } from '@/components/SaveToBoardModal';
import { PricingDialog } from '@/components/PricingDialog';
import { VideoQuotaSlate } from '@/components/VideoQuotaSlate';
import { useUser } from '@/hooks/use-user';
import { getEntitlements } from '@/lib/plans';
import { useViewingQuota } from '@/hooks/use-viewing-quota';
import { cn } from '@/lib/utils';
import { EmbedShareButton } from '@/components/embed/EmbedShareButton';

type VideoFullscreenViewerProps = {
    video: Video;
    playlist?: Video[];
    title: string;
    description?: string;
    onClose: () => void;
};

export function VideoFullscreenViewer(props: VideoFullscreenViewerProps) {
    // If reference is an artwork, 3D model, or project without a playable video stream,
    // open the dedicated interactive artwork & 3D model viewer
    const isModelOrEmbed = (props.video as any).mediaType === 'model3d' || Boolean((props.video as any).embedUrl);
    if (isModelOrEmbed || (!props.video.videoUrl && (props.video.posterUrl || props.video.thumbnailUrl))) {
        return <ArtworkDetailModal item={props.video} isOpen={true} onClose={props.onClose} />;
    }
    return <VideoStudyViewer {...props} />;
}

function VideoStudyViewer({ video, playlist, title, description, onClose }: VideoFullscreenViewerProps) {
    const [activeVideo, setActiveVideo] = useState<Video>(video);
    useEffect(() => {
        setActiveVideo(video);
    }, [video.id]);

    // Filter playlist to playable video items so Next/Prev stays in smooth video study flow
    const playablePlaylist = useMemo(() => {
        if (!playlist || playlist.length === 0) return [video];
        const filtered = playlist.filter((v) => {
            const isModel = (v as any).mediaType === 'model3d' || Boolean((v as any).embedUrl);
            return !isModel && Boolean(v.videoUrl || v.previewUrl || v.originalUrl);
        });
        if (!filtered.some((v) => v.id === video.id)) {
            return [video, ...filtered];
        }
        return filtered;
    }, [playlist, video]);

    const currentIndex = useMemo(
        () => Math.max(0, playablePlaylist.findIndex((v) => v.id === activeVideo.id)),
        [playablePlaylist, activeVideo.id]
    );
    const hasPlaylistNav = playablePlaylist.length > 1;
    const prevVideo = hasPlaylistNav
        ? playablePlaylist[(currentIndex - 1 + playablePlaylist.length) % playablePlaylist.length]
        : null;
    const nextVideo = hasPlaylistNav
        ? playablePlaylist[(currentIndex + 1) % playablePlaylist.length]
        : null;

    const upNextVideos = useMemo(() => {
        if (!hasPlaylistNav) return [];
        const items: Video[] = [];
        const maxCount = Math.min(10, playablePlaylist.length - 1);
        for (let i = 1; i <= maxCount; i++) {
            items.push(playablePlaylist[(currentIndex + i) % playablePlaylist.length]);
        }
        return items;
    }, [hasPlaylistNav, playablePlaylist, currentIndex]);

    const activeTitle = activeVideo.id === video.id ? title : (activeVideo.status === 'draft' ? 'Reference' : activeVideo.title);
    const activeDescription = activeVideo.id === video.id ? description : (activeVideo.status === 'draft' ? '' : activeVideo.description);
    const originalIsInstagram = activeVideo.originalUrl?.toLowerCase().includes('instagram.com');

    const { userProfile } = useUser();
    const entitlements = getEntitlements(userProfile);
    const isPro = entitlements.isPro;
    const quota = useViewingQuota();

    const activeBlocked = quota.hasReachedLimit && !quota.isVideoUnlocked(activeVideo.id);

    const [showCompareModal, setShowCompareModal] = useState(false);
    const [showContactSheetModal, setShowContactSheetModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showPricingDialog, setShowPricingDialog] = useState(false);

    const selectPlaylistVideo = useCallback(
        (target: Video | null) => {
            if (!target) return;
            setActiveVideo(target);
            if (!quota.isVideoUnlocked(target.id) && !quota.hasReachedLimit) {
                quota.attemptUnlock(target.id);
            }
        },
        [quota]
    );

    const handleCompareClick = () => {
        if (!isPro) {
            setShowPricingDialog(true);
            return;
        }
        setShowCompareModal(true);
    };

    const handleContactSheetClick = () => {
        if (!isPro) {
            setShowPricingDialog(true);
            return;
        }
        setShowContactSheetModal(true);
    };

    const handleSaveClick = () => {
        setShowSaveModal(true);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.defaultPrevented) return;
            const target = e.target as HTMLElement | null;
            const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

            if (e.key === 'Escape') {
                onClose();
                return;
            }
            if (typing || !hasPlaylistNav) return;

            // J / K or Shift + ArrowLeft/ArrowRight switches clips (leaving bare ArrowLeft/Right for frame-stepping)
            if (e.key === 'j' || e.key === 'J' || (e.shiftKey && e.key === 'ArrowRight')) {
                e.preventDefault();
                selectPlaylistVideo(nextVideo);
            } else if (e.key === 'k' || e.key === 'K' || (e.shiftKey && e.key === 'ArrowLeft')) {
                e.preventDefault();
                selectPlaylistVideo(prevVideo);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, hasPlaylistNav, nextVideo, prevVideo, selectPlaylistVideo]);

    return (
        <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#080611] text-white">
            <header className="relative z-[210] flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0d0a18]/95 px-3 backdrop-blur-xl sm:px-5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="h-10 shrink-0 gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-zinc-200 hover:bg-white/10 hover:text-white cursor-pointer"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Back</span>
                    </Button>

                    {/* Prev / Next Binge Controls */}
                    {hasPlaylistNav && (
                        <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1 shrink-0">
                            <button
                                type="button"
                                onClick={() => selectPlaylistVideo(prevVideo)}
                                title="Previous clip (K or Shift+←)"
                                aria-label="Previous clip"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-300 hover:bg-violet-500/25 hover:text-white active:scale-[0.95] transition cursor-pointer"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="hidden md:inline px-1.5 font-mono text-[11px] font-bold text-zinc-400">
                                {currentIndex + 1}/{playablePlaylist.length}
                            </span>
                            <button
                                type="button"
                                onClick={() => selectPlaylistVideo(nextVideo)}
                                title="Next clip (J or Shift+→)"
                                aria-label="Next clip"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-300 hover:bg-violet-500/25 hover:text-white active:scale-[0.95] transition cursor-pointer"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    <h1 className="min-w-0 truncate text-sm font-semibold text-white sm:text-base">{activeTitle}</h1>

                    {quota.ready && !quota.unlimited && (
                        <div
                            className={cn(
                                'hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold shrink-0 transition-colors',
                                quota.hasReachedLimit
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                    : 'bg-white/5 border-white/10 text-zinc-300'
                            )}
                            title={
                                quota.isGuest
                                    ? `Guest reference quota: ${quota.todayRemaining} of ${quota.limit} free clips left.`
                                    : `Daily reference quota: ${quota.todayRemaining} of ${quota.limit} clips left today. Previously opened clips stay playable anytime.`
                            }
                        >
                            <span className={cn('w-1.5 h-1.5 rounded-full', quota.hasReachedLimit ? 'bg-amber-400' : 'bg-purple-400')} />
                            <span>
                                {quota.todayRemaining}/{quota.limit} {quota.isGuest ? 'guest free' : 'left today'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Studio Tools Header Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <Link
                        href="/tools"
                        onClick={onClose}
                        className="hidden xl:inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 hover:text-white transition-colors"
                        title="Sync this clip to Maya & Blender via AnimRef Moodboards"
                    >
                        <Plug className="h-3.5 w-3.5 text-cyan-300" />
                        <span>Maya / Blender</span>
                    </Link>

                    <EmbedShareButton kind={activeVideo.isPortfolio ? 'portfolio' : 'video'} id={activeVideo.id} title={activeVideo.title} mediaUrl={activeVideo.videoUrl} />
                    <ProDownloadButton videoId={activeVideo.id} variant="labeled" className="h-9 px-2.5 sm:px-3" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCompareClick}
                        className="h-9 px-2.5 sm:px-3 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 hover:text-white cursor-pointer flex items-center gap-1.5 transition-all"
                        title="Compare with your 3D playblast side-by-side"
                    >
                        <Split className="h-4 w-4 text-purple-400" />
                        <span className="hidden md:inline text-xs font-semibold">Playblast Compare</span>
                        {!isPro && (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-1 rounded border border-amber-400/30">
                                PRO
                            </span>
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleContactSheetClick}
                        className="h-9 px-2.5 sm:px-3 rounded-xl border border-pink-500/30 bg-pink-500/10 text-pink-200 hover:bg-pink-500/20 hover:text-white cursor-pointer flex items-center gap-1.5 transition-all"
                        title="Export high-resolution keyframe contact sheet"
                    >
                        <LayoutGrid className="h-4 w-4 text-pink-400" />
                        <span className="hidden md:inline text-xs font-semibold">Contact Sheet</span>
                        {!isPro && (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-1 rounded border border-amber-400/30">
                                PRO
                            </span>
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveClick}
                        className="h-9 px-2.5 sm:px-3 rounded-xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white cursor-pointer flex items-center gap-1.5 transition-all"
                        title="Save to reference board (auto-syncs to Maya & Blender)"
                    >
                        <BookmarkPlus className="h-4 w-4 text-amber-300" />
                        <span className="hidden md:inline text-xs font-semibold">Save</span>
                    </Button>

                    {activeVideo.originalUrl && (
                        <a
                            href={activeVideo.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-purple-400/40 hover:bg-purple-500/15 hover:text-white"
                            title="Open original post"
                        >
                            {originalIsInstagram ? <Instagram className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
                            <span className="hidden lg:inline">Source</span>
                        </a>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-9 w-9 shrink-0 rounded-xl border border-white/15 bg-white/5 text-zinc-300 hover:bg-red-500/20 hover:text-white hover:border-red-500/40 transition-all cursor-pointer ml-1"
                        title="Close Viewer (Esc)"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </header>

            <main
                className="min-h-0 flex-1 overflow-y-auto cursor-pointer"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <div
                    className="mx-auto flex min-h-full w-full max-w-[1500px] flex-col justify-center px-3 py-4 sm:px-6 sm:py-6 lg:px-10 cursor-default"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}
                >
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_24px_80px_-24px_rgba(124,58,237,0.45)] sm:rounded-2xl">
                        {activeBlocked ? (
                            <VideoQuotaSlate
                                posterUrl={activeVideo.thumbnailUrl || activeVideo.posterUrl}
                                unlockedCount={quota.unlockedCount}
                                todayCount={quota.todayCount}
                                limit={quota.limit}
                                isGuest={quota.isGuest}
                                onBrowseUnlocked={onClose}
                            />
                        ) : (
                            <VideoPlayer key={activeVideo.id} video={activeVideo} startsPaused={false} muted enforceViewingQuota />
                        )}
                    </div>

                    {/* Animator Studio Production Quick Bar */}
                    <div className="mt-4 p-3 rounded-2xl bg-zinc-950/70 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-purple-500/15 text-purple-300">
                                <Sparkles className="h-4 w-4" />
                            </span>
                            <div>
                                <h4 className="text-xs font-bold text-white">Animator Production Tools</h4>
                                <p className="text-[11px] text-zinc-400">
                                    Save to any Moodboard to sync straight into Maya &amp; Blender, or compare playblasts side-by-side.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <Link href="/tools" onClick={onClose}>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs font-semibold rounded-lg border-cyan-500/35 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 cursor-pointer"
                                >
                                    <Plug className="h-3.5 w-3.5 mr-1.5 text-cyan-300" />
                                    Get Maya &amp; Blender Plugin
                                </Button>
                            </Link>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCompareClick}
                                className="h-8 text-xs font-semibold rounded-lg border-purple-500/30 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 cursor-pointer"
                            >
                                <Split className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
                                Synchronized Playblast Compare
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleContactSheetClick}
                                className="h-8 text-xs font-semibold rounded-lg border-pink-500/30 bg-pink-500/10 text-pink-200 hover:bg-pink-500/20 cursor-pointer"
                            >
                                <LayoutGrid className="h-3.5 w-3.5 mr-1.5 text-pink-400" />
                                Keyframe Breakdown Sheet
                            </Button>
                        </div>
                    </div>

                    {/* Up Next Binge Filmstrip */}
                    {upNextVideos.length > 0 && (
                        <section aria-label="Up Next References" className="mt-5 space-y-2.5">
                            <div className="flex items-center justify-between gap-2 px-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-violet-300">Up Next</span>
                                    <span className="text-[11px] text-zinc-500">Press J / K or Shift + ← / → to flip clips</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => selectPlaylistVideo(nextVideo)}
                                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-zinc-200 hover:border-violet-400/40 hover:bg-violet-500/20 hover:text-white transition cursor-pointer"
                                >
                                    <span>Next Clip</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [overscroll-behavior-x:contain] touch-manipulation [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {upNextVideos.map((item) => {
                                    const thumb = item.thumbnailUrl || item.posterUrl;
                                    const label = item.status === 'draft' ? 'Reference' : (item.title || 'Reference');
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => selectPlaylistVideo(item)}
                                            className="group relative shrink-0 w-44 sm:w-52 snap-start overflow-hidden rounded-xl border border-white/10 bg-[#120f1e] text-left transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-violet-400/60 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 cursor-pointer"
                                        >
                                            <div className="relative aspect-video w-full bg-black overflow-hidden">
                                                {thumb ? (
                                                    <img
                                                        src={thumb}
                                                        alt={label}
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer"
                                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-violet-950/40">
                                                        <Play className="h-5 w-5 text-violet-300" />
                                                    </div>
                                                )}
                                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                                                <span className="pointer-events-none absolute bottom-1.5 left-2 right-2 truncate text-[11px] font-bold text-white drop-shadow">
                                                    {label}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    <div className="px-1 pb-2 pt-5">
                        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{activeTitle}</h2>
                        {activeDescription && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">{activeDescription}</p>}
                        {activeVideo.tags && activeVideo.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {activeVideo.tags.slice(0, 8).map(tag => (
                                    <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400">#{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modals */}
            <SideBySideCompareModal
                open={showCompareModal}
                onOpenChange={setShowCompareModal}
                referenceVideo={activeVideo}
            />

            <ContactSheetModal
                open={showContactSheetModal}
                onOpenChange={setShowContactSheetModal}
                video={activeVideo}
                fps={activeVideo.fps || 24}
            />

            <SaveToBoardModal
                open={showSaveModal}
                onOpenChange={setShowSaveModal}
                video={activeVideo}
            />

            <PricingDialog
                open={showPricingDialog}
                onOpenChange={setShowPricingDialog}
            />
        </div>
    );
}
