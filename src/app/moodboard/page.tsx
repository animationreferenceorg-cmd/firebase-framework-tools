'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useUser } from '@/hooks/use-user';
import { collection, query, where, documentId, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { MoodboardItemCard } from '@/components/MoodboardItemCard';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoActionsBar } from '@/components/VideoActionsBar';

// --- Components ---

interface DraggableSidebarItemProps {
    video: Video;
    onMaximize?: () => void;
}

function DraggableSidebarItem({ video, onMaximize }: DraggableSidebarItemProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `sidebar-${video.id}`,
        data: { video, type: 'sidebar' },
    });

    return (
        <div ref={setNodeRef} {...listeners} {...attributes} className={`cursor-grab active:cursor-grabbing group relative ${isDragging ? 'opacity-30' : ''}`}>
            {/* Aspect Ratio container handled by MoodboardItemCard or parent grid, here we enforce height/width via the card or wrapper */}
            <div className="aspect-video w-full">
                <MoodboardItemCard video={video} onMaximize={onMaximize} className="w-full h-full shadow-sm hover:shadow-md transition-shadow" />
            </div>
        </div>
    );
}

function CanvasItem({ item, style, onRemove, onMaximize }: { item: MoodboardItem, style: React.CSSProperties, onRemove: () => void, onMaximize: () => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: item.id,
        data: { id: item.id, type: 'canvas', video: item.video },
    });

    const finalStyle: React.CSSProperties = {
        ...style,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        left: item.x,
        top: item.y,
        position: 'absolute',
        opacity: isDragging ? 0 : 1, // Hide original when dragging
    };

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={finalStyle}
            className="w-64 aspect-video shadow-2xl group cursor-move hover:z-50 rounded-xl"
        >
            <MoodboardItemCard
                video={item.video}
                className="w-full h-full rounded-xl border-2 border-purple-500/0 hover:border-purple-500/50 transition-colors"
                onMaximize={onMaximize}
            />

            <button
                onPointerDown={(e) => {
                    e.stopPropagation();
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-red-600"
            >
                <Plus className="h-3 w-3 text-white rotate-45" />
            </button>
        </div>
    )
}

// --- Types ---
interface MoodboardItem {
    id: string;
    video: Video;
    x: number;
    y: number;
}

export default function MoodboardPage() {
    const { userProfile } = useUser();
    const [likedVideos, setLikedVideos] = useState<Video[]>([]);
    const [canvasItems, setCanvasItems] = useState<MoodboardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeDragItem, setActiveDragItem] = useState<Video | null>(null);
    const [expandedVideo, setExpandedVideo] = useState<Video | null>(null);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    const libraryRef = useRef<HTMLDivElement>(null);
    const libraryButtonRef = useRef<HTMLDivElement>(null);

    // Handle Click Outside to Close Library
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (isLibraryOpen &&
                libraryRef.current &&
                !libraryRef.current.contains(event.target as Node) &&
                libraryButtonRef.current &&
                !libraryButtonRef.current.contains(event.target as Node)
            ) {
                setIsLibraryOpen(false);
            }
        }

        document.addEventListener("pointerdown", handleClickOutside, true);
        return () => {
            document.removeEventListener("pointerdown", handleClickOutside, true);
        };
    }, [isLibraryOpen]);

    // Fetch Liked Videos (Optimized)
    useEffect(() => {
        const fetchLiked = async () => {
            const ids = userProfile?.likedVideoIds || [];
            if (ids.length === 0) {
                setLoading(false);
                return;
            }
            const sliceIds = ids.slice(-20); // Increased fetch limit for the grid

            try {
                const q = query(collection(db, "videos"), where(documentId(), 'in', sliceIds));
                const snap = await getDocs(q);
                const videos = snap.docs.map(d => ({ id: d.id, ...d.data() } as Video));
                setLikedVideos(videos);
            } catch (e) {
                console.error("Failed to fetch sidebar videos", e);
            } finally {
                setLoading(false);
            }
        };

        if (userProfile) fetchLiked();
    }, [userProfile]);

    const handleDragStart = (event: DragStartEvent) => {
        const data = event.active.data.current;
        if (data?.video) {
            setActiveDragItem(data.video);
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragItem(null);
        const { active, delta } = event;
        const data = active.data.current;

        if (!data) return;

        if (data.type === 'sidebar') {
            const dropX = (active.rect.current.translated?.left || 0);
            const dropY = active.rect.current.translated?.top || 0;

            const newItem: MoodboardItem = {
                id: `canvas-${Date.now()}`,
                video: data.video,
                x: dropX,
                y: dropY,
            };
            setCanvasItems(prev => [...prev, newItem]);
        }
        else if (data.type === 'canvas') {
            setCanvasItems(prev => prev.map(item => {
                if (item.id === data.id) {
                    return {
                        ...item,
                        x: item.x + delta.x,
                        y: item.y + delta.y
                    };
                }
                return item;
            }));
        }
    };

    // Dnd Sensors with Activation Constraints
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 150,
                tolerance: 5,
            },
        })
    );

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} sensors={sensors}>
            <div className="flex h-screen w-screen bg-[#050505] overflow-hidden text-white relative font-sans">

                {/* Visual Background Grid */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                        backgroundSize: '24px 24px'
                    }}
                />

                {/* Top Bar for Navigation */}
                <div className="absolute top-4 left-4 z-40 flex items-center gap-4">
                    <Link href="/browse">
                        <Button variant="ghost" size="sm" className="bg-black/50 backdrop-blur-md border border-white/10 hover:bg-white/10 text-white rounded-full transition-all hover:scale-105 active:scale-95">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to Browse
                        </Button>
                    </Link>
                </div>

                {/* Canvas Area */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-8 right-12 z-0 text-zinc-900 font-extrabold text-8xl select-none opacity-50 pointer-events-none tracking-tighter">
                        Canvas
                    </div>

                    {canvasItems.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-500 pointer-events-none select-none animate-in fade-in zoom-in duration-500">
                            <div className="text-center space-y-4">
                                <div className="bg-zinc-900/50 p-6 rounded-full inline-block backdrop-blur-sm border border-white/5">
                                    <ImageIcon className="h-12 w-12 mx-auto text-zinc-400" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-medium text-white">Your canvas is empty</p>
                                    <p className="text-sm">Open the Library to start creating</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {canvasItems.map(item => (
                        <CanvasItem
                            key={item.id}
                            item={item}
                            style={{}}
                            onRemove={() => setCanvasItems(prev => prev.filter(i => i.id !== item.id))}
                            onMaximize={() => setExpandedVideo(item.video)}
                        />
                    ))}
                </div>

                {/* Floating Library Button */}
                <div className="absolute bottom-8 left-8 z-50" ref={libraryButtonRef}>
                    <Button
                        onClick={() => setIsLibraryOpen(!isLibraryOpen)}
                        className={`h-14 px-8 rounded-full shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-500 font-medium tracking-wide text-sm
                            ${isLibraryOpen
                                ? 'bg-white text-black hover:bg-zinc-200 scale-100 rotate-0'
                                : 'bg-black/80 text-white backdrop-blur-xl border border-white/10 hover:bg-black hover:scale-105'
                            }`}
                    >
                        {isLibraryOpen ? 'Close Library' : 'Open Library'}
                    </Button>
                </div>

                {/* Floating Library Window */}
                <div
                    ref={libraryRef}
                    className={`absolute bottom-28 left-8 z-40 w-[420px] bg-black/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden transition-all duration-500 origin-bottom-left ease-out
                        ${isLibraryOpen
                            ? 'opacity-100 scale-100 translate-y-0 translate-x-0'
                            : 'opacity-0 scale-90 translate-y-12 -translate-x-12 pointer-events-none'
                        }`}
                    style={{ maxHeight: '600px' }}
                >
                    <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <span className="font-bold text-white text-sm tracking-wide">My Liked Videos</span>
                        <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-1 rounded-full">{likedVideos.length} ITEMS</span>
                    </div>

                    <ScrollArea className="h-[400px] p-5">
                        {loading ? (
                            <div className="grid grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <Skeleton key={i} className="aspect-video w-full rounded-xl bg-white/5" />
                                ))}
                            </div>
                        ) : likedVideos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4 pb-4">
                                {likedVideos.map(video => (
                                    <DraggableSidebarItem
                                        key={video.id}
                                        video={video}
                                        onMaximize={() => setExpandedVideo(video)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[300px] text-zinc-500 text-sm gap-3">
                                <p>No liked videos yet.</p>
                                <Link href="/browse">
                                    <Button variant="outline" size="sm" className="bg-transparent border-white/20 text-white hover:bg-white/10">Browse Videos</Button>
                                </Link>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Full Screen Video Player */}
                <Dialog open={!!expandedVideo} onOpenChange={(open) => !open && setExpandedVideo(null)}>
                    <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none border-0 bg-[#0f0c1d]/40 backdrop-blur-xl overflow-y-auto">
                        <DialogTitle className="sr-only">
                            {expandedVideo?.title || "Full Screen Video Player"}
                        </DialogTitle>

                        {expandedVideo && (
                            <div className="min-h-screen w-full relative">
                                {/* Content Container - Centered like VideoPage */}
                                <main className="container mx-auto px-4 pt-10 pb-12">
                                    <div className="max-w-6xl mx-auto space-y-6">
                                        {/* Back Button */}
                                        <div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setExpandedVideo(null)}
                                                className="rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md h-10 w-10 transition-colors"
                                            >
                                                <ArrowLeft className="h-5 w-5" />
                                            </Button>
                                        </div>

                                        {/* Main Player Container */}
                                        <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-[0_0_50px_-10px_rgba(124,58,237,0.3)] bg-black border border-white/10">
                                            <VideoPlayer video={expandedVideo} muted={false} />
                                            <VideoActionsBar video={expandedVideo} userProfile={userProfile} />
                                        </div>

                                        {/* Meta Info */}
                                        <div className="space-y-4 text-white">
                                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{expandedVideo.title}</h1>
                                            <p className="text-zinc-400 text-lg leading-relaxed max-w-3xl">{expandedVideo.description}</p>

                                            {/* Tags */}
                                            {expandedVideo.tags && expandedVideo.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {expandedVideo.tags.map((tag: string) => (
                                                        <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-zinc-300">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </main>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

            </div>

            {/* Drag Overlay for smooth visuals */}
            <DragOverlay dropAnimation={null} zIndex={100}>
                {activeDragItem ? (
                    <div className="w-64 aspect-video rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-2 border-purple-500 cursor-grabbing bg-black scale-110 opacity-90 z-[100] pointer-events-none ring-4 ring-purple-500/20 overflow-hidden">
                        <MoodboardItemCard video={activeDragItem} className="w-full h-full" />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
