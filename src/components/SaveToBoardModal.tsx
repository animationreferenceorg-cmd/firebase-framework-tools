'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Plus, Check, FolderPlus, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { MoodboardService } from '@/lib/moodboard-service';
import type { Video, Moodboard, MoodboardItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SaveToBoardModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    video: Video;
}

const LOCAL_STORAGE_BOARDS_KEY = 'animation_ref_local_moodboards';

interface LocalBoard {
    id: string;
    name: string;
    videoIds: string[];
    thumbnailUrl?: string;
}

export function SaveToBoardModal({ open, onOpenChange, video }: SaveToBoardModalProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [boards, setBoards] = useState<Array<{ id: string; name: string; hasVideo: boolean; items?: MoodboardItem[] }>>([]);
    const [loading, setLoading] = useState(true);
    const [newBoardName, setNewBoardName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateInput, setShowCreateInput] = useState(false);

    // Fetch Moodboards (Firestore for auth users, LocalStorage fallback)
    useEffect(() => {
        if (!open || !video) return;

        const loadBoards = async () => {
            setLoading(true);
            try {
                if (user?.uid) {
                    // Fetch Firestore boards
                    const userBoards = await MoodboardService.getMoodboards(user.uid);
                    const formatted = userBoards.map((b) => {
                        const hasVideo = (b.items || []).some(
                            (item) => item.videoId === video.id || item.videoData?.id === video.id
                        );
                        return {
                            id: b.id,
                            name: b.name || 'Untitled Moodboard',
                            hasVideo,
                            items: b.items || [],
                        };
                    });
                    setBoards(formatted);
                } else {
                    // LocalStorage boards
                    const stored = localStorage.getItem(LOCAL_STORAGE_BOARDS_KEY);
                    const localBoards: LocalBoard[] = stored ? JSON.parse(stored) : [
                        { id: 'mb-default-1', name: 'Body Mechanics', videoIds: [] },
                        { id: 'mb-default-2', name: 'Acting & Expression', videoIds: [] },
                    ];

                    setBoards(
                        localBoards.map((lb) => ({
                            id: lb.id,
                            name: lb.name,
                            hasVideo: lb.videoIds.includes(video.id),
                        }))
                    );
                }
            } catch (err) {
                console.error('Failed to load moodboards:', err);
            } finally {
                setLoading(false);
            }
        };

        loadBoards();
    }, [open, video, user]);

    // Toggle video in a moodboard
    const toggleBoardSave = async (boardId: string, currentHasVideo: boolean, boardName: string) => {
        try {
            if (user?.uid) {
                // Firestore save
                const items = await MoodboardService.loadMoodboard(user.uid, boardId) || [];
                let updatedItems: MoodboardItem[] = [];

                if (currentHasVideo) {
                    // Remove video
                    updatedItems = items.filter(
                        (i) => i.videoId !== video.id && i.videoData?.id !== video.id
                    );
                    toast({ title: 'Removed from board', description: `Removed from "${boardName}"` });
                } else {
                    // Add video item
                    const newItem: MoodboardItem = {
                        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                        type: 'video',
                        videoId: video.id,
                        videoData: video,
                        imageUrl: video.thumbnailUrl || video.posterUrl || '',
                        x: Math.floor(Math.random() * 200),
                        y: Math.floor(Math.random() * 200),
                        width: 320,
                        height: 180,
                    };
                    updatedItems = [...items, newItem];
                    const thumb = video.thumbnailUrl || video.posterUrl || '';
                    await MoodboardService.saveMoodboard(user.uid, boardId, updatedItems, thumb);
                    toast({ title: 'Saved to Board! ✨', description: `Added clip to "${boardName}"` });
                }
            } else {
                // LocalStorage save
                const stored = localStorage.getItem(LOCAL_STORAGE_BOARDS_KEY);
                let localBoards: LocalBoard[] = stored ? JSON.parse(stored) : [];

                localBoards = localBoards.map((b) => {
                    if (b.id === boardId) {
                        const newIds = currentHasVideo
                            ? b.videoIds.filter((id) => id !== video.id)
                            : [...b.videoIds, video.id];
                        return { ...b, videoIds: newIds };
                    }
                    return b;
                });

                localStorage.setItem(LOCAL_STORAGE_BOARDS_KEY, JSON.stringify(localBoards));
                if (currentHasVideo) {
                    toast({ title: 'Removed from board', description: `Removed from "${boardName}"` });
                } else {
                    toast({ title: 'Saved to Board! ✨', description: `Added clip to "${boardName}"` });
                }
            }

            // Update UI state
            setBoards((prev) =>
                prev.map((b) => (b.id === boardId ? { ...b, hasVideo: !currentHasVideo } : b))
            );
        } catch (err) {
            console.error('Failed to toggle moodboard item:', err);
            toast({ variant: 'destructive', title: 'Error saving to board' });
        }
    };

    // Create New Moodboard
    const handleCreateBoard = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newBoardName.trim();
        if (!trimmed) return;

        setIsCreating(true);
        try {
            if (user?.uid) {
                const newId = await MoodboardService.createMoodboard(user.uid, trimmed);
                // Add initial video to new board
                const newItem: MoodboardItem = {
                    id: `item-${Date.now()}`,
                    type: 'video',
                    videoId: video.id,
                    videoData: video,
                    imageUrl: video.thumbnailUrl || video.posterUrl || '',
                    x: 50,
                    y: 50,
                    width: 320,
                    height: 180,
                };
                await MoodboardService.saveMoodboard(user.uid, newId, [newItem], video.thumbnailUrl || video.posterUrl);

                setBoards((prev) => [...prev, { id: newId, name: trimmed, hasVideo: true }]);
            } else {
                const newId = `mb-${Date.now()}`;
                const stored = localStorage.getItem(LOCAL_STORAGE_BOARDS_KEY);
                const localBoards: LocalBoard[] = stored ? JSON.parse(stored) : [];

                const updated = [...localBoards, { id: newId, name: trimmed, videoIds: [video.id] }];
                localStorage.setItem(LOCAL_STORAGE_BOARDS_KEY, JSON.stringify(updated));

                setBoards((prev) => [...prev, { id: newId, name: trimmed, hasVideo: true }]);
            }

            toast({ title: 'Board Created & Saved!', description: `Created "${trimmed}" and saved clip.` });
            setNewBoardName('');
            setShowCreateInput(false);
        } catch (err) {
            console.error('Failed to create board:', err);
            toast({ variant: 'destructive', title: 'Could not create moodboard' });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950/95 backdrop-blur-2xl border border-white/10 text-white rounded-3xl p-6 shadow-2xl">
                <DialogHeader className="text-left space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                            <Bookmark className="h-4 w-4 fill-purple-400 text-purple-400" />
                        </div>
                        <DialogTitle className="text-xl font-black text-white tracking-tight">Save to Moodboard</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-zinc-400">
                        Organize your animation reference clips into custom moodboards for shot studying.
                    </DialogDescription>
                </DialogHeader>

                {/* Video Preview Card */}
                {video && (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/80 border border-white/10 my-2">
                        <div className="relative h-14 w-20 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                            {video.thumbnailUrl || video.posterUrl ? (
                                <img
                                    src={video.thumbnailUrl || video.posterUrl}
                                    alt={video.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-purple-950">
                                    <ImageIcon className="h-5 w-5 text-purple-400" />
                                </div>
                            )}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{video.title}</h4>
                            <p className="text-[11px] text-zinc-400 capitalize">
                                {video.categories?.[0] || 'Animation Reference'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Boards List */}
                <div className="space-y-2 my-2 max-h-[260px] overflow-y-auto pr-1">
                    {loading ? (
                        <div className="py-8 text-center text-zinc-500 flex items-center justify-center gap-2 text-xs font-semibold">
                            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                            <span>Loading your moodboards...</span>
                        </div>
                    ) : boards.length === 0 ? (
                        <div className="py-6 text-center text-zinc-500 text-xs">
                            No moodboards yet. Create your first board below!
                        </div>
                    ) : (
                        boards.map((board) => (
                            <button
                                type="button"
                                key={board.id}
                                onClick={() => toggleBoardSave(board.id, board.hasVideo, board.name)}
                                className={cn(
                                    "w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer text-left group",
                                    board.hasVideo
                                        ? "bg-purple-950/40 border-purple-600/50 text-white"
                                        : "bg-zinc-900/40 border-white/5 text-zinc-300 hover:bg-zinc-900 hover:border-white/15 hover:text-white"
                                )}
                            >
                                <span className="text-sm font-bold truncate group-hover:translate-x-0.5 transition-transform">
                                    {board.name}
                                </span>
                                <div className={cn(
                                    "h-6 w-6 rounded-full flex items-center justify-center transition-all",
                                    board.hasVideo
                                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/50"
                                        : "bg-white/5 border border-white/10 text-transparent group-hover:text-zinc-500"
                                )}>
                                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Create New Board Toggle / Form */}
                <div className="pt-2 border-t border-white/10">
                    {showCreateInput ? (
                        <form onSubmit={handleCreateBoard} className="space-y-3">
                            <Input
                                type="text"
                                placeholder="Moodboard Name (e.g. Walk Cycles, Smears)"
                                value={newBoardName}
                                onChange={(e) => setNewBoardName(e.target.value)}
                                autoFocus
                                className="bg-black/60 border-white/15 text-white placeholder:text-zinc-500 rounded-xl text-xs h-10"
                            />
                            <div className="flex items-center gap-2">
                                <Button
                                    type="submit"
                                    disabled={isCreating || !newBoardName.trim()}
                                    className="flex-1 h-9 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold gap-1 cursor-pointer"
                                >
                                    {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                    Create & Save
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowCreateInput(false)}
                                    className="h-9 px-3 rounded-xl text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowCreateInput(true)}
                            className="w-full h-10 rounded-2xl border-dashed border-white/20 bg-black/40 hover:bg-white/5 text-xs font-bold text-purple-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                            <FolderPlus className="h-4 w-4 text-purple-400" />
                            Create New Moodboard
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
