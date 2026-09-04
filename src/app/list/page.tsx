'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { MoodboardService } from '@/lib/moodboard-service';
import type { Video, Category, Moodboard } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VideoGrid } from '@/components/VideoGrid';
import { CategoryCard } from '@/components/CategoryCard';
import { 
    Bookmark, 
    Heart, 
    Layers, 
    Search, 
    Plus, 
    FolderPlus, 
    Sparkles, 
    Film, 
    Grid, 
    Trash2, 
    ExternalLink, 
    ArrowRight, 
    Loader2, 
    LayoutGrid,
    Clock,
    Pencil
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LOCAL_STORAGE_BOARDS_KEY = 'animation_ref_local_moodboards';

export default function CreativeCMSListPage() {
    const { user } = useAuth();
    const { userProfile, mutate } = useUser();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState<'all' | 'liked' | 'categories' | 'boards'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Data States
    const [likedVideos, setLikedVideos] = useState<Video[]>([]);
    const [savedCategories, setSavedCategories] = useState<Category[]>([]);
    const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
    const [editingBoard, setEditingBoard] = useState<{ id: string; name: string } | null>(null);

    const handleRenameBoard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBoard || !editingBoard.name.trim()) return;

        try {
            if (user?.uid) {
                await MoodboardService.updateMoodboardName(user.uid, editingBoard.id, editingBoard.name.trim());
            } else {
                const stored = localStorage.getItem(LOCAL_STORAGE_BOARDS_KEY);
                let localBoards = stored ? JSON.parse(stored) : [];
                localBoards = localBoards.map((b: any) => b.id === editingBoard.id ? { ...b, name: editingBoard.name.trim() } : b);
                localStorage.setItem(LOCAL_STORAGE_BOARDS_KEY, JSON.stringify(localBoards));
            }
            setMoodboards(prev => prev.map(b => b.id === editingBoard.id ? { ...b, name: editingBoard.name.trim() } : b));
            toast({ title: "Board Renamed", description: `Renamed to "${editingBoard.name.trim()}"` });
            setEditingBoard(null);
        } catch (err) {
            console.error("Failed to rename board:", err);
            toast({ variant: "destructive", title: "Could not rename board" });
        }
    };

    // Fetch User Liked Videos, Categories, and Moodboards
    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Liked Videos
                const videoIds = userProfile?.likedVideoIds || [];
                if (videoIds.length > 0) {
                    const chunks: Video[] = [];
                    for (let i = 0; i < videoIds.length; i += 30) {
                        const slice = videoIds.slice(i, i + 30);
                        const q = query(collection(db, 'videos'), where(documentId(), 'in', slice));
                        const snap = await getDocs(q);
                        snap.docs.forEach(d => chunks.push({ id: d.id, ...d.data() } as Video));
                    }
                    setLikedVideos(chunks);
                } else {
                    setLikedVideos([]);
                }

                // 2. Fetch Saved Categories
                const categoryIds = userProfile?.likedCategoryIds || [];
                if (categoryIds.length > 0) {
                    const q = query(collection(db, 'categories'), where(documentId(), 'in', categoryIds));
                    const snap = await getDocs(q);
                    setSavedCategories(snap.docs.map(d => ({ id: d.id, href: `/categories?category=${d.id}`, ...d.data() } as Category)));
                } else {
                    setSavedCategories([]);
                }

                // 3. Fetch Moodboards (Firestore or LocalStorage fallback)
                if (user?.uid) {
                    const mbs = await MoodboardService.getMoodboards(user.uid);
                    setMoodboards(mbs);
                } else {
                    const stored = localStorage.getItem(LOCAL_STORAGE_BOARDS_KEY);
                    if (stored) {
                        const local: any[] = JSON.parse(stored);
                        setMoodboards(local.map(l => ({
                            id: l.id,
                            userId: 'local',
                            name: l.name,
                            items: (l.videoIds || []).map((vid: string) => ({ id: vid, type: 'video', videoId: vid })),
                            updatedAt: new Date()
                        })));
                    } else {
                        setMoodboards([]);
                    }
                }
            } catch (err) {
                console.error("Failed to load CMS data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [user, userProfile]);

    // Create New Moodboard
    const handleCreateBoard = async () => {
        const boardName = prompt("Enter a name for your new moodboard:", "New Reference Board");
        if (!boardName || !boardName.trim()) return;

        try {
            if (user?.uid) {
                const newId = await MoodboardService.createMoodboard(user.uid, boardName.trim());
                toast({ title: "Board Created!", description: `Created "${boardName.trim()}"` });
                window.location.href = `/moodboard?board=${newId}`;
            } else {
                const newId = `mb-${Date.now()}`;
                const stored = localStorage.getItem(LOCAL_STORAGE_BOARDS_KEY);
                const local = stored ? JSON.parse(stored) : [];
                local.push({ id: newId, name: boardName.trim(), videoIds: [] });
                localStorage.setItem(LOCAL_STORAGE_BOARDS_KEY, JSON.stringify(local));
                toast({ title: "Board Created!", description: `Created "${boardName.trim()}"` });
                window.location.href = `/moodboard?board=${newId}`;
            }
        } catch (err) {
            console.error("Failed to create board:", err);
            toast({ variant: 'destructive', title: "Could not create moodboard" });
        }
    };

    // Filter Items by Search Query
    const q = searchQuery.toLowerCase().trim();
    const filteredVideos = useMemo(() => {
        if (!q) return likedVideos;
        return likedVideos.filter(v => (v.title + v.description + (v.tags || []).join(' ')).toLowerCase().includes(q));
    }, [likedVideos, q]);

    const filteredCategories = useMemo(() => {
        if (!q) return savedCategories;
        return savedCategories.filter(c => (c.title + (c.description || '')).toLowerCase().includes(q));
    }, [savedCategories, q]);

    const filteredBoards = useMemo(() => {
        if (!q) return moodboards;
        return moodboards.filter(b => b.name.toLowerCase().includes(q));
    }, [moodboards, q]);

    return (
        <div className="min-h-screen bg-transparent text-white p-4 md:p-8 max-w-[1800px] mx-auto space-y-8 pb-24">
            
            {/* Header & Quick Action Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="space-y-2 relative z-10 text-left">
                    <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-950/80 border border-purple-800/40 text-purple-300 text-xs font-bold shadow-md">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Creative CMS Vault</span>
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                        My Lists & Moodboards
                    </h1>

                    <p className="text-sm md:text-base text-zinc-400 max-w-2xl font-medium leading-relaxed">
                        Your personal animation reference workspace. Organize saved clips, bookmarked categories, and interactive moodboards for shot breakdowns.
                    </p>
                </div>

                {/* Actions: Search & Create Moodboard */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto relative z-10">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                            type="text"
                            placeholder="Search your lists..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/60 border-white/15 text-white placeholder:text-zinc-500 rounded-2xl pl-10 h-11 text-xs"
                        />
                    </div>

                    <Button
                        type="button"
                        onClick={handleCreateBoard}
                        className="h-11 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs gap-2 shadow-lg shadow-purple-600/30 cursor-pointer hover:scale-105 transition-all shrink-0"
                    >
                        <FolderPlus className="h-4 w-4" />
                        New Moodboard
                    </Button>
                </div>
            </div>

            {/* Filter Tabs (Creative CMS Filter Bar) */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                    {[
                        { id: 'all', label: 'All Saved Items', icon: LayoutGrid, count: likedVideos.length + savedCategories.length + moodboards.length },
                        { id: 'liked', label: 'Liked Clips', icon: Heart, count: likedVideos.length },
                        { id: 'categories', label: 'Saved Categories', icon: Layers, count: savedCategories.length },
                        { id: 'boards', label: 'My Moodboards', icon: Bookmark, count: moodboards.length },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                type="button"
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 border shadow-md",
                                    isActive
                                        ? "bg-white text-black border-white shadow-white/10 scale-105"
                                        : "bg-zinc-900/60 text-zinc-400 border-white/10 hover:bg-zinc-800 hover:text-white"
                                )}
                            >
                                <Icon className={cn("h-4 w-4", isActive ? "text-black" : "text-purple-400")} />
                                <span>{tab.label}</span>
                                <Badge variant="outline" className={cn("font-mono text-[10px] px-1.5 py-0 rounded-full", isActive ? "bg-black text-white border-black" : "bg-black/60 text-zinc-300 border-white/10")}>
                                    {tab.count}
                                </Badge>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="py-20 text-center text-zinc-500 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                    <p className="text-sm font-semibold">Loading your creative workspace...</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {/* 1. MY MOODBOARDS SECTION */}
                    {(activeTab === 'all' || activeTab === 'boards') && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Bookmark className="h-5 w-5 text-amber-400 fill-amber-400/20" />
                                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Interactive Moodboards</h2>
                                    <Badge variant="outline" className="bg-amber-950/60 text-amber-300 border-amber-800/40 text-xs font-bold">
                                        {filteredBoards.length} Boards
                                    </Badge>
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleCreateBoard}
                                    className="text-xs font-bold text-purple-400 hover:text-purple-300 cursor-pointer"
                                >
                                    + Create Board
                                </Button>
                            </div>

                            {filteredBoards.length === 0 ? (
                                <div className="py-12 text-center bg-zinc-900/40 rounded-3xl border border-white/10 p-8 space-y-3">
                                    <Bookmark className="h-10 w-10 text-zinc-600 mx-auto" />
                                    <p className="text-base font-bold text-white">No moodboards created yet</p>
                                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                                        Click "+ New Moodboard" or use the "Save" button on any video clip to organize your reference shots.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filteredBoards.map((board) => (
                                        <Link
                                            key={board.id}
                                            href={`/moodboard?board=${board.id}`}
                                            className="group relative aspect-[16/10] rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-br from-purple-950/60 via-zinc-950 to-black p-5 shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-purple-500/80 hover:shadow-[0_0_35px_-5px_rgba(168,85,247,0.4)] cursor-pointer flex flex-col justify-between"
                                        >
                                            {board.thumbnailUrl && (
                                                <img
                                                    src={board.thumbnailUrl}
                                                    alt={board.name}
                                                    className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity"
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />

                                            <div className="relative z-20 flex items-center justify-between">
                                                <span className="px-2.5 py-0.5 rounded-full bg-purple-900/80 border border-purple-700/50 text-purple-200 font-mono text-[10px] font-bold shadow-md">
                                                    {(board.items || []).length} ITEMS
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setEditingBoard({ id: board.id, name: board.name });
                                                        }}
                                                        className="p-1.5 rounded-full bg-black/40 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors"
                                                        title="Rename Moodboard"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <ExternalLink className="h-4 w-4 text-zinc-400 group-hover:text-purple-300 transition-colors" />
                                                </div>
                                            </div>

                                            <div className="relative z-20 text-left space-y-1">
                                                <h3 className="text-lg font-black text-white group-hover:text-purple-300 transition-colors leading-tight">
                                                    {board.name}
                                                </h3>
                                                <p className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    <span>Open Canvas Board</span>
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 2. SAVED CATEGORIES SECTION */}
                    {(activeTab === 'all' || activeTab === 'categories') && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Layers className="h-5 w-5 text-cyan-400" />
                                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Saved Categories & Topics</h2>
                                <Badge variant="outline" className="bg-cyan-950/60 text-cyan-300 border-cyan-800/40 text-xs font-bold">
                                    {filteredCategories.length} Channels
                                </Badge>
                            </div>

                            {filteredCategories.length === 0 ? (
                                <div className="py-12 text-center bg-zinc-900/40 rounded-3xl border border-white/10 p-8 space-y-3">
                                    <Layers className="h-10 w-10 text-zinc-600 mx-auto" />
                                    <p className="text-base font-bold text-white">No categories saved yet</p>
                                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                                        Explore the Categories Directory and hit "Favorite" on any topic to bookmark it here.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {filteredCategories.map((cat) => (
                                        <CategoryCard key={cat.id} {...cat} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. LIKED VIDEOS SECTION */}
                    {(activeTab === 'all' || activeTab === 'liked') && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Heart className="h-5 w-5 text-rose-400 fill-rose-500/20" />
                                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Liked Animation References</h2>
                                <Badge variant="outline" className="bg-rose-950/60 text-rose-300 border-rose-800/40 text-xs font-bold">
                                    {filteredVideos.length} Clips
                                </Badge>
                            </div>

                            {filteredVideos.length === 0 ? (
                                <div className="py-12 text-center bg-zinc-900/40 rounded-3xl border border-white/10 p-8 space-y-3">
                                    <Heart className="h-10 w-10 text-zinc-600 mx-auto" />
                                    <p className="text-base font-bold text-white">No liked videos yet</p>
                                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                                        Explore the reference feed and hit ♥ on any clip to save it to your personal vault.
                                    </p>
                                </div>
                            ) : (
                                <VideoGrid title="" videos={filteredVideos} columns={4} />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Rename Moodboard Dialog */}
            <Dialog open={Boolean(editingBoard)} onOpenChange={(open) => { if (!open) setEditingBoard(null); }}>
                <DialogContent className="sm:max-w-md bg-zinc-950 border border-white/10 text-white rounded-2xl p-6 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Rename Moodboard</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleRenameBoard} className="space-y-4 mt-2">
                        <Input
                            autoFocus
                            value={editingBoard?.name || ''}
                            onChange={(e) => setEditingBoard(prev => prev ? { ...prev, name: e.target.value } : null)}
                            placeholder="Moodboard name"
                            className="bg-black/60 border-white/15 text-white h-10 rounded-xl"
                        />
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setEditingBoard(null)} className="rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl">
                                Save Name
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
