'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragStartEvent, DragMoveEvent, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useUser } from '@/hooks/use-user';
import { collection, query, where, documentId, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video, LocalImage, Moodboard, MoodboardItem } from '@/lib/types';
import type { MoodboardItem as PersistentMoodboardItem } from '@/lib/types'; // Alias if needed, or just use MoodboardItem


import { MoodboardDB } from '@/lib/moodboard-db';
import { MoodboardService } from '@/lib/moodboard-service';


import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus, Image as ImageIcon, ArrowLeft, LayoutGrid, Trash2, Layout } from 'lucide-react';

import Link from 'next/link';
import Image from 'next/image';
import { MoodboardItemCard } from '@/components/MoodboardItemCard';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoActionsBar } from '@/components/VideoActionsBar';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreHorizontal } from "lucide-react";
import { DraggableCanvasItem } from './types';
import { CanvasItem } from './components/CanvasItem';
import { DraggableSidebarItem } from './components/DraggableSidebarItem';
import { useMoodboardInteraction } from './hooks/useMoodboardInteraction';
import { toPng } from 'html-to-image';
import { checkLimit } from '@/lib/limits';
import { LimitReachedDialog } from '@/components/LimitReachedDialog';
import { DonateDialog } from '@/components/DonateDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth'; // Assuming this import is needed for useAuth
import { useParams, useRouter } from 'next/navigation'; // Assuming these imports are needed for useParams and useRouter




export default function MoodboardPage() {
    const { user } = useAuth();
    const { userProfile } = useUser();
    const { board_id } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [showLimitDialog, setShowLimitDialog] = useState(false);
    const [showDonateDialog, setShowDonateDialog] = useState(false);
    const [likedVideos, setLikedVideos] = useState<Video[]>([]);
    const [canvasItems, setCanvasItems] = useState<DraggableCanvasItem[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

    // Multi-board State
    const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
    const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
    const [isLoadingBoards, setIsLoadingBoards] = useState(true);
    const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
    const [tempName, setTempName] = useState("");

    const [loading, setLoading] = useState(true);

    const [activeDragItem, setActiveDragItem] = useState<DraggableCanvasItem | Video | LocalImage | null>(null);
    const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });

    const [expandedVideo, setExpandedVideo] = useState<Video | LocalImage | null>(null);

    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    const libraryRef = useRef<HTMLDivElement>(null);
    const libraryButtonRef = useRef<HTMLDivElement>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, visible: boolean }>({ x: 0, y: 0, visible: false });
    const canvasRef = useRef<HTMLDivElement>(null);



    // Non-passive Wheel Listener (to prevent default scroll)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheelValues = (e: WheelEvent) => {
            if (currentBoardId) {
                e.preventDefault(); // Stop page scroll
                const ZOOM_SPEED = 0.001;
                setViewport(prev => {
                    const newScale = Math.min(Math.max(0.1, prev.scale - e.deltaY * ZOOM_SPEED), 5);
                    return { ...prev, scale: newScale };
                });
            }
        };

        // Add non-passive listener
        canvas.addEventListener('wheel', handleWheelValues, { passive: false });
        return () => {
            canvas.removeEventListener('wheel', handleWheelValues);
        };
    }, [currentBoardId]); // Re-bind if board changes (or just on mount/ref change)


    // Handle Click Outside to Close Library & Context Menu
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            // Close Library
            if (isLibraryOpen &&
                libraryRef.current &&
                !libraryRef.current.contains(event.target as Node) &&
                libraryButtonRef.current &&
                !libraryButtonRef.current.contains(event.target as Node)
            ) {
                setIsLibraryOpen(false);
            }

            // Close Context Menu on click outside
            if (contextMenu.visible) {
                const menu = document.getElementById('context-menu-container');
                if (menu && menu.contains(event.target as Node)) {
                    return;
                }
                setContextMenu(prev => ({ ...prev, visible: false }));
            }
        }

        document.addEventListener("pointerdown", handleClickOutside, true);
        return () => {
            document.removeEventListener("pointerdown", handleClickOutside, true);
        };
    }, [isLibraryOpen, contextMenu.visible]);

    // Context Menu Handler
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            visible: true
        });
    };

    // Load User's Moodboards
    useEffect(() => {
        if (!userProfile?.uid) return;

        const loadBoards = async () => {
            setIsLoadingBoards(true);
            try {
                const boards = await MoodboardService.getMoodboards(userProfile.uid);
                setMoodboards(boards);
            } catch (e) {
                console.error("Failed to load moodboards", e);
            } finally {
                setIsLoadingBoards(false);
            }
        };
        loadBoards();
    }, [userProfile?.uid, currentBoardId]); // Reload when switching back to dashboard (implicitly)

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

    // Load Moodboard Items when a board is selected
    useEffect(() => {
        if (!userProfile?.uid || !currentBoardId) {
            setCanvasItems([]); // Clear canvas when no board selected
            return;
        }

        const loadBoardItems = async () => {
            setLoading(true); // Reuse loading state or create a specific one
            try {
                const items = await MoodboardService.loadMoodboard(userProfile.uid, currentBoardId);
                if (items) {
                    const mappedItems: DraggableCanvasItem[] = items.map(item => ({
                        id: item.id,
                        x: item.x,
                        y: item.y,
                        type: item.type as 'image' | 'video' | 'note', // Map type
                        text: item.text, // Map text
                        // If videoData is saved, use it. Otherwise try to construct/fallback.
                        video: item.videoData || (item.imageUrl ? {
                            id: item.id,
                            title: 'Image',
                            thumbnailUrl: item.imageUrl,
                            videoUrl: '',
                            description: '',
                            tags: [],
                            posterUrl: item.imageUrl // Ensure posterUrl is present for Video type compliance
                        } as Video : {} as Video),
                    }));
                    setCanvasItems(mappedItems);
                } else {
                    setCanvasItems([]);
                }
            } catch (error) {
                console.error("Failed to load board items", error);
            } finally {
                setLoading(false);
            }
        };

        loadBoardItems();
    }, [currentBoardId, userProfile?.uid]);

    // Auto-save Canvas Items
    useEffect(() => {
        if (!currentBoardId || !userProfile?.uid || loading) return; // Don't save while loading

        const timer = setTimeout(async () => {
            const itemsToSave: MoodboardItem[] = canvasItems.map(item => {
                // Keep 'note' type if explicitly set
                if (item.type === 'note') {
                    return {
                        id: item.id,
                        type: 'note',
                        x: item.x,
                        y: item.y,
                        text: item.text || '',
                        videoData: undefined, // Notes don't have video data
                        videoId: null,
                        imageUrl: null,
                        width: 192, // Default w-48 (48 * 4 = 192px)
                        height: 192,
                        color: 'yellow-200'
                    };
                }

                // Determine type based on content for legacy/dragged items
                const isVideo = 'videoUrl' in item.video && item.video.videoUrl;

                // Sanitize video object to remove undefined values
                const cleanVideoData = JSON.parse(JSON.stringify(item.video));

                return {
                    id: item.id,
                    type: isVideo ? 'video' : 'image',
                    x: item.x,
                    y: item.y,
                    videoData: cleanVideoData,
                    videoId: isVideo ? item.video.id : null,
                    imageUrl: !isVideo ? (item.video as any).thumbnailUrl || (item.video as any).url : null
                };
            });

            try {
                await MoodboardService.saveMoodboard(userProfile.uid, currentBoardId, itemsToSave);
            } catch (error) {
                console.error("Failed to auto-save moodboard", error);
            }
        }, 1000); // 1-second debounce

        return () => clearTimeout(timer);
    }, [canvasItems, currentBoardId, userProfile?.uid, loading]);

    // Load Local Images (Legacy/Dashboard bg usage? - actually we should probably disable this if we want strict board isolation)
    // Checking if we should keep the global paste listener... 
    // YES, keeping global paste but modifying it to add to CURRENT board if open.
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            if (!currentBoardId) return; // Only allow paste if a board is open

            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob && userProfile?.uid) {
                        try {
                            // Upload to Firebase Storage for persistence
                            const downloadURL = await MoodboardService.uploadImage(userProfile.uid, blob);

                            const newId = `img-${Date.now()}`;
                            const newItem: DraggableCanvasItem = {
                                id: newId,
                                video: {
                                    id: newId,
                                    title: 'Pasted Image',
                                    thumbnailUrl: downloadURL,
                                    videoUrl: '', // Marker for image type
                                    description: 'Pasted from clipboard',
                                    tags: [],
                                    posterUrl: downloadURL
                                } as Video,
                                x: window.innerWidth / 2 - 150,
                                y: window.innerHeight / 2 - 100,
                            };
                            setCanvasItems(prev => [...prev, newItem]);
                        } catch (err) {
                            console.error("Failed to save pasted image", err);
                        }
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [currentBoardId, userProfile?.uid]);


    const handleDragStart = (event: DragStartEvent) => {
        const data = event.active.data.current;
        if (data) {
            // If canvas item, pass the whole item (DraggableCanvasItem)
            if (data.type === 'canvas') {
                // Find the actual item in state to get up-to-date text/properties
                const item = canvasItems.find(i => i.id === data.id);
                if (item) setActiveDragItem(item);
            } else if (data.video) {
                // Sidebar drag
                setActiveDragItem(data.video);
            }
        }
    }

    const handleDragMove = (event: DragMoveEvent) => {
        const { delta } = event;
        setDragDelta({ x: delta.x / viewport.scale, y: delta.y / viewport.scale });
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


    // Track Space Key
    const isSpacePressed = useRef(false);
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement).tagName !== 'INPUT') {
                isSpacePressed.current = true;
                document.body.style.cursor = 'grab';
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                isSpacePressed.current = false;
                document.body.style.cursor = '';
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const {
        viewport,
        setViewport,
        isPanning,
        isMarqueeSelecting,
        marqueeSelectionRect,
        handleBackgroundMouseDown
    } = useMoodboardInteraction({
        canvasItems,
        selectedItemIds,
        setSelectedItemIds,
        isSpacePressed
    });

    // Zoom Handler
    const handleWheel = (e: React.WheelEvent) => {
        // Only zoom if dragging isn't happening? Or always?
        // PureRef zooms to cursor.
        if (currentBoardId) {
            const ZOOM_SPEED = 0.001;
            const newScale = Math.min(Math.max(0.1, viewport.scale - e.deltaY * ZOOM_SPEED), 5);

            // Calculate zoom to cursor? Keeping it simple (center zoom or generic) first to reduce complexity.
            // Simple scale update:
            setViewport(prev => ({ ...prev, scale: newScale }));
        }
    };



    // Canvas Item Drag Compensation
    // If we scale the container, DndKit drag delta needs to be divided by scale to match cursor.
    // We can use the 'modifiers' prop on DndContext or handle it in 'onDragEnd'.
    // Here we just fix the visual 'left/top' in CanvasItem but the DragOverlay might look off if strict scaling isn't applied.
    // For now, let's implement the container transform.

    const handleDragEnd = (e: DragEndEvent) => {
        // Adjust delta by scale for correct drop position?
        // Actually, if we translate the ITEM coordinates by delta, 
        // and the item is inside a scaled container, a 10px mouse move = 10px / scale item move.

        // Let's wrapping existing handleDragEnd
        setActiveDragItem(null);
        const { active, delta } = e;
        const data = active.data.current;

        if (!data) return;

        const adjustedDelta = {
            x: delta.x / viewport.scale,
            y: delta.y / viewport.scale
        };

        if (data.type === 'sidebar') {
            // Sidebar to Canvas: Need to map screen coordinates to viewport space
            // ScreenX - ViewportX = ContainerX. 
            const dropX = (active.rect.current.translated?.left || 0) - viewport.x;
            const dropY = (active.rect.current.translated?.top || 0) - viewport.y;

            // Also divide by scale?
            // (Screen - Viewport) / Scale = Local
            const localX = dropX / viewport.scale;
            const localY = dropY / viewport.scale;

            const newItem: DraggableCanvasItem = {
                id: `canvas-${Date.now()}`,
                video: data.video,
                x: localX,
                y: localY,
            };
            setCanvasItems(prev => [...prev, newItem]);
        } else if (data.type === 'canvas') {
            const isSelected = selectedItemIds.has(data.id);
            setCanvasItems(prev => prev.map(item => {
                const shouldMove = isSelected ? selectedItemIds.has(item.id) : item.id === data.id;
                if (shouldMove) {
                    return {
                        ...item,
                        x: item.x + adjustedDelta.x,
                        y: item.y + adjustedDelta.y
                    };
                }
                return item;
            }));
        }
    };

    return (
        <DndContext
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            sensors={sensors}
        >
            <div
                id="canvas-container"
                className="flex w-full h-full bg-[#050505] overflow-hidden text-white relative font-sans touch-none select-none"
                onMouseDown={handleBackgroundMouseDown}
                onWheel={handleWheel}
                onContextMenu={(e) => {
                    e.preventDefault();
                    if (e.target === e.currentTarget) {
                        setContextMenu(prev => ({ ...prev, visible: false }));
                    }
                }}
            >
                {/* Global Style Override for this page to kill selection artifacts */}
                <style jsx global>{`
                    .select-none, .select-none * {
                        user-select: none !important;
                        -webkit-user-select: none !important;
                    }
                `}</style>

                {/* Visual Background Grid - Constant */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                        backgroundSize: '24px 24px'
                    }}
                />

                {/* Top Bar for Navigation */}
                <div className="absolute top-4 left-4 z-40 flex items-center gap-4">
                    <div className="absolute top-4 left-4 z-40 flex items-center gap-4">
                        {currentBoardId && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                    // Capture Thumbnail
                                    if (userProfile?.uid && currentBoardId) {
                                        try {
                                            // Temporarily hide UI or ensure we capture only the canvas background?
                                            // With html-to-image, we can select a specific node.
                                            // The main container includes UI overlays. Ideally we want just the canvas content.
                                            // But the canvas content is mixed in the main div.
                                            // For V1, let's capture the main document body or the root div, but ideally, we should wrap the "canvas content" in a separate div.
                                            // Given the current structure, capturing 'document.body' might be easiest but includes UI.
                                            // Let's filter out UI elements by class or ID if possible.
                                            // Actually, let's just try to capture the viewport.
                                            const canvasNode = document.getElementById('canvas-container'); // Need to ID the main container
                                            if (canvasNode) {
                                                const dataUrl = await toPng(canvasNode, {
                                                    quality: 0.8,
                                                    pixelRatio: 0.5, // Lower res for thumbnail
                                                    filter: (node) => {
                                                        // Exclude UI elements from screenshot
                                                        if (node instanceof HTMLElement) {
                                                            // Exclude Top Bar
                                                            if (node.classList?.contains('absolute') && node.classList?.contains('top-4')) return false;
                                                            // Exclude Library Button/Window
                                                            if (node.innerHTML?.includes('Open Library')) return false;
                                                            if (node.innerHTML?.includes('My Liked Videos')) return false;
                                                            // Exclude Context Menu
                                                            if (node.id === 'context-menu-container') return false;
                                                        }
                                                        return true;
                                                    }
                                                });

                                                // Convert Data URL to Blob
                                                const res = await fetch(dataUrl);
                                                const blob = await res.blob();

                                                // Upload to Store
                                                const url = await MoodboardService.uploadImage(userProfile.uid, blob);

                                                // Save URL to moodboard
                                                // We need to re-fetch items or just pass empty if we trust auto-save?
                                                // Ideally saveMoodboard updates items too. Let's pass current items.
                                                // Note: handleBack relies on auto-save having run or running.
                                                // Let's explicitly save everything now.

                                                const itemsToSave: MoodboardItem[] = canvasItems.map(item => {
                                                    if (item.type === 'note') {
                                                        return {
                                                            id: item.id,
                                                            type: 'note',
                                                            // ... (same logic as auto-save) map logic duplicated... 
                                                            // For brevity, let's trust auto-save works on items and just update the thumbnail URL separately?
                                                            // MoodboardService.saveMoodboard overwrites. We need to pass items.
                                                            x: item.x,
                                                            y: item.y,
                                                            text: item.text || '',
                                                            width: 192,
                                                            height: 192,
                                                            videoId: null,
                                                            imageUrl: null,
                                                            videoData: undefined
                                                        }
                                                    }
                                                    // ... simplistic mapping for now to avoid duplication error risk without refactoring map logic to function
                                                    const isVideo = 'videoUrl' in item.video && item.video.videoUrl;
                                                    const cleanVideoData = JSON.parse(JSON.stringify(item.video));
                                                    return {
                                                        id: item.id,
                                                        type: isVideo ? 'video' : 'image',
                                                        x: item.x,
                                                        y: item.y,
                                                        videoData: cleanVideoData,
                                                        videoId: isVideo ? item.video.id : null,
                                                        imageUrl: !isVideo ? (item.video as any).thumbnailUrl || (item.video as any).url : null
                                                    };
                                                });

                                                await MoodboardService.saveMoodboard(userProfile.uid, currentBoardId, itemsToSave, url);
                                            }
                                        } catch (e) {
                                            console.error("Failed to generate thumbnail", e);
                                        }
                                    }
                                    setCurrentBoardId(null);
                                }}
                                className="bg-black/50 backdrop-blur-md border border-white/10 hover:bg-white/10 text-white rounded-full transition-all hover:scale-105 active:scale-95 h-12 w-12"
                                title="Back to Dashboard"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Dashboard View */}
                {!currentBoardId && (
                    <div className="absolute inset-0 z-10 p-12 overflow-y-auto">
                        <div className="max-w-7xl mx-auto space-y-8">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight text-white">My Moodboards</h1>
                                <p className="text-zinc-400">Manage and organize your creative spaces</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {/* Create New Card */}
                                <button
                                    onClick={async () => {
                                        if (userProfile?.uid) {
                                            const limitCheck = checkLimit(userProfile, 'moodboards', moodboards.length);
                                            if (!limitCheck.allowed) {
                                                setShowLimitDialog(true);
                                                return;
                                            }

                                            const newId = await MoodboardService.createMoodboard(userProfile.uid, `Moodboard ${moodboards.length + 1}`);
                                            setCurrentBoardId(newId);
                                        }
                                    }}
                                    className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 transition-all flex flex-col items-center justify-center gap-4 group cursor-pointer"
                                >
                                    <div className="w-16 h-16 rounded-full bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
                                        <Plus className="w-8 h-8 text-zinc-400 group-hover:text-white" />
                                    </div>
                                    <span className="text-zinc-400 group-hover:text-white font-medium">Create New Board</span>
                                </button>

                                {/* Existing Boards */}
                                {moodboards.map((board) => (
                                    <div
                                        key={board.id}
                                        onClick={() => setCurrentBoardId(board.id)}
                                        className="group relative cursor-pointer"
                                    >
                                        <div className="aspect-[4/3] rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden relative transition-all duration-300 group-hover:border-purple-500/50 group-hover:shadow-2xl group-hover:shadow-purple-900/20">
                                            {board.thumbnailUrl ? (
                                                <img
                                                    src={board.thumbnailUrl}
                                                    alt={board.name}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                                    <Layout className="w-12 h-12 text-zinc-600" />
                                                </div>
                                            )}

                                            {/* Overlay */}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                                <Button variant="secondary" size="sm" className="pointer-events-none bg-white/90 text-black font-semibold">
                                                    Open Board
                                                </Button>
                                            </div>

                                            {/* Options Menu */}
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-40 p-1 bg-[#0f0f16] border-purple-500/20 text-zinc-200">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm("Are you sure you want to delete this moodboard?")) {
                                                                    MoodboardService.deleteMoodboard(userProfile?.uid || '', board.id);
                                                                    setMoodboards(prev => prev.filter(b => b.id !== board.id));
                                                                }
                                                            }}
                                                            className="w-full flex items-center gap-2 px-2 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Delete Board
                                                        </button>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>

                                        <div className="mt-3 px-1">
                                            {editingBoardId === board.id ? (
                                                <input
                                                    autoFocus
                                                    className="bg-transparent border-b border-purple-500 text-white font-medium w-full outline-none py-0.5"
                                                    value={tempName}
                                                    onChange={(e) => setTempName(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onBlur={async () => {
                                                        if (userProfile?.uid && tempName.trim()) {
                                                            await MoodboardService.updateMoodboardName(userProfile.uid, board.id, tempName);
                                                            setMoodboards(prev => prev.map(b => b.id === board.id ? { ...b, name: tempName } : b));
                                                        }
                                                        setEditingBoardId(null);
                                                    }}
                                                    onKeyDown={async (e) => {
                                                        if (e.key === 'Enter') {
                                                            if (userProfile?.uid && tempName.trim()) {
                                                                await MoodboardService.updateMoodboardName(userProfile.uid, board.id, tempName);
                                                                setMoodboards(prev => prev.map(b => b.id === board.id ? { ...b, name: tempName } : b));
                                                            }
                                                            setEditingBoardId(null);
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <h3
                                                    className="font-medium text-zinc-200 group-hover:text-purple-300 truncate transition-colors"
                                                    onDoubleClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingBoardId(board.id);
                                                        setTempName(board.name || 'Untitled');
                                                    }}
                                                >
                                                    {board.name || 'Untitled Board'}
                                                </h3>
                                            )}
                                            <p className="text-xs text-zinc-500 mt-1">{new Date(board.updatedAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Canvas Area (Only when board selected) */}
                {currentBoardId && (
                    <div
                        ref={canvasRef}
                        onContextMenu={handleContextMenu}
                        className="absolute inset-0 z-0 overflow-hidden touch-none"
                        onWheel={handleWheel}
                        style={{ cursor: isPanning ? 'grabbing' : 'default' }}
                    >

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

                        {/* Transformable Content */}
                        <div
                            style={{
                                transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
                                transformOrigin: 'top left',
                                width: '100%',
                                height: '100%'
                            }}
                        >
                            {canvasItems.map((item, index) => (
                                <CanvasItem
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    style={{
                                        // Apply visual transform if selected and being dragged (by a group member)
                                        // activeDragItem must be one of the selected items
                                        transform: (activeDragItem && 'id' in activeDragItem && selectedItemIds.has(activeDragItem.id) && selectedItemIds.has(item.id) && item.id !== activeDragItem.id)
                                            ? `translate3d(${dragDelta.x}px, ${dragDelta.y}px, 0)`
                                            : undefined
                                    }}
                                    onRemove={() => setCanvasItems(prev => prev.filter(i => i.id !== item.id))}
                                    onMaximize={() => setExpandedVideo(item.video)}
                                    onUpdate={(id, text) => setCanvasItems(prev => prev.map(i => i.id === id ? { ...i, text } : i))}
                                    isSelected={selectedItemIds.has(item.id)}
                                    onSelect={(e) => {
                                        e.stopPropagation();
                                        if (e.shiftKey) {
                                            setSelectedItemIds(prev => {
                                                const newSet = new Set(prev);
                                                if (newSet.has(item.id)) newSet.delete(item.id);
                                                else newSet.add(item.id);
                                                return newSet;
                                            });
                                        } else {
                                            if (!selectedItemIds.has(item.id) || selectedItemIds.size > 1) {
                                                setSelectedItemIds(new Set([item.id]));
                                            }
                                        }
                                    }}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        // Center Viewport on Item at 100% scale
                                        // ViewportX = ScreenCenter - ItemCenter
                                        const screenCenterX = window.innerWidth / 2;
                                        const screenCenterY = window.innerHeight / 2;

                                        const itemW = (item.type === 'note' ? 200 : 256);
                                        const itemH = (item.type === 'note' ? 100 : 144); // approx

                                        const itemCenterX = item.x + itemW / 2;
                                        const itemCenterY = item.y + itemH / 2;

                                        // We want: (ItemCenter + V.x) * V.scale = ScreenCenter
                                        // Wait, transform is: translate(Vx, Vy) scale(S)
                                        // Box mapping: Screen = (Local + Vx) * S ?
                                        // No, usually: Screen = (Local * S) + Vx ? Check container style.
                                        // Container: transform: `translate3d(${viewport.x}px, ...` scale(${viewport.scale})`
                                        // Does scale apply to children or the container transform? 
                                        // Usually typical pan-zoom: matrix(scale, 0, 0, scale, x, y)
                                        // So: ScreenX = ItemX * scale + viewportX

                                        // Target: Scale = 1
                                        // ScreenCenter = ItemCenter * 1 + NewViewportX
                                        // NewViewportX = ScreenCenter - ItemCenter

                                        setViewport({
                                            x: screenCenterX - itemCenterX,
                                            y: screenCenterY - itemCenterY,
                                            scale: 1
                                        });
                                    }}
                                />
                            ))}
                        </div>




                        {/* Marquee Selection Box */}
                        {marqueeSelectionRect && (
                            <div
                                className="absolute border bg-purple-500/20 border-purple-500 z-50 pointer-events-none"
                                style={{
                                    left: marqueeSelectionRect.x,
                                    top: marqueeSelectionRect.y,
                                    width: marqueeSelectionRect.w,
                                    height: marqueeSelectionRect.h,
                                }}
                            />
                        )}

                        {/* Context Menu UI */}
                        {contextMenu.visible && (
                            <div
                                id="context-menu-container"
                                className="absolute bg-[#0f0c1d] border border-white/10 rounded-lg shadow-2xl p-1 z-[200] w-48 animate-in fade-in zoom-in-95 duration-100"
                                style={{ top: contextMenu.y, left: contextMenu.x }}
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <button className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white rounded-md transition-colors flex items-center gap-2">
                                    Undo <span className="ml-auto text-xs text-zinc-500">Ctrl+Z</span>
                                </button>
                                <button className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white rounded-md transition-colors flex items-center gap-2">
                                    Redo <span className="ml-auto text-xs text-zinc-500">Ctrl+Y</span>
                                </button>
                                <div className="h-px bg-white/10 my-1" />
                                <button
                                    onClick={() => {
                                        // Add Note Logic
                                        const noteItem: DraggableCanvasItem = {
                                            id: `note-${Date.now()}`,
                                            type: 'note',
                                            text: 'New Note',
                                            video: {} as Video, // Empty video for note
                                            x: (contextMenu.x - viewport.x) / viewport.scale,
                                            y: (contextMenu.y - viewport.y) / viewport.scale,
                                        };
                                        setCanvasItems(prev => [...prev, noteItem]);
                                        setContextMenu(prev => ({ ...prev, visible: false }));
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white rounded-md transition-colors flex items-center gap-2"
                                >
                                    Add Note
                                </button>
                                <button className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white rounded-md transition-colors flex items-center gap-2">
                                    Paste <span className="ml-auto text-xs text-zinc-500">Ctrl+V</span>
                                </button>
                            </div>
                        )}
                    </div>
                )
                }

                {/* Floating Library Button (Only when board selected) */}
                {
                    currentBoardId && (
                        <div className="absolute bottom-8 left-8 z-50" ref={libraryButtonRef} onMouseDown={(e) => e.stopPropagation()}>

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
                    )
                }


                {/* Floating Library Window */}
                {
                    currentBoardId && (
                        <div
                            ref={libraryRef}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`absolute bottom-24 left-8 z-40 w-[420px] bg-black/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden transition-all duration-500 origin-bottom-left ease-out flex flex-col
                        ${isLibraryOpen
                                    ? 'opacity-100 scale-100 translate-y-0 translate-x-0'
                                    : 'opacity-0 scale-90 translate-y-12 -translate-x-12 pointer-events-none'
                                }`}
                            style={{ maxHeight: 'calc(100vh - 120px)' }}
                        >
                            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                                <span className="font-bold text-white text-sm tracking-wide">My Liked Videos</span>
                                <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-1 rounded-full">{likedVideos.length} ITEMS</span>
                            </div>

                            <ScrollArea className="flex-1 p-5 overflow-y-auto">
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
                    )
                }


                {/* Full Screen Video Player */}
                <Dialog open={!!expandedVideo && 'videoUrl' in expandedVideo} onOpenChange={(open) => !open && setExpandedVideo(null)}>

                    <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none border-0 bg-[#0f0c1d]/40 backdrop-blur-xl overflow-y-auto">
                        <DialogTitle className="sr-only">
                            {expandedVideo && 'title' in expandedVideo ? (expandedVideo as Video).title : "Full Screen Video Player"}

                        </DialogTitle>

                        {expandedVideo && 'videoUrl' in expandedVideo && (
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
                                            <VideoPlayer video={expandedVideo as Video} muted={false} />
                                            <VideoActionsBar video={expandedVideo as Video} userProfile={userProfile} />

                                        </div>

                                        {/* Meta Info */}
                                        <div className="space-y-4 text-white">
                                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{(expandedVideo as Video).title}</h1>
                                            <p className="text-zinc-400 text-lg leading-relaxed max-w-3xl">{(expandedVideo as Video).description}</p>


                                            {/* Tags */}
                                            {(expandedVideo as Video).tags && (expandedVideo as Video).tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {(expandedVideo as Video).tags.map((tag: string) => (

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

            </div >



            {/* Drag Overlay for smooth visuals */}
            < DragOverlay dropAnimation={null} zIndex={100} >
                {
                    activeDragItem ? (
                        <div style={{
                            transform: 'x' in activeDragItem ? `scale(${viewport.scale
                                })` : undefined,
                            transformOrigin: 'top left', // Or matches cursor offset? standard behavior usually top-left of element relative to cursor? 
                            // Actually dnd-kit translates the overlay to cursor position. Scaling it might offset it if origin isn't center?
                            // Let's try transformOrigin: '0 0' (top left).
                        }}>
                            {('type' in activeDragItem && activeDragItem.type === 'note') ? (
                                <div className="w-auto h-auto min-w-[100px] bg-white/10 border-2 border-dashed border-white/50 p-2 rounded-lg cursor-grabbing backdrop-blur-sm">
                                    <span className="text-2xl text-white font-sans font-medium whitespace-pre-wrap leading-relaxed">
                                        {activeDragItem.text}
                                    </span>
                                </div>
                            ) : (
                                <div className="w-64 aspect-video rounded-xl shadow-2xl border-2 border-purple-500 cursor-grabbing bg-black z-[100] pointer-events-none overflow-hidden"
                                    style={{
                                        transform: 'scale(1.05)', // Subtle pop
                                    }}
                                >
                                    <MoodboardItemCard
                                        video={
                                            'video' in activeDragItem ? activeDragItem.video : activeDragItem as Video | LocalImage
                                        }
                                        className="w-full h-full"
                                        hoverDelay={0} // Ensure immediate visual if needed, or 0
                                        playbackSpeed={1.0} // Overlay playback?
                                    />
                                </div>
                            )}
                        </div>
                    ) : null}
            </DragOverlay>

            <LimitReachedDialog
                open={showLimitDialog}
                onOpenChange={setShowLimitDialog}
                feature="moodboards"
                onDonateClick={() => setShowDonateDialog(true)}
            />

            <DonateDialog
                open={showDonateDialog}
                onOpenChange={setShowDonateDialog}
            />
        </DndContext>
    );
}
