'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bookmark, Plus, Check, FolderPlus, Loader2, Image as ImageIcon, Search, Pencil, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { MoodboardService } from '@/lib/moodboard-service';
import { saveVideo, unsaveVideo } from '@/lib/firestore';
import type { Video, MoodboardItem } from '@/lib/types';
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
    const { userProfile, mutate } = useUser();
    const { toast } = useToast();

    const [boards, setBoards] = useState<Array<{ id: string; name: string; hasVideo: boolean; items?: MoodboardItem[] }>>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [newBoardName, setNewBoardName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateInput, setShowCreateInput] = useState(false);
    
    // Board renaming state
    const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
    const [editingBoardName, setEditingBoardName] = useState('');

    const isAllSaved = Boolean(video && userProfile?.savedVideoIds?.includes(video.id));

    // Fetch Moodboards (Firestore for auth users, LocalStorage fallback)
    useEffect(() => {
        if (!open || !video) return;

        const loadBoards = async () => {
            setLoading(true);
            try {
                if (user?.uid) {
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
                    const stored = localStorage.getItem(LOCAL_STORAGE_BOARDS_KEY);
                    const localBoards: LocalBoard[] = stored ? JSON.parse(stored) : [
                        { id: 'mb-default-1', name: 'Body Mechanics', videoIds: [] },
                        { id: 'mb-default-2', name: 'Acting & Expression', videoIds: [] },
                    ];

                    if (!stored) localStorage.setItem(LOCAL_STORAGE_BOARDS_KEY, JSON.stringify(localBoards));

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

    // Quick toggle for "All Saves"
    const toggleAllSaves = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user?.uid) {
            toast({ variant: 'destructive', title: 'Please sign in', description: 'You need to be signed in to save.' });
            return;
        }

        try {
            if (isAllSaved) {
                await unsaveVideo(user.uid, video.id);
                toast({ title: 'Removed from All Saves', description: video.title });
            } else {
                await saveVideo(user.uid, video.id);
                toast({ title: 'Saved to All Saves! 📌', description: video.title });
            }
            await mutate();
        } catch (err) {
            console.error('Failed to toggle All Saves:', err);
            toast({ variant: 'destructive', title: 'Error updating All Saves' });
        }
    };

    // Toggle video in a moodboard (and automatically ensure it is in All Saves)
    const toggleBoardSave = async (boardId: string, currentHasVideo: boolean, boardName: string) => {
        try {
            if (user?.uid) {
                const items = await MoodboardService.loadMoodboard(user.uid, boardId) || [];
                let updatedItems: MoodboardItem[] = [];

                if (currentHasVideo) {
                    // Remove video from board
                    updatedItems = items.filter(
                        (i) => i.videoId !== video.id && i.videoData?.id !== video.id
                    );
                    await MoodboardService.saveMoodboard(user.uid, boardId, updatedItems);
                    toast({ title: 'Removed from board', description: `Removed from "${boardName}"` });
                } else {
                    // Add video item to board
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

                    // All saves also save to all saves
                    if (!isAllSaved) {
                        await saveVideo(user.uid, video.id);
                        await mutate();
                    }

                    toast({ title: 'Saved to Board & All Saves! ✨', description: `Added to "${boardName}"` });
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
                    toast({ title: 'Saved to Board! ✨', description: `Added to "${boardName}"` });
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

    // Save renamed board
    const handleRenameBoard = async (boardId: string, e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const trimmed = editingBoardName.trim();
        if (!trimmed) {
            setEditingBoardId(null);
            return;
        }

        try {
            if (user?.uid) {
                await MoodboardService.updateMoodboardName(user.uid, boardId, trimmed);
            } else {
                const stored = localStorage.getItem(LOCAL_STORAGE_BOARDS_KEY);
                let localBoards: LocalBoard[] = stored ? JSON.parse(stored) : [];
                localBoards = localBoards.map((b) => b.id === boardId ? { ...b, name: trimmed } : b);
                localStorage.setItem(LOCAL_STORAGE_BOARDS_KEY, JSON.stringify(localBoards));
            }
            setBoards((prev) => prev.map((b) => b.id === boardId ? { ...b, name: trimmed } : b));
            toast({ title: 'Board Renamed', description: `Renamed to "${trimmed}"` });
        } catch (err) {
            console.error('Failed to rename board:', err);
            toast({ variant: 'destructive', title: 'Could not rename board' });
        } finally {
            setEditingBoardId(null);
        }
    };

    // Create New Moodboard (and automatically add to board and All Saves)
    const handleCreateBoard = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newBoardName.trim();
        if (!trimmed) return;

        setIsCreating(true);
        try {
            if (user?.uid) {
                const newId = await MoodboardService.createMoodboard(user.uid, trimmed);
                // Add video to new board
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

                // All saves also save to all saves
                if (!isAllSaved) {
                    await saveVideo(user.uid, video.id);
                    await mutate();
                }

                setBoards((prev) => [...prev, { id: newId, name: trimmed, hasVideo: true }]);
            } else {
                const newId = `mb-${Date.now()}`;
                const stored = localStorage.getItem(LOCAL_STORAGE_BOARDS_KEY);
                const localBoards: LocalBoard[] = stored ? JSON.parse(stored) : [];

                const updated = [...localBoards, { id: newId, name: trimmed, videoIds: [video.id] }];
                localStorage.setItem(LOCAL_STORAGE_BOARDS_KEY, JSON.stringify(updated));

                setBoards((prev) => [...prev, { id: newId, name: trimmed, hasVideo: true }]);
            }

            toast({ title: 'Board Created & Saved! ✨', description: `Created "${trimmed}" and saved clip.` });
            setNewBoardName('');
            setShowCreateInput(false);
        } catch (err) {
            console.error('Failed to create board:', err);
            toast({ variant: 'destructive', title: 'Could not create moodboard' });
        } finally {
            setIsCreating(false);
        }
    };

    const filteredBoards = boards.filter((b) =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950/95 backdrop-blur-2xl border border-white/10 text-white rounded-3xl p-6 shadow-2xl">
                <DialogHeader className="text-left space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                            <Bookmark className="h-4 w-4 fill-purple-400 text-purple-400" />
                        </div>
                        <DialogTitle className="text-xl font-black text-white tracking-tight">Save Reference</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-zinc-400">
                        Save to your boards or All Saves. All board saves automatically save to your library.
                    </DialogDescription>
                </DialogHeader>

                {/* Video Preview Card */}
                {video && (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/80 border border-white/10 my-1">
                        <div className="relative h-12 w-18 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                            {video.thumbnailUrl || video.posterUrl ? (
                                <img
                                    src={video.thumbnailUrl || video.posterUrl}
                                    alt={video.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-purple-950">
                                    <ImageIcon className="h-4 w-4 text-purple-400" />
                                </div>
                            )}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{video.title}</h4>
                            <p className="text-[10px] text-zinc-400 capitalize">
                                {video.categories?.[0] || 'Animation Reference'}
                            </p>
                        </div>
                    </div>
                )}

                {/* All Saves Option (Quick Save) */}
                <div className="pt-1 pb-1">
                    <button
                        type="button"
                        onClick={toggleAllSaves}
                        className={cn(
                            "w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer text-left group",
                            isAllSaved
                                ? "bg-amber-950/30 border-amber-500/40 text-white"
                                : "bg-zinc-900/40 border-white/5 text-zinc-300 hover:bg-zinc-900 hover:border-white/15 hover:text-white"
                        )}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                                "h-8 w-8 rounded-xl flex items-center justify-center transition-all shrink-0",
                                isAllSaved
                                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/30"
                                    : "bg-white/10 text-amber-400 group-hover:bg-amber-500/20"
                            )}>
                                <Bookmark className={cn("h-4 w-4", isAllSaved ? "fill-black text-black" : "fill-amber-400/20 text-amber-400")} />
                            </div>
                            <div className="min-w-0">
                                <span className="text-xs font-bold block truncate">All Saves (Library Vault)</span>
                                <span className="text-[10px] text-zinc-400">Master saved collection</span>
                            </div>
                        </div>
                        <div className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center transition-all shrink-0 ml-2",
                            isAllSaved
                                ? "bg-amber-500 text-black shadow-md shadow-amber-500/40"
                                : "bg-white/5 border border-white/10 text-transparent group-hover:text-zinc-500"
                        )}>
                            <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                    </button>
                </div>

                {/* Search boards input (if 3+ boards) */}
                {boards.length >= 3 && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                        <Input
                            type="text"
                            placeholder="Filter your moodboards..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-zinc-900/60 border-white/10 pl-8 text-xs h-8 rounded-xl placeholder:text-zinc-500"
                        />
                    </div>
                )}

                {/* Boards List */}
                <div className="space-y-1.5 my-1 max-h-[220px] overflow-y-auto pr-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1 pt-1">
                        Moodboards ({boards.length})
                    </p>

                    {loading ? (
                        <div className="py-6 text-center text-zinc-500 flex items-center justify-center gap-2 text-xs font-semibold">
                            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                            <span>Loading moodboards...</span>
                        </div>
                    ) : boards.length === 0 ? (
                        <div className="py-5 text-center text-zinc-500 text-xs border border-dashed border-white/10 rounded-2xl">
                            No moodboards yet. Create your first board below!
                        </div>
                    ) : filteredBoards.length === 0 ? (
                        <div className="py-4 text-center text-zinc-500 text-xs">
                            No moodboards match "{searchQuery}".
                        </div>
                    ) : (
                        filteredBoards.map((board) => (
                            <div
                                key={board.id}
                                className={cn(
                                    "w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all group",
                                    board.hasVideo
                                        ? "bg-purple-950/30 border-purple-600/40 text-white"
                                        : "bg-zinc-900/40 border-white/5 text-zinc-300 hover:bg-zinc-900 hover:border-white/15 hover:text-white"
                                )}
                            >
                                {editingBoardId === board.id ? (
                                    <form
                                        onSubmit={(e) => handleRenameBoard(board.id, e)}
                                        className="flex-1 flex items-center gap-1 mr-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Input
                                            autoFocus
                                            value={editingBoardName}
                                            onChange={(e) => setEditingBoardName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') setEditingBoardId(null);
                                            }}
                                            className="h-7 text-xs bg-black/60 border-purple-500/50 rounded-lg px-2 text-white"
                                        />
                                        <Button
                                            type="submit"
                                            size="sm"
                                            className="h-7 px-2 bg-purple-600 hover:bg-purple-500 text-[10px] rounded-lg"
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingBoardId(null)}
                                            className="h-7 px-1 text-zinc-400 hover:text-white"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </form>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => toggleBoardSave(board.id, board.hasVideo, board.name)}
                                        className="flex-1 flex items-center justify-between text-left cursor-pointer min-w-0 mr-1"
                                    >
                                        <span className="text-xs font-bold truncate">
                                            {board.name}
                                        </span>
                                    </button>
                                )}

                                <div className="flex items-center gap-1 shrink-0">
                                    {editingBoardId !== board.id && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingBoardId(board.id);
                                                setEditingBoardName(board.name);
                                            }}
                                            title="Rename board"
                                            className="h-6 w-6 rounded-lg flex items-center justify-center text-zinc-500 hover:text-purple-300 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => toggleBoardSave(board.id, board.hasVideo, board.name)}
                                        className={cn(
                                            "h-6 w-6 rounded-full flex items-center justify-center transition-all cursor-pointer",
                                            board.hasVideo
                                                ? "bg-purple-600 text-white shadow-md shadow-purple-600/50"
                                                : "bg-white/5 border border-white/10 text-transparent group-hover:text-zinc-500"
                                        )}
                                    >
                                        <Check className="h-3 w-3 stroke-[3]" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Create New Board Toggle / Form */}
                <div className="pt-2 border-t border-white/10">
                    {showCreateInput ? (
                        <form onSubmit={handleCreateBoard} className="space-y-2.5">
                            <Input
                                type="text"
                                placeholder="Moodboard Name (e.g. Walk Cycles, Smears)"
                                value={newBoardName}
                                onChange={(e) => setNewBoardName(e.target.value)}
                                autoFocus
                                className="bg-black/60 border-white/15 text-white placeholder:text-zinc-500 rounded-xl text-xs h-9"
                            />
                            <div className="flex items-center gap-2">
                                <Button
                                    type="submit"
                                    disabled={isCreating || !newBoardName.trim()}
                                    className="flex-1 h-8 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold gap-1 cursor-pointer"
                                >
                                    {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                    Create & Save
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowCreateInput(false)}
                                    className="h-8 px-3 rounded-xl text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
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
                            className="w-full h-9 rounded-2xl border-dashed border-white/20 bg-black/40 hover:bg-white/5 text-xs font-bold text-purple-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
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
