'use client';

import React, { useState } from 'react';
import { 
    ArrowLeft, 
    ExternalLink, 
    Instagram, 
    Split, 
    LayoutGrid, 
    BookmarkPlus, 
    Sparkles
} from 'lucide-react';
import type { Video } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from '@/components/VideoPlayer';
import { SideBySideCompareModal } from '@/components/reference/SideBySideCompareModal';
import { ContactSheetModal } from '@/components/reference/ContactSheetModal';
import { ProDownloadButton } from '@/components/ProDownloadButton';
import { SaveToBoardModal } from '@/components/SaveToBoardModal';
import { PricingDialog } from '@/components/PricingDialog';
import { useUser } from '@/hooks/use-user';
import { getEntitlements } from '@/lib/plans';
import { useViewingQuota } from '@/hooks/use-viewing-quota';

type VideoFullscreenViewerProps = {
    video: Video;
    title: string;
    description?: string;
    onClose: () => void;
};

export function VideoFullscreenViewer({ video, title, description, onClose }: VideoFullscreenViewerProps) {
    const originalIsInstagram = video.originalUrl?.toLowerCase().includes('instagram.com');
    const { userProfile } = useUser();
    const entitlements = getEntitlements(userProfile);
    const isPro = entitlements.isPro;
    const { unlockedCount, limit, isVideoUnlocked } = useViewingQuota();

    const [showCompareModal, setShowCompareModal] = useState(false);
    const [showContactSheetModal, setShowContactSheetModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showPricingDialog, setShowPricingDialog] = useState(false);

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

    return (
        <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#080611] text-white">
            <header className="relative z-[210] flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0d0a18]/95 px-3 backdrop-blur-xl sm:px-5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="h-10 shrink-0 gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-zinc-200 hover:bg-white/10 hover:text-white cursor-pointer"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Back</span>
                    </Button>

                    <h1 className="min-w-0 truncate text-sm font-semibold text-white sm:text-base">{title}</h1>

                    {!isPro && (
                        <div
                            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300 shrink-0"
                            title="Free plan includes 25 reference unlocks. Previously unlocked clips remain playable anytime."
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                            <span>{unlockedCount}/{limit} Unlocked</span>
                        </div>
                    )}
                </div>

                {/* Studio Tools Header Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <ProDownloadButton videoId={video.id} variant="labeled" className="h-9 px-2.5 sm:px-3" />
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
                        title="Save to reference board"
                    >
                        <BookmarkPlus className="h-4 w-4 text-amber-300" />
                        <span className="hidden md:inline text-xs font-semibold">Save</span>
                    </Button>

                    {video.originalUrl && (
                        <a
                            href={video.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-purple-400/40 hover:bg-purple-500/15 hover:text-white"
                            title="Open original post"
                        >
                            {originalIsInstagram ? <Instagram className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
                            <span className="hidden lg:inline">Source</span>
                        </a>
                    )}
                </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto flex min-h-full w-full max-w-[1500px] flex-col justify-center px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_24px_80px_-24px_rgba(124,58,237,0.45)] sm:rounded-2xl">
                        <VideoPlayer video={video} startsPaused={false} muted />
                    </div>

                    {/* Animator Studio Production Quick Bar */}
                    <div className="mt-4 p-3 rounded-2xl bg-zinc-950/70 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-purple-500/15 text-purple-300">
                                <Sparkles className="h-4 w-4" />
                            </span>
                            <div>
                                <h4 className="text-xs font-bold text-white">Animator Production Tools</h4>
                                <p className="text-[11px] text-zinc-400">Locked sync playblasts and high-resolution keyframe contact sheet breakdowns.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
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

                    <div className="px-1 pb-2 pt-5">
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
            </main>

            {/* Modals */}
            <SideBySideCompareModal
                open={showCompareModal}
                onOpenChange={setShowCompareModal}
                referenceVideo={video}
            />

            <ContactSheetModal
                open={showContactSheetModal}
                onOpenChange={setShowContactSheetModal}
                video={video}
                fps={video.fps || 24}
            />

            <SaveToBoardModal
                open={showSaveModal}
                onOpenChange={setShowSaveModal}
                video={video}
            />

            <PricingDialog
                open={showPricingDialog}
                onOpenChange={setShowPricingDialog}
            />
        </div>
    );
}
