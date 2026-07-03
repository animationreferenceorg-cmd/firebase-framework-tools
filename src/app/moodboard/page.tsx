'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useUser } from '@/hooks/use-user';
import { collection, query, where, documentId, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video, LocalImage, Moodboard, MoodboardItem } from '@/lib/types';

import { MoodboardService } from '@/lib/moodboard-service';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
    ChevronLeft, Plus, Image as ImageIcon, ArrowLeft, Layout, Trash2, Search, X, ChevronDown,
    MousePointer, Hand, Type, StickyNote, Square, Circle, Triangle, 
    ArrowUpRight, ArrowRight, Pen, Eraser, ZoomIn, ZoomOut, Maximize2, 
    MoreHorizontal, Sun, Moon 
} from 'lucide-react';

import Link from 'next/link';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoActionsBar } from '@/components/VideoActionsBar';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DraggableCanvasItem } from './types';
import { CanvasItem } from './components/CanvasItem';
import { DraggableSidebarItem } from './components/DraggableSidebarItem';
import { useMoodboardInteraction } from './hooks/useMoodboardInteraction';
import { PropertyToolbar } from './components/PropertyToolbar';
import { ConnectionLine } from './components/ConnectionLine';
import { toPng } from 'html-to-image';
import { checkLimit } from '@/lib/limits';
import { LimitReachedDialog } from '@/components/LimitReachedDialog';
import { DonateDialog } from '@/components/DonateDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useSidebar } from '@/components/ui/sidebar';

// Helper to load and obtain natural image dimensions
const getImageDimensions = (urlOrBlob: string | Blob): Promise<{ width: number, height: number }> => {
    return new Promise((resolve) => {
        const img = new window.Image();
        let objectUrl = '';
        if (urlOrBlob instanceof Blob) {
            objectUrl = URL.createObjectURL(urlOrBlob);
            img.src = objectUrl;
        } else {
            img.src = urlOrBlob;
        }
        img.onload = () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            resolve({ width: 512, height: 512 }); // default fallback
        };
    });
};

const getConstrainedDimensions = (width: number, height: number, maxSize: number = 512): { width: number, height: number } => {
    if (width <= maxSize && height <= maxSize) {
        return { width, height };
    }
    const ratio = width / height;
    if (width > height) {
        return { width: maxSize, height: Math.round(maxSize / ratio) };
    } else {
        return { width: Math.round(maxSize * ratio), height: maxSize };
    }
};

function MoodboardContent() {
    const { user } = useAuth();
    const { userProfile } = useUser();
    const { board_id } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { setOpen: setSidebarOpen } = useSidebar();
    const searchParams = useSearchParams();
    const boardParam = searchParams.get('board');
    
    // Sync URL board parameter with local board state
    useEffect(() => {
        setCurrentBoardId(boardParam);
    }, [boardParam]);
    
    // Page & UI settings
    const [showLimitDialog, setShowLimitDialog] = useState(false);
    const [showDonateDialog, setShowDonateDialog] = useState(false);
    const [likedVideos, setLikedVideos] = useState<Video[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLibraryTags, setSelectedLibraryTags] = useState<string[]>([]);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedLibraryItemIds, setSelectedLibraryItemIds] = useState<Set<string>>(new Set());
    const [isTagsDropdownOpen, setIsTagsDropdownOpen] = useState(false);
    
    const tagsDropdownRef = useRef<HTMLDivElement>(null);
    const [libraryTab, setLibraryTab] = useState<'all' | 'collections'>('all');
    const [selectedCollectionTag, setSelectedCollectionTag] = useState<string | null>(null);
    const [selectedMediaType, setSelectedMediaType] = useState<'all' | 'video' | 'short' | '2d' | '3d' | 'collections'>('all');

    // Click outside listener for tags dropdown
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(e.target as Node)) {
                setIsTagsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    // Extract unique tags from liked videos
    const allUniqueTags = React.useMemo(() => {
        const tagsSet = new Set<string>();
        likedVideos.forEach(v => {
            if (v.tags) {
                v.tags.forEach(t => tagsSet.add(t));
            }
        });
        return Array.from(tagsSet).sort();
    }, [likedVideos]);

    // Group liked videos by tags for collections folder display
    const collectionsFolders = React.useMemo(() => {
        const foldersMap: { [tag: string]: { coverUrl: string; count: number; tag: string } } = {};
        
        likedVideos.forEach(video => {
            if (video.tags && video.tags.length > 0) {
                video.tags.forEach(tag => {
                    if (!foldersMap[tag]) {
                        foldersMap[tag] = {
                            coverUrl: video.thumbnailUrl || video.posterUrl || '/placeholder.jpg',
                            count: 0,
                            tag: tag
                        };
                    }
                    foldersMap[tag].count += 1;
                });
            }
        });
        
        return Object.values(foldersMap).sort((a, b) => b.count - a.count);
    }, [likedVideos]);

    // Filter folders based on search query
    const filteredFolders = React.useMemo(() => {
        if (searchQuery.trim() === '') return collectionsFolders;
        return collectionsFolders.filter(folder => 
            folder.tag.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [collectionsFolders, searchQuery]);

    // Filter videos inside a selected collection folder
    const folderFilteredVideos = React.useMemo(() => {
        if (!selectedCollectionTag) return [];
        return likedVideos.filter(video => {
            const matchesSearch = searchQuery.trim() === '' || 
                video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (video.description || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesTag = (video.tags || []).includes(selectedCollectionTag);
            return matchesSearch && matchesTag;
        });
    }, [likedVideos, selectedCollectionTag, searchQuery]);

    // Filter liked videos based on search query, tag, and media type tab selection
    const filteredLikedVideos = React.useMemo(() => {
        return likedVideos.filter(video => {
            const matchesSearch = searchQuery.trim() === '' || 
                video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (video.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (video.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesTags = selectedLibraryTags.length === 0 || 
                (video.tags || []).some(tag => selectedLibraryTags.includes(tag));

            let matchesType = true;
            if (selectedMediaType === 'video') {
                matchesType = video.isShort !== true;
            } else if (selectedMediaType === 'short') {
                matchesType = video.isShort === true;
            } else if (selectedMediaType === '2d') {
                matchesType = (video.tags || []).some(t => t.toLowerCase().includes('2d'));
            } else if (selectedMediaType === '3d') {
                matchesType = (video.tags || []).some(t => t.toLowerCase().includes('3d'));
            }

            return matchesSearch && matchesTags && matchesType;
        });
    }, [likedVideos, searchQuery, selectedLibraryTags, selectedMediaType]);

    const [canvasItems, setCanvasItemsState] = useState<DraggableCanvasItem[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [themeMode, setThemeMode] = useState<'dark' | 'light'>('light');

    // Space key state ref
    const isSpacePressed = useRef(false);

    // Moodboard interaction hook (defined early for lexical availability)
    const {
        viewport,
        setViewport,
        isPanning,
        setIsPanning,
        isMarqueeSelecting,
        marqueeSelectionRect,
        handleBackgroundMouseDown
    } = useMoodboardInteraction({
        canvasItems,
        selectedItemIds,
        setSelectedItemIds,
        isSpacePressed
    });

    // Track Space Key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement).tagName !== 'INPUT' && !(e.target as HTMLElement).closest('[contenteditable]')) {
                isSpacePressed.current = true;
                if (canvasRef.current) {
                    document.body.style.cursor = 'grab';
                }
            }
        };
        const handleThemeKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                isSpacePressed.current = false;
                document.body.style.cursor = '';
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleThemeKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleThemeKeyUp);
        };
    }, []);

    // Multi-board State
    const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);

    // Close sidebar once when a moodboard is selected
    const prevBoardIdRef = useRef<string | null>(null);
    useEffect(() => {
        if (currentBoardId && prevBoardIdRef.current !== currentBoardId) {
            setSidebarOpen(false);
        }
        prevBoardIdRef.current = currentBoardId;
    }, [currentBoardId, setSidebarOpen]);
    const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
    const [isLoadingBoards, setIsLoadingBoards] = useState(true);
    const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
    const [tempName, setTempName] = useState("");

    const [loading, setLoading] = useState(true);
    const [expandedVideo, setExpandedVideo] = useState<Video | LocalImage | null>(null);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    const libraryRef = useRef<HTMLDivElement>(null);
    const libraryButtonRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, visible: boolean }>({ x: 0, y: 0, visible: false });

    // Whiteboard tools
    const [activeTool, setActiveTool] = useState<'select' | 'pan' | 'text' | 'note' | 'shape' | 'pen' | 'connection' | 'eraser'>('select');
    const [shapeType, setShapeType] = useState<'rectangle' | 'circle' | 'triangle' | 'arrow-right'>('rectangle');
    const [stickyColor, setStickyColor] = useState<string>('#fef08a'); // default Yellow-200
    const [penColor, setPenColor] = useState<string>('#6366f1'); // Indigo default draw stroke
    const [penWidth, setPenWidth] = useState<number>(4);

    // Pen drawing state refs
    const isDrawingRef = useRef(false);
    const activeDrawingIdRef = useRef<string | null>(null);

    // Connection tool state
    const [connectionStartId, setConnectionStartId] = useState<string | null>(null);
    const [tempConnectionLine, setTempConnectionLine] = useState<{ x: number, y: number } | null>(null);

    // Undo / Redo history stacks
    const historyRef = useRef<DraggableCanvasItem[][]>([]);
    const historyIndexRef = useRef<number>(-1);

    const setCanvasItems = useCallback((newItemsOrFunc: DraggableCanvasItem[] | ((prev: DraggableCanvasItem[]) => DraggableCanvasItem[]), skipHistory = false) => {
        setCanvasItemsState(prev => {
            const next = typeof newItemsOrFunc === 'function' ? newItemsOrFunc(prev) : newItemsOrFunc;
            
            if (!skipHistory) {
                const history = historyRef.current;
                const index = historyIndexRef.current;
                const newHistory = history.slice(0, index + 1);
                newHistory.push(JSON.parse(JSON.stringify(next)));
                
                historyRef.current = newHistory;
                historyIndexRef.current = newHistory.length - 1;
            }
            return next;
        });
    }, []);

    const undo = useCallback(() => {
        const idx = historyIndexRef.current;
        if (idx > 0) {
            historyIndexRef.current = idx - 1;
            const previousState = historyRef.current[idx - 1];
            setCanvasItemsState(JSON.parse(JSON.stringify(previousState)));
            setSelectedItemIds(new Set());
        }
    }, []);

    const redo = useCallback(() => {
        const idx = historyIndexRef.current;
        if (idx < historyRef.current.length - 1) {
            historyIndexRef.current = idx + 1;
            const nextState = historyRef.current[idx + 1];
            setCanvasItemsState(JSON.parse(JSON.stringify(nextState)));
            setSelectedItemIds(new Set());
        }
    }, []);

    const getMaxZIndex = useCallback(() => {
        if (canvasItems.length === 0) return 0;
        return Math.max(...canvasItems.map(i => i.zIndex || 0));
    }, [canvasItems]);

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

            // Close Context Menu
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
    }, [userProfile?.uid, currentBoardId]);

    // Fetch Liked Videos
    useEffect(() => {
        const fetchLiked = async () => {
            const ids = userProfile?.likedVideoIds || [];
            if (ids.length === 0) {
                setLoading(false);
                return;
            }
            const sliceIds = ids.slice(-20);

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
            setCanvasItemsState([]);
            historyRef.current = [];
            historyIndexRef.current = -1;
            return;
        }

        const loadBoardItems = async () => {
            setLoading(true);
            try {
                const items = await MoodboardService.loadMoodboard(userProfile.uid, currentBoardId);
                if (items) {
                    const mappedItems: DraggableCanvasItem[] = items.map(item => {
                        const mapped: DraggableCanvasItem = {
                            id: item.id,
                            type: item.type,
                            x: item.x,
                            y: item.y,
                            width: item.width,
                            height: item.height,
                            color: item.color,
                            zIndex: item.zIndex || 1,
                            text: item.text,
                            shapeType: item.shapeType,
                            borderColor: item.borderColor,
                            borderWidth: item.borderWidth,
                            fontSize: item.fontSize,
                            textColor: item.textColor,
                            points: item.points,
                            fromItem: item.fromItem,
                            toItem: item.toItem,
                            video: item.videoData || (item.imageUrl ? {
                                id: item.id,
                                title: 'Image',
                                thumbnailUrl: item.imageUrl,
                                videoUrl: '',
                                description: '',
                                tags: [],
                                posterUrl: item.imageUrl
                            } as Video : {} as Video)
                        };
                        return mapped;
                    });
                    setCanvasItemsState(mappedItems);
                    historyRef.current = [JSON.parse(JSON.stringify(mappedItems))];
                    historyIndexRef.current = 0;
                } else {
                    setCanvasItemsState([]);
                    historyRef.current = [[]];
                    historyIndexRef.current = 0;
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
        if (!currentBoardId || !userProfile?.uid || loading) return;

        const timer = setTimeout(async () => {
            const itemsToSave: MoodboardItem[] = canvasItems.map(item => {
                const cleanItem: MoodboardItem = {
                    id: item.id,
                    type: item.type,
                    x: item.x,
                    y: item.y,
                    width: item.width,
                    height: item.height,
                    color: item.color,
                    zIndex: item.zIndex || 1,
                    text: item.text || '',
                    shapeType: item.shapeType,
                    borderColor: item.borderColor,
                    borderWidth: item.borderWidth,
                    fontSize: item.fontSize,
                    textColor: item.textColor,
                    points: item.points,
                    fromItem: item.fromItem,
                    toItem: item.toItem
                };

                if (item.type === 'video' || item.type === 'image') {
                    const isVideo = 'videoUrl' in item.video! && item.video.videoUrl;
                    cleanItem.videoData = JSON.parse(JSON.stringify(item.video));
                    cleanItem.videoId = isVideo ? item.video!.id : null;
                    cleanItem.imageUrl = !isVideo ? (item.video as any).thumbnailUrl || (item.video as any).url : null;
                }

                return cleanItem;
            });

            try {
                await MoodboardService.saveMoodboard(userProfile.uid, currentBoardId, itemsToSave);
            } catch (error) {
                console.error("Failed to auto-save moodboard", error);
            }
        }, 1000); // 1-second debounce

        return () => clearTimeout(timer);
    }, [canvasItems, currentBoardId, userProfile?.uid, loading]);

    // Clipboard Paste Listener
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            if (!currentBoardId || !userProfile?.uid) return;

            // 1. Handle image file paste
            const items = e.clipboardData?.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        const blob = items[i].getAsFile();
                        if (blob) {
                            try {
                                toast({
                                    title: "Uploading pasted image...",
                                    description: "Please wait while the image uploads."
                                });
                                // Get natural dimensions from blob (instant)
                                const { width: nw, height: nh } = await getImageDimensions(blob);
                                const { width, height } = getConstrainedDimensions(nw, nh);

                                const downloadURL = await MoodboardService.uploadImage(userProfile.uid, blob);

                                // Paste in the center of active screen view
                                const screenCenterX = window.innerWidth / 2;
                                const screenCenterY = window.innerHeight / 2;
                                const localX = (screenCenterX - viewport.x) / viewport.scale - width / 2;
                                const localY = (screenCenterY - viewport.y) / viewport.scale - height / 2;

                                const newId = `img-${Date.now()}`;
                                const newItem: DraggableCanvasItem = {
                                    id: newId,
                                    type: 'image',
                                    video: {
                                        id: newId,
                                        title: 'Pasted Image',
                                        thumbnailUrl: downloadURL,
                                        videoUrl: '',
                                        description: 'Pasted from clipboard',
                                        tags: [],
                                        posterUrl: downloadURL
                                    } as Video,
                                    x: localX,
                                    y: localY,
                                    width: width,
                                    height: height,
                                    zIndex: getMaxZIndex() + 1
                                };
                                setCanvasItems(prev => [...prev, newItem]);
                                setSelectedItemIds(new Set([newId]));
                            } catch (err) {
                                console.error("Failed to save pasted image", err);
                                toast({
                                    title: "Upload failed",
                                    description: "Failed to upload clipboard image",
                                    variant: "destructive"
                                });
                            }
                        }
                    }
                }
            }

            // 2. Handle image URL string paste
            const text = e.clipboardData?.getData('text');
            if (text && (text.startsWith('http://') || text.startsWith('https://')) && /\.(jpeg|jpg|gif|png|webp|svg)/i.test(text.split('?')[0])) {
                try {
                    // Try to load image dimensions from URL
                    const { width: nw, height: nh } = await getImageDimensions(text);
                    const { width, height } = getConstrainedDimensions(nw, nh);

                    const screenCenterX = window.innerWidth / 2;
                    const screenCenterY = window.innerHeight / 2;
                    const localX = (screenCenterX - viewport.x) / viewport.scale - width / 2;
                    const localY = (screenCenterY - viewport.y) / viewport.scale - height / 2;

                    const newId = `img-${Date.now()}`;
                    const newItem: DraggableCanvasItem = {
                        id: newId,
                        type: 'image',
                        video: {
                            id: newId,
                            title: 'Pasted Link Image',
                            thumbnailUrl: text,
                            videoUrl: '',
                            description: 'Pasted URL',
                            tags: [],
                            posterUrl: text
                        } as Video,
                        x: localX,
                        y: localY,
                        width: width,
                        height: height,
                        zIndex: getMaxZIndex() + 1
                    };
                    setCanvasItems(prev => [...prev, newItem]);
                    setSelectedItemIds(new Set([newId]));
                } catch (err) {
                    console.error("Failed to fetch pasted URL size", err);
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [currentBoardId, userProfile?.uid, viewport, getMaxZIndex, setCanvasItems]);



    // Imperative non-passive wheel zoom
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheelValues = (e: WheelEvent) => {
            if (currentBoardId) {
                e.preventDefault();
                const ZOOM_SPEED = 0.0015;
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                setViewport(prev => {
                    const canvasX = (mouseX - prev.x) / prev.scale;
                    const canvasY = (mouseY - prev.y) / prev.scale;
                    const newScale = Math.min(Math.max(0.1, prev.scale - e.deltaY * ZOOM_SPEED), 5);
                    return {
                        x: mouseX - canvasX * newScale,
                        y: mouseY - canvasY * newScale,
                        scale: newScale
                    };
                });
            }
        };

        canvas.addEventListener('wheel', handleWheelValues, { passive: false });
        return () => {
            canvas.removeEventListener('wheel', handleWheelValues);
        };
    }, [currentBoardId, setViewport]);

    // Zoom Buttons
    const handleZoomIn = () => {
        setViewport(prev => {
            const newScale = Math.min(prev.scale * 1.25, 5);
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const canvasX = (centerX - prev.x) / prev.scale;
            const canvasY = (centerY - prev.y) / prev.scale;
            return {
                x: centerX - canvasX * newScale,
                y: centerY - canvasY * newScale,
                scale: newScale
            };
        });
    };

    const handleZoomOut = () => {
        setViewport(prev => {
            const newScale = Math.max(prev.scale * 0.8, 0.1);
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const canvasX = (centerX - prev.x) / prev.scale;
            const canvasY = (centerY - prev.y) / prev.scale;
            return {
                x: centerX - canvasX * newScale,
                y: centerY - canvasY * newScale,
                scale: newScale
            };
        });
    };

    // Fit to Screen / Center View
    const handleFitToScreen = useCallback(() => {
        if (canvasItems.length === 0) {
            setViewport({ x: 0, y: 0, scale: 1 });
            return;
        }

        const rects = canvasItems
            .filter(item => item.type !== 'connection')
            .map(item => {
                const w = item.width || (item.type === 'note' || item.type === 'shape' ? 256 : item.type === 'text' ? 200 : 256);
                const h = item.height || (item.type === 'note' || item.type === 'shape' ? 256 : item.type === 'text' ? 80 : 144);
                return {
                    minX: item.x,
                    maxX: item.x + w,
                    minY: item.y,
                    maxY: item.y + h
                };
            });

        if (rects.length === 0) {
            setViewport({ x: 0, y: 0, scale: 1 });
            return;
        }

        const minX = Math.min(...rects.map(r => r.minX));
        const maxX = Math.max(...rects.map(r => r.maxX));
        const minY = Math.min(...rects.map(r => r.minY));
        const maxY = Math.max(...rects.map(r => r.maxY));

        const padding = 100;
        const boardWidth = maxX - minX + padding * 2;
        const boardHeight = maxY - minY + padding * 2;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        const scaleX = screenWidth / boardWidth;
        const scaleY = screenHeight / boardHeight;
        const newScale = Math.min(Math.max(0.15, Math.min(scaleX, scaleY)), 1.5);

        const centerX = minX + (maxX - minX) / 2;
        const centerY = minY + (maxY - minY) / 2;

        setViewport({
            x: screenWidth / 2 - centerX * newScale,
            y: screenHeight / 2 - centerY * newScale,
            scale: newScale
        });
    }, [canvasItems, setViewport]);

    // Duplicate Selected Items
    const handleDuplicateSelected = useCallback(() => {
        if (selectedItemIds.size === 0) return;

        const duplicated: DraggableCanvasItem[] = [];
        const idMapping: Record<string, string> = {};

        // 1. Duplicate standard items
        canvasItems.forEach(item => {
            if (selectedItemIds.has(item.id) && item.type !== 'connection') {
                const newId = `${item.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                idMapping[item.id] = newId;

                duplicated.push({
                    ...item,
                    id: newId,
                    x: item.x + 40,
                    y: item.y + 40,
                    zIndex: getMaxZIndex() + 1
                });
            }
        });

        // 2. Duplicate connections where both ends are in the duplicated set
        canvasItems.forEach(item => {
            if (selectedItemIds.has(item.id) && item.type === 'connection') {
                const newFrom = idMapping[item.fromItem || ''];
                const newTo = idMapping[item.toItem || ''];

                if (newFrom && newTo) {
                    const newId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                    duplicated.push({
                        ...item,
                        id: newId,
                        fromItem: newFrom,
                        toItem: newTo,
                        zIndex: getMaxZIndex() + 1
                    });
                }
            }
        });

        if (duplicated.length > 0) {
            setCanvasItems(prev => [...prev, ...duplicated]);
            setSelectedItemIds(new Set(duplicated.map(i => i.id)));
        }
    }, [canvasItems, selectedItemIds, getMaxZIndex, setCanvasItems]);

    // Keyboard Listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('[contenteditable]') || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                if (selectedItemIds.size > 0) {
                    setCanvasItems(prev => prev.filter(item => !selectedItemIds.has(item.id)));
                    setSelectedItemIds(new Set());
                }
            }

            if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleDuplicateSelected();
            }

            if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                undo();
            }

            if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedItemIds, undo, redo, handleDuplicateSelected, setCanvasItems]);

    // Custom Item Pointer Down Dragging
    const handleItemPointerDown = (e: React.PointerEvent, clickedItem: DraggableCanvasItem) => {
        if (activeTool === 'eraser') {
            setCanvasItems(prev => prev.filter(item => item.id !== clickedItem.id));
            setSelectedItemIds(new Set());
            return;
        }

        if (activeTool === 'connection') {
            e.stopPropagation();
            if (!connectionStartId) {
                setConnectionStartId(clickedItem.id);
                // Set initial preview line to center of start item
                const w = clickedItem.width || 256;
                const h = clickedItem.height || 144;
                setTempConnectionLine({ x: clickedItem.x + w / 2, y: clickedItem.y + h / 2 });
            } else {
                if (connectionStartId !== clickedItem.id) {
                    const newConn: DraggableCanvasItem = {
                        id: `conn-${Date.now()}`,
                        type: 'connection',
                        fromItem: connectionStartId,
                        toItem: clickedItem.id,
                        color: '#6366f1',
                        borderWidth: 2,
                        x: 0,
                        y: 0,
                        zIndex: getMaxZIndex() + 1
                    };
                    setCanvasItems(prev => [...prev, newConn]);
                }
                setConnectionStartId(null);
                setTempConnectionLine(null);
            }
            return;
        }

        if (activeTool !== 'select') return;

        e.stopPropagation();

        let newSelected = new Set(selectedItemIds);
        if (e.shiftKey) {
            if (newSelected.has(clickedItem.id)) {
                newSelected.delete(clickedItem.id);
            } else {
                newSelected.add(clickedItem.id);
            }
        } else {
            if (!newSelected.has(clickedItem.id)) {
                newSelected = new Set([clickedItem.id]);
            }
        }
        setSelectedItemIds(newSelected);

        const startX = e.clientX;
        const startY = e.clientY;
        let hasDragged = false;
        const DRAG_THRESHOLD = 3; // pixels

        const initialPositions = canvasItems
            .filter(item => newSelected.has(item.id))
            .reduce((acc, item) => {
                acc[item.id] = { x: item.x, y: item.y };
                return acc;
            }, {} as Record<string, { x: number, y: number }>);

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            if (!hasDragged && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
                return;
            }
            hasDragged = true;

            const deltaX = dx / viewport.scale;
            const deltaY = dy / viewport.scale;

            setCanvasItemsState(prev => prev.map(item => {
                if (initialPositions[item.id]) {
                    return {
                        ...item,
                        x: initialPositions[item.id].x + deltaX,
                        y: initialPositions[item.id].y + deltaY
                    };
                }
                return item;
            }));
        };

        const handlePointerUp = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            // Save state in history stack only if we actually dragged
            if (hasDragged) {
                setCanvasItems(prev => [...prev]);
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    // Canvas Background Pointer Events (Draw Pen, Create Items, Pan)
    const panStartRef = useRef({ x: 0, y: 0 });

    const handleBackgroundPointerDown = (e: React.PointerEvent) => {
        if (!currentBoardId) return;

        const target = e.target as HTMLElement;
        if (target.closest('.pointer-events-auto') || target.closest('button')) {
            return;
        }

        // Clear any lingering text selection
        window.getSelection()?.removeAllRanges();

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const canvasX = (mouseX - viewport.x) / viewport.scale;
        const canvasY = (mouseY - viewport.y) / viewport.scale;

        const isMiddle = e.button === 1;
        const isSpace = isSpacePressed.current;

        if (isMiddle || isSpace || activeTool === 'pan') {
            setIsPanning(true);
            panStartRef.current = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
            if (canvasRef.current) {
                document.body.style.cursor = 'grabbing';
            }
            return;
        }

        if (activeTool === 'pen') {
            isDrawingRef.current = true;
            const drawingId = `drawing-${Date.now()}`;
            activeDrawingIdRef.current = drawingId;

            const initialPoint = { x: canvasX, y: canvasY };
            const newDrawing: DraggableCanvasItem = {
                id: drawingId,
                type: 'drawing',
                points: [initialPoint],
                color: penColor,
                borderWidth: penWidth,
                x: canvasX,
                y: canvasY,
                width: 1,
                height: 1,
                zIndex: getMaxZIndex() + 1
            };

            setCanvasItems(prev => [...prev, newDrawing], true);
            return;
        }

        if (activeTool === 'select') {
            // Cancel connection preview
            setConnectionStartId(null);
            setTempConnectionLine(null);
            
            // Delegate to selection hook
            handleBackgroundMouseDown(e as any);
            return;
        }
    };

    const handleBackgroundPointerMove = (e: React.PointerEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const canvasX = (mouseX - viewport.x) / viewport.scale;
        const canvasY = (mouseY - viewport.y) / viewport.scale;

        if (isPanning) {
            setViewport(prev => ({
                ...prev,
                x: e.clientX - panStartRef.current.x,
                y: e.clientY - panStartRef.current.y
            }));
            return;
        }

        if (isDrawingRef.current && activeDrawingIdRef.current) {
            const drawingId = activeDrawingIdRef.current;
            setCanvasItemsState(prev => prev.map(item => {
                if (item.id === drawingId && item.points) {
                    const newPoints = [...item.points, { x: canvasX, y: canvasY }];
                    const xs = newPoints.map(p => p.x);
                    const ys = newPoints.map(p => p.y);
                    const minX = Math.min(...xs);
                    const maxX = Math.max(...xs);
                    const minY = Math.min(...ys);
                    const maxY = Math.max(...ys);

                    return {
                        ...item,
                        points: newPoints,
                        x: minX,
                        y: minY,
                        width: Math.max(1, maxX - minX),
                        height: Math.max(1, maxY - minY)
                    };
                }
                return item;
            }));
            return;
        }

        if (activeTool === 'connection' && connectionStartId) {
            setTempConnectionLine({ x: canvasX, y: canvasY });
        }
    };

    const handleBackgroundPointerUp = () => {
        if (isPanning) {
            setIsPanning(false);
            document.body.style.cursor = '';
        }

        if (isDrawingRef.current && activeDrawingIdRef.current) {
            isDrawingRef.current = false;
            // Push final completed drawing to history
            setCanvasItems(prev => [...prev]);
            activeDrawingIdRef.current = null;
        }
    };

    // Canvas click: create note, text, shape
    const handleCanvasClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.pointer-events-auto') || target.closest('button')) {
            return;
        }

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const canvasX = (mouseX - viewport.x) / viewport.scale;
        const canvasY = (mouseY - viewport.y) / viewport.scale;

        const isDark = themeMode === 'dark';

        if (activeTool === 'note') {
            const newItem: DraggableCanvasItem = {
                id: `note-${Date.now()}`,
                type: 'note',
                text: 'Sticky Note',
                color: stickyColor,
                textColor: '#1c1917',
                x: canvasX - 128,
                y: canvasY - 128,
                width: 256,
                height: 256,
                zIndex: getMaxZIndex() + 1
            };
            setCanvasItems(prev => [...prev, newItem]);
            setSelectedItemIds(new Set([newItem.id]));
            setActiveTool('select');
        } else if (activeTool === 'text') {
            const newItem: DraggableCanvasItem = {
                id: `text-${Date.now()}`,
                type: 'text',
                text: 'Text Box',
                textColor: isDark ? '#ffffff' : '#18181b',
                fontSize: 24,
                x: canvasX - 100,
                y: canvasY - 40,
                width: 200,
                height: 80,
                zIndex: getMaxZIndex() + 1
            };
            setCanvasItems(prev => [...prev, newItem]);
            setSelectedItemIds(new Set([newItem.id]));
            setActiveTool('select');
        } else if (activeTool === 'shape') {
            const newItem: DraggableCanvasItem = {
                id: `shape-${Date.now()}`,
                type: 'shape',
                shapeType: shapeType,
                text: '',
                color: isDark ? '#1e1b4b' : '#e0e7ff', // indigo-950 vs indigo-100
                borderColor: isDark ? '#6366f1' : '#4f46e5', // indigo-500 vs indigo-600
                borderWidth: 2,
                textColor: isDark ? '#ffffff' : '#18181b',
                fontSize: 16,
                x: canvasX - 128,
                y: canvasY - 128,
                width: 256,
                height: 256,
                zIndex: getMaxZIndex() + 1
            };
            setCanvasItems(prev => [...prev, newItem]);
            setSelectedItemIds(new Set([newItem.id]));
            setActiveTool('select');
        }
    };

    // Handle manual image files upload selection
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!currentBoardId || !userProfile?.uid || !e.target.files) return;

        const files = Array.from(e.target.files);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Position placed in the center of active screen view
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        const dropX = (screenCenterX - viewport.x) / viewport.scale;
        const dropY = (screenCenterY - viewport.y) / viewport.scale;

        files.forEach(async (file, idx) => {
            if (file.type.startsWith('image/')) {
                try {
                    toast({
                        title: "Uploading image...",
                        description: `Uploading ${file.name}`
                    });

                    // Get dimensions from file (instant)
                    const { width: nw, height: nh } = await getImageDimensions(file);
                    const { width, height } = getConstrainedDimensions(nw, nh);

                    const downloadURL = await MoodboardService.uploadImage(userProfile.uid, file);
                    const canvasX = dropX + (idx * 30);
                    const canvasY = dropY + (idx * 30);

                    const newId = `img-${Date.now()}-${idx}`;
                    const newItem: DraggableCanvasItem = {
                        id: newId,
                        type: 'image',
                        video: {
                            id: newId,
                            title: file.name,
                            thumbnailUrl: downloadURL,
                            videoUrl: '',
                            description: 'Uploaded from computer',
                            tags: [],
                            posterUrl: downloadURL
                        } as Video,
                        x: canvasX - width / 2,
                        y: canvasY - height / 2,
                        width: width,
                        height: height,
                        zIndex: getMaxZIndex() + 1
                    };
                    setCanvasItems(prev => [...prev, newItem]);
                } catch (err) {
                    toast({
                        title: "Upload failed",
                        description: `Failed to upload ${file.name}`,
                        variant: "destructive"
                    });
                }
            }
        });

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Sidebar Library items add
    const handleAddVideo = (video: Video) => {
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        const localX = (screenCenterX - viewport.x) / viewport.scale - 128;
        const localY = (screenCenterY - viewport.y) / viewport.scale - 72;

        const newItem: DraggableCanvasItem = {
            id: `video-${Date.now()}`,
            type: 'video',
            video: video,
            x: localX,
            y: localY,
            width: 256,
            height: 144,
            zIndex: getMaxZIndex() + 1
        };
        setCanvasItems(prev => [...prev, newItem]);
        setSelectedItemIds(new Set([newItem.id]));
    };

    // Add multiple selected references to moodboard in a cascade grid
    const handleAddSelectedReferences = () => {
        if (selectedLibraryItemIds.size === 0) return;

        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        const dropX = (screenCenterX - viewport.x) / viewport.scale;
        const dropY = (screenCenterY - viewport.y) / viewport.scale;

        const newItems: DraggableCanvasItem[] = [];
        let index = 0;

        likedVideos.forEach(video => {
            if (selectedLibraryItemIds.has(video.id)) {
                // Cascading offsets to avoid total overlap
                const canvasX = dropX + (index * 35) - 192;
                const canvasY = dropY + (index * 35) - 108;
                const newId = `img-${Date.now()}-${index}`;

                newItems.push({
                    id: newId,
                    type: 'image',
                    video: video,
                    x: canvasX,
                    y: canvasY,
                    width: 384,
                    height: 216,
                    zIndex: getMaxZIndex() + 1 + index
                });
                index++;
            }
        });

        if (newItems.length > 0) {
            setCanvasItems(prev => [...prev, ...newItems]);
            setSelectedItemIds(new Set(newItems.map(item => item.id)));
            toast({
                title: "Added items to board",
                description: `Successfully imported ${newItems.length} references.`
            });
        }

        // Cleanup selection state and close library
        setSelectedLibraryItemIds(new Set());
        setIsSelectMode(false);
        setIsLibraryOpen(false);
    };

    // HTML5 Drag and Drop into Canvas
    const handleCanvasDrop = (e: React.DragEvent) => {
        e.preventDefault();

        // 1. Handle desktop file drops
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect || !userProfile?.uid) return;

            const dropX = e.clientX - rect.left - viewport.x;
            const dropY = e.clientY - rect.top - viewport.y;

            Array.from(e.dataTransfer.files).forEach(async (file, idx) => {
                if (file.type.startsWith('image/')) {
                    try {
                        toast({
                            title: "Uploading dropped image...",
                            description: `Uploading ${file.name}`
                        });

                        // Get dimensions from file (instant)
                        const { width: nw, height: nh } = await getImageDimensions(file);
                        const { width, height } = getConstrainedDimensions(nw, nh);

                        const downloadURL = await MoodboardService.uploadImage(userProfile.uid, file);
                        const canvasX = dropX / viewport.scale + (idx * 30);
                        const canvasY = dropY / viewport.scale + (idx * 30);

                        const newId = `img-${Date.now()}-${idx}`;
                        const newItem: DraggableCanvasItem = {
                            id: newId,
                            type: 'image',
                            video: {
                                id: newId,
                                title: file.name,
                                thumbnailUrl: downloadURL,
                                videoUrl: '',
                                description: 'Dropped from computer',
                                tags: [],
                                posterUrl: downloadURL
                            } as Video,
                            x: canvasX - width / 2,
                            y: canvasY - height / 2,
                            width: width,
                            height: height,
                            zIndex: getMaxZIndex() + 1
                        };
                        setCanvasItems(prev => [...prev, newItem]);
                    } catch (err) {
                        toast({
                            title: "Upload failed",
                            description: `Failed to upload ${file.name}`,
                            variant: "destructive"
                        });
                    }
                }
            });
            return;
        }

        // 2. Handle sidebar items dragging
        const videoDataStr = e.dataTransfer.getData('application/json');
        if (videoDataStr) {
            try {
                const { video, offsetX, offsetY } = JSON.parse(videoDataStr);
                const rect = canvasRef.current?.getBoundingClientRect();
                if (!rect) return;

                const dropX = e.clientX - rect.left - viewport.x;
                const dropY = e.clientY - rect.top - viewport.y;
                
                // Position card keeping the exact pointer offset during drag!
                const canvasX = dropX / viewport.scale - (offsetX || 128) / viewport.scale;
                const canvasY = dropY / viewport.scale - (offsetY || 72) / viewport.scale;

                const newItem: DraggableCanvasItem = {
                    id: `video-${Date.now()}`,
                    type: 'video',
                    video: video,
                    x: canvasX,
                    y: canvasY,
                    width: 256,
                    height: 144,
                    zIndex: getMaxZIndex() + 1
                };
                setCanvasItems(prev => [...prev, newItem]);
                setSelectedItemIds(new Set([newItem.id]));
            } catch (err) {
                // Fallback for legacy drag-and-drop objects
                try {
                    const video = JSON.parse(videoDataStr);
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (!rect) return;

                    const dropX = e.clientX - rect.left - viewport.x;
                    const dropY = e.clientY - rect.top - viewport.y;
                    const canvasX = dropX / viewport.scale - 128;
                    const canvasY = dropY / viewport.scale - 72;

                    const newItem: DraggableCanvasItem = {
                        id: `video-${Date.now()}`,
                        type: 'video',
                        video: video,
                        x: canvasX,
                        y: canvasY,
                        width: 256,
                        height: 144,
                        zIndex: getMaxZIndex() + 1
                    };
                    setCanvasItems(prev => [...prev, newItem]);
                    setSelectedItemIds(new Set([newItem.id]));
                } catch (e2) {
                    console.error("Failed to parse dragged video data", e2);
                }
            }
        }
    };

    // Property toolbar callbacks
    const handleUpdateSelectedProperties = useCallback((updatedFields: Partial<DraggableCanvasItem>) => {
        if (selectedItemIds.size === 0) return;
        setCanvasItems(prev => prev.map(item => {
            if (selectedItemIds.has(item.id)) {
                return {
                    ...item,
                    ...updatedFields
                };
            }
            return item;
        }));
    }, [selectedItemIds, setCanvasItems]);

    const handleDeleteSelected = useCallback(() => {
        if (selectedItemIds.size === 0) return;
        setCanvasItems(prev => prev.filter(item => !selectedItemIds.has(item.id)));
        setSelectedItemIds(new Set());
    }, [selectedItemIds, setCanvasItems]);

    const handleBringToFront = useCallback(() => {
        if (selectedItemIds.size === 0) return;
        const maxZ = getMaxZIndex();
        let i = 1;
        setCanvasItems(prev => prev.map(item => {
            if (selectedItemIds.has(item.id)) {
                return {
                    ...item,
                    zIndex: maxZ + (i++)
                };
            }
            return item;
        }));
    }, [selectedItemIds, getMaxZIndex, setCanvasItems]);

    const handleSendToBack = useCallback(() => {
        if (selectedItemIds.size === 0) return;
        const minZ = Math.min(...canvasItems.map(item => item.zIndex || 0));
        let i = 1;
        setCanvasItems(prev => prev.map(item => {
            if (selectedItemIds.has(item.id)) {
                return {
                    ...item,
                    zIndex: minZ - (i++)
                };
            }
            return item;
        }));
    }, [selectedItemIds, canvasItems, setCanvasItems]);

    // Clear board
    const handleClearBoard = () => {
        if (confirm("Are you sure you want to delete all elements from this board?")) {
            setCanvasItems([]);
            setSelectedItemIds(new Set());
        }
    };

    // Selected Items array for the property toolbar
    const selectedItemsList = canvasItems.filter(i => selectedItemIds.has(i.id));

    // Render connection line start anchor centers
    const getStartAnchorCenter = () => {
        if (!connectionStartId) return null;
        const fromEl = canvasItems.find(i => i.id === connectionStartId);
        if (!fromEl) return null;

        const w = fromEl.width || 256;
        const h = fromEl.height || 144;
        return {
            x: fromEl.x + w / 2,
            y: fromEl.y + h / 2
        };
    };

    const startAnchor = getStartAnchorCenter();

    // Map cursor for active tool
    const getCanvasCursor = () => {
        if (isPanning) return 'grabbing';
        if (isSpacePressed.current) return 'grab';
        
        switch (activeTool) {
            case 'pan': return 'grab';
            case 'pen': return 'crosshair';
            case 'text': return 'text';
            case 'note': return 'cell';
            case 'shape': return 'crosshair';
            case 'connection': return 'alias';
            case 'eraser': return 'not-allowed';
            case 'select':
            default: return 'default';
        }
    };

    const isDark = themeMode === 'dark';

    return (
        <div
            id="canvas-container"
            className={`flex w-full h-full overflow-hidden relative font-sans touch-none select-none transition-colors duration-300 ${
                isDark ? 'bg-[#050505] text-white' : 'bg-[#f4f5f7] text-zinc-900'
            }`}
            onPointerDown={handleBackgroundPointerDown}
            onPointerMove={handleBackgroundPointerMove}
            onPointerUp={handleBackgroundPointerUp}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCanvasDrop}
            onClick={handleCanvasClick}
            onContextMenu={(e) => {
                e.preventDefault();
                if (e.target === e.currentTarget) {
                    setContextMenu(prev => ({ ...prev, visible: false }));
                }
            }}
            style={{ cursor: getCanvasCursor() }}
        >
            <style jsx global>{`
                .select-none, .select-none * {
                    user-select: none !important;
                    -webkit-user-select: none !important;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {/* Dynamic Grid Background that pans & scales */}
            <div
                className="absolute inset-0 pointer-events-none transition-all duration-75"
                style={{
                    backgroundImage: isDark
                        ? 'radial-gradient(circle, rgba(255,255,255,0.08) 1.5px, transparent 1.5px)'
                        : 'radial-gradient(circle, rgba(0,0,0,0.08) 1.5px, transparent 1.5px)',
                    backgroundSize: `${24 * viewport.scale}px ${24 * viewport.scale}px`,
                    backgroundPosition: `${viewport.x}px ${viewport.y}px`
                }}
            />

            {/* Top Bar Navigation */}
            <div className="absolute top-4 left-4 z-40 flex items-center gap-4">
                {currentBoardId && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                            // Capture Thumbnail
                            if (userProfile?.uid && currentBoardId) {
                                try {
                                    const canvasNode = document.getElementById('canvas-container');
                                    if (canvasNode) {
                                        const dataUrl = await toPng(canvasNode, {
                                            quality: 0.8,
                                            pixelRatio: 0.5,
                                            skipFonts: true,
                                            filter: (node) => {
                                                if (node instanceof HTMLElement) {
                                                    // Exclude UI overlays
                                                    if (node.classList?.contains('absolute') && node.classList?.contains('top-4')) return false;
                                                    if (node.classList?.contains('left-4') && node.classList?.contains('top-1/2')) return false;
                                                    if (node.classList?.contains('bottom-6') && node.classList?.contains('left-6')) return false;
                                                    if (node.classList?.contains('bottom-6') && node.classList?.contains('right-6')) return false;
                                                    if (node.innerHTML?.includes('Open Library')) return false;
                                                    if (node.innerHTML?.includes('My Liked Videos')) return false;
                                                    if (node.id === 'context-menu-container') return false;
                                                }
                                                return true;
                                            }
                                        });

                                        const res = await fetch(dataUrl);
                                        const blob = await res.blob();
                                        const url = await MoodboardService.uploadImage(userProfile.uid, blob);

                                        // Serialize items for save
                                        const itemsToSave: MoodboardItem[] = canvasItems.map(item => {
                                            const cleanItem: MoodboardItem = {
                                                id: item.id,
                                                type: item.type,
                                                x: item.x,
                                                y: item.y,
                                                width: item.width,
                                                height: item.height,
                                                color: item.color,
                                                zIndex: item.zIndex || 1,
                                                text: item.text || '',
                                                shapeType: item.shapeType,
                                                borderColor: item.borderColor,
                                                borderWidth: item.borderWidth,
                                                fontSize: item.fontSize,
                                                textColor: item.textColor,
                                                points: item.points,
                                                fromItem: item.fromItem,
                                                toItem: item.toItem
                                            };

                                            if (item.type === 'video' || item.type === 'image') {
                                                const isVideo = 'videoUrl' in item.video! && item.video.videoUrl;
                                                cleanItem.videoData = JSON.parse(JSON.stringify(item.video));
                                                cleanItem.videoId = isVideo ? item.video!.id : null;
                                                cleanItem.imageUrl = !isVideo ? (item.video as any).thumbnailUrl || (item.video as any).url : null;
                                            }
                                            return cleanItem;
                                        });

                                        await MoodboardService.saveMoodboard(userProfile.uid, currentBoardId, itemsToSave, url);
                                    }
                                } catch (e) {
                                    console.error("Failed to generate thumbnail", e);
                                }
                            }
                            router.push('/moodboard');
                            setSelectedItemIds(new Set());
                        }}
                        className={`backdrop-blur-md border hover:scale-105 active:scale-95 h-12 w-12 rounded-full transition-all flex items-center justify-center ${
                            isDark 
                                ? 'bg-black/50 border-white/10 hover:bg-white/10 text-white' 
                                : 'bg-white/70 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
                        }`}
                        title="Back to Dashboard"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                )}
            </div>

            {/* Dashboard View */}
            {!currentBoardId && (
                <div className="absolute inset-0 z-10 px-12 pb-12 pt-24 overflow-y-auto bg-white">
                    <div className="max-w-7xl mx-auto space-y-8">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight leading-normal bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent pb-1">My Moodboards</h1>
                            <p className="text-zinc-500">Manage and organize your creative spaces</p>
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
                                        router.push(`/moodboard?board=${newId}`);
                                    }
                                }}
                                className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-zinc-300 hover:border-indigo-400 bg-zinc-50 hover:bg-indigo-50/50 transition-all flex flex-col items-center justify-center gap-4 group cursor-pointer"
                            >
                                <div className="w-16 h-16 rounded-full bg-zinc-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                                    <Plus className="w-8 h-8 text-zinc-400 group-hover:text-indigo-500" />
                                </div>
                                <span className="text-zinc-500 group-hover:text-indigo-600 font-medium">Create New Board</span>
                            </button>

                            {/* Existing Boards */}
                            {moodboards.map((board) => (
                                <div
                                    key={board.id}
                                    onClick={() => router.push(`/moodboard?board=${board.id}`)}
                                    className="group relative cursor-pointer"
                                >
                                    <div className="aspect-[4/3] rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden relative transition-all duration-300 group-hover:border-indigo-400 group-hover:shadow-2xl group-hover:shadow-indigo-500/10">
                                        {board.thumbnailUrl ? (
                                            <img
                                                src={board.thumbnailUrl}
                                                alt={board.name}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                                <Layout className="w-12 h-12 text-zinc-400" />
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
                                                <PopoverContent className="w-40 p-1 bg-white border border-zinc-200 text-zinc-700 shadow-lg">
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
                                                className="bg-transparent border-b border-indigo-500 text-white font-medium w-full outline-none py-0.5"
                                                value={tempName}
                                                onChange={(e) => setThemeMode(prev => prev)} // dummy
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
                                                className="font-medium text-zinc-700 group-hover:text-indigo-600 truncate transition-colors"
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
                >


                    {canvasItems.length === 0 && (
                        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none animate-in fade-in zoom-in duration-500 ${
                            isDark ? 'text-zinc-500' : 'text-zinc-400'
                        }`}>
                            <div className="text-center space-y-4">
                                <div className={`p-6 rounded-full inline-block backdrop-blur-sm border ${
                                    isDark ? 'bg-zinc-900/50 border-white/5' : 'bg-white/80 border-zinc-200 shadow-md'
                                }`}>
                                    <ImageIcon className="h-12 w-12 mx-auto text-zinc-400" />
                                </div>
                                <div className="space-y-1">
                                    <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-zinc-800'}`}>Your board is empty</p>
                                    <p className="text-sm">Use the left toolbar to draw, write, or drop shapes</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Viewport Transform Container */}
                    <div
                        style={{
                            transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
                            transformOrigin: 'top left',
                            width: '100%',
                            height: '100%',
                            position: 'absolute',
                            left: 0,
                            top: 0
                        }}
                    >
                        {/* Global Connection lines Layer (Drawn below items) */}
                        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-[2]">
                            <defs>
                                <marker
                                    id="arrowhead"
                                    viewBox="0 0 10 10"
                                    refX="6"
                                    refY="5"
                                    markerWidth="7"
                                    markerHeight="7"
                                    orient="auto-start-reverse"
                                >
                                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={isDark ? '#6366f1' : '#4f46e5'} />
                                </marker>
                            </defs>
                            
                            {canvasItems
                                .filter(item => item.type === 'connection' && item.fromItem && item.toItem)
                                .map(item => (
                                    <ConnectionLine
                                        key={item.id}
                                        id={item.id}
                                        fromItem={item.fromItem!}
                                        toItem={item.toItem!}
                                        color={item.color}
                                        borderWidth={item.borderWidth}
                                        canvasItems={canvasItems}
                                    />
                                ))}

                            {/* Temporary connection preview */}
                            {activeTool === 'connection' && startAnchor && tempConnectionLine && (
                                <line
                                    x1={startAnchor.x}
                                    y1={startAnchor.y}
                                    x2={tempConnectionLine.x}
                                    y2={tempConnectionLine.y}
                                    stroke={isDark ? '#6366f1' : '#4f46e5'}
                                    strokeWidth={2}
                                    strokeDasharray="4,4"
                                />
                            )}
                        </svg>

                        {/* Whiteboard Elements */}
                        {canvasItems
                            .filter(item => item.type !== 'connection')
                            .map((item, index) => (
                                <CanvasItem
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    zoomScale={viewport.scale}
                                    onRemove={() => {
                                        setCanvasItems(prev => prev.filter(i => i.id !== item.id));
                                        setSelectedItemIds(prev => {
                                            const next = new Set(prev);
                                            next.delete(item.id);
                                            return next;
                                        });
                                    }}
                                    onMaximize={() => setExpandedVideo(item.video || null)}
                                    onUpdate={(id, text) => {
                                        setCanvasItems(prev => prev.map(i => i.id === id ? { ...i, text } : i));
                                    }}
                                    onResize={(id, width, height) => {
                                        setCanvasItems(prev => prev.map(i => i.id === id ? { ...i, width, height } : i));
                                    }}
                                    isSelected={selectedItemIds.has(item.id)}
                                    onSelect={(e) => {
                                        e.stopPropagation();
                                        if (e.shiftKey) {
                                            setSelectedItemIds(prev => {
                                                const next = new Set(prev);
                                                if (next.has(item.id)) next.delete(item.id);
                                                else next.add(item.id);
                                                return next;
                                            });
                                        } else {
                                            if (!selectedItemIds.has(item.id)) {
                                                setSelectedItemIds(new Set([item.id]));
                                            }
                                        }
                                    }}
                                    onPointerDown={handleItemPointerDown}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        // Center view on element at 100% scale
                                        const screenCenterX = window.innerWidth / 2;
                                        const screenCenterY = window.innerHeight / 2;
                                        const w = item.width || 256;
                                        const h = item.height || 256;
                                        const itemCenterX = item.x + w / 2;
                                        const itemCenterY = item.y + h / 2;

                                        setViewport({
                                            x: screenCenterX - itemCenterX,
                                            y: screenCenterY - itemCenterY,
                                            scale: 1
                                        });
                                    }}
                                />
                            ))}
                    </div>

                    {/* Marquee Selection Visual */}
                    {marqueeSelectionRect && (
                        <div
                            className="absolute border border-indigo-500 bg-indigo-500/10 z-50 pointer-events-none rounded"
                            style={{
                                left: marqueeSelectionRect.x,
                                top: marqueeSelectionRect.y,
                                width: marqueeSelectionRect.w,
                                height: marqueeSelectionRect.h,
                            }}
                        />
                    )}

                    {/* Context Right Click Menu */}
                    {contextMenu.visible && (
                        <div
                            id="context-menu-container"
                            className={`absolute border rounded-lg shadow-2xl p-1 z-[200] w-48 animate-in fade-in zoom-in-95 duration-100 ${
                                isDark ? 'bg-[#0f0c1d] border-white/10' : 'bg-white border-zinc-200 text-zinc-800'
                            }`}
                            style={{ top: contextMenu.y, left: contextMenu.x }}
                        >
                            <button
                                onClick={() => {
                                    undo();
                                    setContextMenu(prev => ({ ...prev, visible: false }));
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                                    isDark ? 'text-zinc-300 hover:bg-white/10 hover:text-white' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                                }`}
                            >
                                <span>Undo</span>
                                <span className="text-[10px] text-zinc-500">Ctrl+Z</span>
                            </button>
                            <button
                                onClick={() => {
                                    redo();
                                    setContextMenu(prev => ({ ...prev, visible: false }));
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                                    isDark ? 'text-zinc-300 hover:bg-white/10 hover:text-white' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                                }`}
                            >
                                <span>Redo</span>
                                <span className="text-[10px] text-zinc-500">Ctrl+Y</span>
                            </button>
                            <div className={`h-px my-1 ${isDark ? 'bg-white/10' : 'bg-zinc-100'}`} />
                            <button
                                onClick={() => {
                                    handleDuplicateSelected();
                                    setContextMenu(prev => ({ ...prev, visible: false }));
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                                    isDark ? 'text-zinc-300 hover:bg-white/10 hover:text-white' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                                }`}
                            >
                                <span>Duplicate</span>
                                <span className="text-[10px] text-zinc-500">Ctrl+D</span>
                            </button>
                            <button
                                onClick={() => {
                                    handleDeleteSelected();
                                    setContextMenu(prev => ({ ...prev, visible: false }));
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                                    isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-500/10'
                                }`}
                            >
                                <span>Delete</span>
                                <span className="text-[10px] text-red-500/50">Delete</span>
                            </button>
                        </div>
                    )}

                    {/* Floating Left Toolbar (Miro Toolbox) */}
                    <div 
                        className={`absolute left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1.5 border backdrop-blur-xl p-2 rounded-2xl shadow-xl transition-all duration-300 select-none ${
                            isDark 
                                ? 'bg-[#0c0a1c]/90 border-indigo-500/20 text-white' 
                                : 'bg-white/95 border-zinc-200 text-zinc-800'
                        }`}
                    >
                        {/* Select Tool */}
                        <button
                            onClick={() => {
                                setActiveTool('select');
                                setConnectionStartId(null);
                                setTempConnectionLine(null);
                            }}
                            className={`p-2.5 rounded-xl transition-all ${
                                activeTool === 'select'
                                    ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                    : isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                            title="Select (V)"
                        >
                            <MousePointer className="h-5 w-5" />
                        </button>

                        {/* Hand/Pan Tool */}
                        <button
                            onClick={() => {
                                setActiveTool('pan');
                                setConnectionStartId(null);
                                setTempConnectionLine(null);
                            }}
                            className={`p-2.5 rounded-xl transition-all ${
                                activeTool === 'pan'
                                    ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                    : isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                            title="Pan (H)"
                        >
                            <Hand className="h-5 w-5" />
                        </button>

                        {/* Text Tool */}
                        <button
                            onClick={() => {
                                setActiveTool('text');
                                setSelectedItemIds(new Set());
                            }}
                            className={`p-2.5 rounded-xl transition-all ${
                                activeTool === 'text'
                                    ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                    : isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                            title="Text"
                        >
                            <Type className="h-5 w-5" />
                        </button>

                        {/* Sticky Note Tool */}
                        <div className="relative group/note">
                            <button
                                onClick={() => {
                                    setActiveTool('note');
                                    setSelectedItemIds(new Set());
                                }}
                                className={`p-2.5 rounded-xl transition-all ${
                                    activeTool === 'note'
                                        ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                        : isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                                }`}
                                title="Sticky Note"
                            >
                                <StickyNote className="h-5 w-5" />
                            </button>
                            {/* Note Color Picker Flyout */}
                            {activeTool === 'note' && (
                                <div className={`absolute left-14 top-0 flex items-center gap-1 border p-1.5 rounded-lg shadow-xl ml-2 ${
                                    isDark ? 'bg-[#0f0d23] border-white/10' : 'bg-white border-zinc-200'
                                }`}>
                                    {['#fef08a', '#dcfce7', '#dbeafe', '#fce7f3', '#ffedd5', '#f3e8ff'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setStickyColor(c)}
                                            className={`w-4 h-4 rounded-full border transition-transform ${
                                                stickyColor === c ? 'border-zinc-500 scale-110' : 'border-transparent hover:scale-105'
                                            }`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Shape Tool */}
                        <div className="relative group/shape">
                            <button
                                onClick={() => {
                                    setActiveTool('shape');
                                    setSelectedItemIds(new Set());
                                }}
                                className={`p-2.5 rounded-xl transition-all ${
                                    activeTool === 'shape'
                                        ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                        : isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                                }`}
                                title="Shapes"
                            >
                                <Square className="h-5 w-5" />
                            </button>
                            {/* Shape Selector Flyout */}
                            {activeTool === 'shape' && (
                                <div className={`absolute left-14 top-0 flex items-center gap-1.5 border p-1.5 rounded-lg shadow-xl ml-2 ${
                                    isDark ? 'bg-[#0f0d23] border-white/10' : 'bg-white border-zinc-200'
                                }`}>
                                    <button
                                        onClick={() => setShapeType('rectangle')}
                                        className={`p-1 rounded hover:bg-indigo-600/10 text-zinc-400 hover:text-indigo-400 ${shapeType === 'rectangle' ? 'bg-indigo-600/15 text-indigo-500' : ''}`}
                                        title="Rectangle"
                                    >
                                        <Square className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setShapeType('circle')}
                                        className={`p-1 rounded hover:bg-indigo-600/10 text-zinc-400 hover:text-indigo-400 ${shapeType === 'circle' ? 'bg-indigo-600/15 text-indigo-500' : ''}`}
                                        title="Circle"
                                    >
                                        <Circle className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setShapeType('triangle')}
                                        className={`p-1 rounded hover:bg-indigo-600/10 text-zinc-400 hover:text-indigo-400 ${shapeType === 'triangle' ? 'bg-indigo-600/15 text-indigo-500' : ''}`}
                                        title="Triangle"
                                    >
                                        <Triangle className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setShapeType('arrow-right')}
                                        className={`p-1 rounded hover:bg-indigo-600/10 text-zinc-400 hover:text-indigo-400 ${shapeType === 'arrow-right' ? 'bg-indigo-600/15 text-indigo-500' : ''}`}
                                        title="Arrow Right"
                                    >
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Pen Drawing Tool */}
                        <div className="relative group/pen">
                            <button
                                onClick={() => {
                                    setActiveTool('pen');
                                    setSelectedItemIds(new Set());
                                    setConnectionStartId(null);
                                    setTempConnectionLine(null);
                                }}
                                className={`p-2.5 rounded-xl transition-all ${
                                    activeTool === 'pen'
                                        ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                        : isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                                }`}
                                title="Pen Tool"
                            >
                                <Pen className="h-5 w-5" />
                            </button>
                            {/* Pen color flyout */}
                            {activeTool === 'pen' && (
                                <div className={`absolute left-14 top-0 flex flex-col gap-2 border p-2 rounded-lg shadow-xl ml-2 text-xs ${
                                    isDark ? 'bg-[#0f0d23] border-white/10' : 'bg-white border-zinc-200'
                                }`}>
                                    <div className="flex gap-1.5">
                                        {[isDark ? '#ffffff' : '#18181b', '#ef4444', '#22c55e', '#3b82f6', '#eab308'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setPenColor(c)}
                                                className={`w-4 h-4 rounded-full border transition-transform ${
                                                    penColor === c ? 'border-zinc-400 scale-110' : 'border-transparent hover:scale-105'
                                                }`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                    <div className={`h-px ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`} />
                                    <div className={`flex justify-between items-center gap-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                        <span>Size</span>
                                        <div className="flex gap-1">
                                            {[2, 4, 6].map(w => (
                                                <button
                                                    key={w}
                                                    onClick={() => setPenWidth(w)}
                                                    className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                                                        penWidth === w ? 'bg-indigo-600 border-indigo-500 text-white' : isDark ? 'border-white/5 hover:bg-white/5 text-zinc-400' : 'border-zinc-200 hover:bg-zinc-50 text-zinc-500'
                                                    }`}
                                                >
                                                    {w}px
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Connection Tool */}
                        <button
                            onClick={() => {
                                setActiveTool('connection');
                                setSelectedItemIds(new Set());
                                setConnectionStartId(null);
                                setTempConnectionLine(null);
                            }}
                            className={`p-2.5 rounded-xl transition-all ${
                                activeTool === 'connection'
                                    ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                    : isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                            title="Connection Line"
                        >
                            <ArrowUpRight className="h-5 w-5" />
                        </button>

                        {/* Image Upload Tool */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className={`p-2.5 rounded-xl transition-all ${
                                isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                            title="Upload Images"
                        >
                            <ImageIcon className="h-5 w-5" />
                        </button>

                        {/* Eraser Tool */}
                        <button
                            onClick={() => {
                                setActiveTool('eraser');
                                setConnectionStartId(null);
                                setTempConnectionLine(null);
                            }}
                            className={`p-2.5 rounded-xl transition-all ${
                                activeTool === 'eraser'
                                    ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                    : isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                            title="Eraser (E)"
                        >
                            <Eraser className="h-5 w-5" />
                        </button>

                        <div className={`w-8 h-px my-1 ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`} />

                        {/* Clear Board */}
                        <button
                            onClick={handleClearBoard}
                            className={`p-2.5 rounded-xl transition-colors ${
                                isDark ? 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10' : 'text-zinc-400 hover:text-red-600 hover:bg-red-500/10'
                            }`}
                            title="Clear Board"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Floating Property Toolbar */}
                    {selectedItemsList.length > 0 && (
                        <PropertyToolbar
                            selectedItems={selectedItemsList}
                            viewport={viewport}
                            themeMode={themeMode}
                            onUpdateItems={handleUpdateSelectedProperties}
                            onDeleteItems={handleDeleteSelected}
                            onDuplicateItems={handleDuplicateSelected}
                            onBringToFront={handleBringToFront}
                            onSendToBack={handleSendToBack}
                        />
                    )}

                    {/* Navigation Controls (Bottom Right) */}
                    <div 
                        className={`absolute bottom-6 right-6 z-50 flex items-center gap-1.5 border backdrop-blur-xl px-2.5 py-1.5 rounded-xl shadow-2xl transition-all duration-300 ${
                            isDark 
                                ? 'bg-[#0c0a1c]/90 border-indigo-500/20' 
                                : 'bg-white/95 border-zinc-200'
                        }`}
                    >
                        <button
                            onClick={handleZoomOut}
                            className={`p-1.5 rounded-lg transition-colors ${
                                isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                            title="Zoom Out"
                        >
                            <ZoomOut className="h-4.5 w-4.5" />
                        </button>
                        <span className={`text-xs font-mono font-semibold px-2 min-w-[48px] text-center ${
                            isDark ? 'text-zinc-300' : 'text-zinc-700'
                        }`}>
                            {Math.round(viewport.scale * 100)}%
                        </span>
                        <button
                            onClick={handleZoomIn}
                            className={`p-1.5 rounded-lg transition-colors ${
                                isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                            title="Zoom In"
                        >
                            <ZoomIn className="h-4.5 w-4.5" />
                        </button>
                        <div className={`w-px h-4 mx-0.5 ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`} />
                        <button
                            onClick={handleFitToScreen}
                            className={`p-1.5 rounded-lg transition-colors ${
                                isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                            title="Fit Screen"
                        >
                            <Maximize2 className="h-4.5 w-4.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom Left Toolbar Row (Library Button + Theme Switcher) */}
            {currentBoardId && (
                <div 
                    className="absolute bottom-6 left-6 z-50 flex items-center gap-3" 
                    ref={libraryButtonRef} 
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {/* Open Library Button */}
                    <Button
                        onClick={() => setIsLibraryOpen(!isLibraryOpen)}
                        className={`h-12 px-6 rounded-xl shadow-2xl border transition-all duration-300 font-semibold text-xs tracking-wide
                        ${isLibraryOpen
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-500 shadow-indigo-600/10'
                            : isDark
                                ? 'bg-black/85 text-white border-indigo-500/20 hover:bg-black/95 hover:scale-105'
                                : 'bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50 hover:scale-105'
                        }`}
                    >
                        {isLibraryOpen ? 'Close Library' : 'Open Library'}
                    </Button>

                    {/* Dark/Light Theme Toggle */}
                    <Button
                        onClick={() => {
                            const nextTheme = themeMode === 'dark' ? 'light' : 'dark';
                            setThemeMode(nextTheme);
                            // Adjust default draw stroke color to fit the new mode
                            if (penColor === '#ffffff' && nextTheme === 'light') {
                                setPenColor('#18181b');
                            } else if (penColor === '#18181b' && nextTheme === 'dark') {
                                setPenColor('#ffffff');
                            }
                        }}
                        className={`h-12 w-12 p-0 rounded-xl shadow-2xl border transition-all duration-300 hover:scale-105 flex items-center justify-center
                        ${isDark 
                            ? 'bg-black/85 border-indigo-500/20 text-zinc-300 hover:bg-black/95 hover:text-white' 
                            : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                        }`}
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDark ? (
                            <Sun className="h-5 w-5 text-amber-400" />
                        ) : (
                            <Moon className="h-5 w-5 text-indigo-600" />
                        )}
                    </Button>
                </div>
            )}

            {/* Floating Library Drawer (Large white Centered CMS overlay) */}
            {currentBoardId && isLibraryOpen && (
                <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-xs transition-all duration-300 animate-in fade-in duration-200">
                    <div className="relative">
                        {/* Close button — overlaid on panel corner */}
                        <button
                            onClick={() => {
                                setIsLibraryOpen(false);
                                setIsSelectMode(false);
                                setSelectedLibraryItemIds(new Set());
                            }}
                            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-all cursor-pointer hover:scale-110 shadow-sm"
                            title="Close Library"
                        >
                            <X className="h-5 w-5" />
                        </button>

                    <div
                        ref={libraryRef}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-[94vw] max-w-6xl h-[82vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-800 border border-zinc-200/80 animate-in zoom-in-95 duration-200"
                    >
                        {/* 1. Header Area */}
                        <div className="p-4 border-b border-zinc-150 bg-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-2.5 h-6 bg-indigo-600 rounded-full" />
                                <h2 className="text-base font-bold text-zinc-800 tracking-tight">Saved References Library</h2>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full text-zinc-500 bg-zinc-100 uppercase tracking-wide">
                                    {likedVideos.length} Items Total
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {/* Select Multiple Toggle */}
                                {likedVideos.length > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setIsSelectMode(!isSelectMode);
                                            setSelectedLibraryItemIds(new Set()); // Reset selections
                                        }}
                                        className={`h-8.5 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                                            isSelectMode 
                                                ? 'bg-zinc-800 border-zinc-800 text-white shadow-sm' 
                                                : 'bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'
                                        }`}
                                    >
                                        {isSelectMode ? 'Cancel Selection' : 'Select Multiple'}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* 2. Navigation & Tabs Bar */}
                        <div className="px-6 py-2.5 border-b border-zinc-150 bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Tab Filters */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                                {[
                                    { id: 'all', label: 'All Saved' },
                                    { id: 'video', label: 'Videos' },
                                    { id: 'short', label: 'Short Films' },
                                    { id: '2d', label: '2D Animation' },
                                    { id: '3d', label: '3D Animation' },
                                    { id: 'collections', label: 'Collections' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setSelectedMediaType(tab.id as any);
                                            setSelectedCollectionTag(null);
                                        }}
                                        className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                                            selectedMediaType === tab.id
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Tags Multi-select Dropdown */}
                                {selectedMediaType !== 'collections' && (
                                    <div className="relative" ref={tagsDropdownRef}>
                                        <button 
                                            onClick={() => setIsTagsDropdownOpen(!isTagsDropdownOpen)}
                                            className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-650 hover:text-zinc-800 hover:bg-zinc-50 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer select-none"
                                        >
                                            Tags {selectedLibraryTags.length > 0 && `(${selectedLibraryTags.length})`}
                                            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                                        </button>

                                        {/* Dropdown list */}
                                        {isTagsDropdownOpen && (
                                            <div className="absolute right-0 mt-1.5 w-56 rounded-2xl border border-zinc-200 bg-white shadow-2xl z-50 p-2 max-h-60 overflow-y-auto">
                                                {allUniqueTags.length === 0 ? (
                                                    <div className="text-[10px] text-zinc-400 p-2 text-center">No tags available</div>
                                                ) : (
                                                    <div className="space-y-0.5">
                                                        {allUniqueTags.map(tag => {
                                                            const isChecked = selectedLibraryTags.includes(tag);
                                                            return (
                                                                <label 
                                                                    key={tag}
                                                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer text-xs font-semibold text-zinc-700 select-none"
                                                                >
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => {
                                                                            if (isChecked) {
                                                                                setSelectedLibraryTags(prev => prev.filter(t => t !== tag));
                                                                            } else {
                                                                                setSelectedLibraryTags(prev => [...prev, tag]);
                                                                            }
                                                                        }}
                                                                        className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                                                    />
                                                                    #{tag}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Search bar inside header */}
                                {likedVideos.length > 0 && (
                                    <div className="relative w-full md:w-64 shrink-0">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                                        <input
                                            type="text"
                                            placeholder={
                                                selectedMediaType === 'collections' && !selectedCollectionTag
                                                    ? "Search collections..."
                                                    : "Search title, description, or tags..."
                                            }
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-12 py-1.5 text-xs rounded-xl bg-white border border-zinc-200 focus:border-indigo-500 focus:shadow-sm outline-none text-zinc-850 placeholder-zinc-400"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 hover:text-zinc-650"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Active tags removable list */}
                        {selectedMediaType !== 'collections' && selectedLibraryTags.length > 0 && (
                            <div className="px-6 py-2 border-b border-zinc-150 bg-white flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mr-1 select-none">Active Filters:</span>
                                {selectedLibraryTags.map(tag => (
                                    <span 
                                        key={tag}
                                        className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-[10px] font-bold flex items-center gap-1.5 border border-indigo-100/50"
                                    >
                                        #{tag}
                                        <button 
                                            onClick={() => setSelectedLibraryTags(prev => prev.filter(t => t !== tag))}
                                            className="text-indigo-400 hover:text-indigo-600 font-bold text-[10px] cursor-pointer"
                                        >
                                            ✕
                                        </button>
                                    </span>
                                ))}
                                <button 
                                    onClick={() => setSelectedLibraryTags([])}
                                    className="text-zinc-400 hover:text-indigo-650 text-[10px] font-bold cursor-pointer ml-1"
                                >
                                    Clear All
                                </button>
                            </div>
                        )}

                        {/* 3. Main Grid Contents Area */}
                        <ScrollArea className="flex-1 p-6 bg-zinc-50/20 overflow-y-auto">
                            {loading ? (
                                <div className="grid grid-cols-4 gap-4">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <Skeleton key={i} className="aspect-video w-full rounded-2xl bg-zinc-100" />
                                    ))}
                                </div>
                            ) : likedVideos.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[260px] text-xs gap-3 text-zinc-500">
                                    <p>No liked videos yet.</p>
                                    <Link href="/browse">
                                        <Button variant="outline" size="sm" className="bg-transparent border-white/20 text-white hover:bg-white/10">Browse Videos</Button>
                                    </Link>
                                </div>
                            ) : selectedMediaType !== 'collections' ? (
                                /* --- REGULAR MEDIA GRID VIEW --- */
                                <div className="space-y-6">
                                    {filteredLikedVideos.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                                            {filteredLikedVideos.map(video => (
                                                <DraggableSidebarItem
                                                    key={video.id}
                                                    video={video}
                                                    isSelectMode={isSelectMode}
                                                    isSelected={selectedLibraryItemIds.has(video.id)}
                                                    onToggleSelect={() => {
                                                        setSelectedLibraryItemIds(prev => {
                                                            const copy = new Set(prev);
                                                            if (copy.has(video.id)) {
                                                                copy.delete(video.id);
                                                            } else {
                                                                copy.add(video.id);
                                                            }
                                                            return copy;
                                                        });
                                                    }}
                                                    onMaximize={() => setExpandedVideo(video)}
                                                    onAdd={handleAddVideo}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-[280px] text-xs gap-2 text-zinc-500 text-center">
                                            <p className="font-semibold text-zinc-700">No matching references</p>
                                            <p className="text-[10px] text-zinc-400">Try adjusting your search query or selected tag filter.</p>
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setSelectedLibraryTags([]);
                                                }}
                                                className="text-indigo-500 text-[10px] mt-1"
                                            >
                                                Reset Filters
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* --- COLLECTIONS TAB VIEW --- */
                                <div>
                                    {!selectedCollectionTag ? (
                                        /* 1. Folders list view */
                                        filteredFolders.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-4">
                                                {filteredFolders.map(folder => (
                                                    <div
                                                        key={folder.tag}
                                                        onClick={() => setSelectedCollectionTag(folder.tag)}
                                                        className="w-full aspect-[4/3] rounded-2xl border border-zinc-200 overflow-hidden relative group cursor-pointer hover:scale-[1.02] hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300 bg-zinc-900"
                                                    >
                                                        <Image
                                                            src={folder.coverUrl}
                                                            alt={folder.tag}
                                                            fill
                                                            className="object-cover group-hover:scale-105 transition-transform duration-300 opacity-60 group-hover:opacity-85"
                                                        />
                                                        
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-4.5">
                                                            <span className="text-[8px] font-bold text-indigo-400 tracking-wide uppercase scale-95 origin-left">Collection</span>
                                                            <span className="text-xs font-bold text-white truncate drop-shadow-md">#{folder.tag}</span>
                                                            <span className="text-[10px] text-zinc-455 font-medium mt-0.5">{folder.count} {folder.count === 1 ? 'reference' : 'references'}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-[280px] text-xs gap-2 text-zinc-500 text-center">
                                                <p className="font-semibold text-zinc-700">No collections found</p>
                                                <p className="text-[10px] text-zinc-400">No saved tags match this collection name.</p>
                                            </div>
                                        )
                                    ) : (
                                        /* 2. Folder Inner Grid View */
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                                                <button
                                                    onClick={() => setSelectedCollectionTag(null)}
                                                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-500 transition-colors cursor-pointer"
                                                >
                                                    <ChevronLeft className="h-3.5 w-3.5" /> Back to Collections
                                                </button>
                                                <span className="text-xs font-bold text-zinc-500 px-3 py-1 bg-zinc-100 rounded-xl">
                                                    #{selectedCollectionTag}
                                                </span>
                                            </div>

                                            {folderFilteredVideos.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                                                    {folderFilteredVideos.map(video => (
                                                        <DraggableSidebarItem
                                                            key={video.id}
                                                            video={video}
                                                            isSelectMode={isSelectMode}
                                                            isSelected={selectedLibraryItemIds.has(video.id)}
                                                            onToggleSelect={() => {
                                                                setSelectedLibraryItemIds(prev => {
                                                                    const copy = new Set(prev);
                                                                    if (copy.has(video.id)) {
                                                                        copy.delete(video.id);
                                                                    } else {
                                                                        copy.add(video.id);
                                                                    }
                                                                    return copy;
                                                                });
                                                            }}
                                                            onMaximize={() => setExpandedVideo(video)}
                                                            onAdd={handleAddVideo}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-[200px] text-xs gap-2 text-zinc-500 text-center">
                                                    <p className="font-semibold text-zinc-700">No matching references in #{selectedCollectionTag}</p>
                                                    <Button
                                                        variant="link"
                                                        size="sm"
                                                        onClick={() => setSearchQuery('')}
                                                        className="text-indigo-500 text-[10px] mt-1"
                                                    >
                                                        Clear Search
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </ScrollArea>

                        {/* 4. Selection Action Bar (when in selection mode) */}
                        {isSelectMode && (
                            <div className="p-4 border-t border-zinc-150 bg-white flex items-center justify-between shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-zinc-500">
                                        {selectedLibraryItemIds.size === 0 
                                            ? "Choose references below to import..." 
                                            : `Selected ${selectedLibraryItemIds.size} ${selectedLibraryItemIds.size === 1 ? 'item' : 'items'}`}
                                    </span>
                                    {selectedLibraryItemIds.size > 0 && (
                                        <button 
                                            onClick={() => setSelectedLibraryItemIds(new Set())}
                                            className="text-[10px] text-zinc-400 hover:text-zinc-650 font-bold ml-1.5 cursor-pointer"
                                        >
                                            Clear Selection
                                        </button>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setIsSelectMode(false);
                                            setSelectedLibraryItemIds(new Set());
                                        }}
                                        className="h-9 px-5 rounded-xl border-zinc-200 text-zinc-650 text-xs font-bold hover:bg-zinc-50 cursor-pointer"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        disabled={selectedLibraryItemIds.size === 0}
                                        onClick={handleAddSelectedReferences}
                                        className="h-9 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        Add to Moodboard ({selectedLibraryItemIds.size})
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    </div>
                </div>
            )}

            {/* Video Maximize Modal */}
            <Dialog open={!!expandedVideo && 'videoUrl' in expandedVideo} onOpenChange={(open) => !open && setExpandedVideo(null)}>
                <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none border-0 bg-black/50 backdrop-blur-2xl overflow-y-auto">
                    <DialogTitle className="sr-only">
                        {expandedVideo && 'title' in expandedVideo ? (expandedVideo as Video).title : "Video Player"}
                    </DialogTitle>

                    {expandedVideo && 'videoUrl' in expandedVideo && (
                        <div className="min-h-screen w-full relative">
                            <main className="container mx-auto px-4 pt-10 pb-12">
                                <div className="max-w-5xl mx-auto space-y-6">
                                    <div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setExpandedVideo(null)}
                                            className="rounded-full bg-white/5 hover:bg-white/10 text-white h-10 w-10 transition-colors border border-white/10"
                                        >
                                            <ArrowLeft className="h-5 w-5" />
                                        </Button>
                                    </div>

                                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10">
                                        <VideoPlayer video={expandedVideo as Video} muted={false} />
                                        <VideoActionsBar video={expandedVideo as Video} userProfile={userProfile} />
                                    </div>

                                    <div className="space-y-4 text-white">
                                        <div className="flex items-center gap-4">
                                            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">{(expandedVideo as Video).title}</h1>
                                            {((expandedVideo as Video).originalUrl || (expandedVideo as Video).uploader) && (
                                                <a
                                                    href={(expandedVideo as Video).originalUrl || (expandedVideo as Video).videoUrl || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 rounded-full text-white shadow-lg transition-transform hover:scale-105"
                                                    title="View Original Post"
                                                >
                                                    {((expandedVideo as Video).originalUrl || '').toLowerCase().includes('instagram.com') ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                                                    )}
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">{(expandedVideo as Video).description}</p>

                                        {(expandedVideo as Video).tags && (expandedVideo as Video).tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-2">
                                                {(expandedVideo as Video).tags.map((tag: string) => (
                                                    <span key={tag} className="px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-full text-xs text-zinc-400">
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

            {/* Hidden Input for Manual Image Uploads */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                className="hidden"
            />
        </div>
    );
}

export default function MoodboardPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-screen bg-neutral-900 flex items-center justify-center text-white">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-zinc-400">Loading Moodboard...</p>
                </div>
            </div>
        }>
            <MoodboardContent />
        </Suspense>
    );
}
