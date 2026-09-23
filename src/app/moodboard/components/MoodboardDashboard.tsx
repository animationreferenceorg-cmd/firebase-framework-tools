'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Moodboard, Video, MoodboardItem } from '@/lib/types';
import { MoodboardService } from '@/lib/moodboard-service';
import {
    ArrowUpRight,
    ChevronRight,
    Film,
    Folder,
    FolderOpen,
    LayoutDashboard,
    Lock,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Trash2,
    Presentation,
    GripVertical,
    Upload,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AntiScreenshotBadge } from './AntiScreenshotShield';

export interface MoodboardDashboardProps {
    moodboards: Moodboard[];
    savedReferences: Video[];
    userId?: string;
    onCreateBoard: () => Promise<string | void>;
    onOpenBoard: (boardId: string) => void;
    onRenameBoard: (boardId: string, name: string) => Promise<void>;
    onDeleteBoard: (boardId: string) => void;
    onOpenReference: (video: Video) => void;
    onAddReferenceToBoard: (boardId: string, video: Video) => Promise<void>;
    onExportPitchDeck?: (boardId?: string) => void;
    onUploadReferences?: (boardId: string) => void;
    isUploadingReferences?: boolean;
    uploadProgress?: number;
    onSetBoardCover?: (boardId: string, imageUrl: string) => void;
    onRemoveReferencesFromBoard?: (boardId: string, referenceIds: string[]) => Promise<void>;
    onDeleteBoards?: (boardIds: string[]) => Promise<void>;
    onRemoveReferencesFromAllSaves?: (referenceIds: string[]) => Promise<void>;
}

function getBoardImages(board: Moodboard) {
    const itemImages = (board.items || [])
        .filter(item => item.type === 'image' || item.type === 'video')
        .map(item => item.videoData?.thumbnailUrl || item.videoData?.posterUrl || (item as any).video?.thumbnailUrl || (item as any).video?.posterUrl || item.imageUrl)
        .filter((src): src is string => Boolean(src) && !/\.(mp4|webm|mov|m3u8)(?:\?|$)/i.test(src));
    // The persisted board thumbnail can be an older/stale URL, so use it only
    // after current board-item thumbnails have been considered.
    const candidates = [board.thumbnailUrl, ...itemImages].filter((src): src is string => typeof src === 'string' && src.length > 0 && !/\.(mp4|webm|mov|m3u8)(?:\?|$)/i.test(src));
    return Array.from(new Set(candidates)).slice(0, 3);
}

export function getFolderReferences(board?: Moodboard): Video[] {
    if (!board) return [];
    const seen = new Set<string>();
    return (board.items || [])
        .filter(item => item.type === 'video' || item.type === 'image' || (!item.type && (item.videoData || item.videoId || item.imageUrl)))
        .flatMap(item => {
            const video = item.videoData || (item as any).video;
            const id = video?.id || item.videoId || item.id;
            if (!id || seen.has(id)) return [];
            seen.add(id);

            if (video && (video.thumbnailUrl || video.videoUrl || video.title)) {
                return [{
                    ...video,
                    id: video.id || id,
                    title: video.title || (item as any).title || 'Saved Reference',
                    thumbnailUrl: video.thumbnailUrl || video.posterUrl || item.imageUrl || '',
                    posterUrl: video.posterUrl || video.thumbnailUrl || item.imageUrl || '',
                    videoUrl: video.videoUrl || '',
                }];
            }

            return [{
                id: id,
                title: (item as any).title || 'Saved Reference',
                thumbnailUrl: item.imageUrl || '',
                posterUrl: item.imageUrl || '',
                videoUrl: (item as any).videoUrl || '',
                tags: [],
                categories: [],
            } as unknown as Video];
        });
}

function getReferenceImage(video: Video) {
    return video.thumbnailUrl || video.posterUrl || '/placeholder.jpg';
}

function formatUpdatedAt(value: any) {
    const date = value?.toDate?.() || (value?.seconds ? new Date(value.seconds * 1000) : value ? new Date(value) : new Date());
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

function BoardCover({ board }: { board: Moodboard }) {
    const images = getBoardImages(board);
    const imageKey = images.join('|');
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
    const availableImages = images.filter(src => !failedImages.has(src));
    const markFailed = (src: string) => setFailedImages(current => new Set(current).add(src));

    useEffect(() => setFailedImages(new Set()), [board.id, imageKey]);

    if (availableImages.length === 0) {
        return (
            <div className="flex h-full items-center justify-center bg-[#e8e3d9]">
                <LayoutDashboard className="h-8 w-8 text-stone-400" />
            </div>
        );
    }
    if (availableImages.length === 1) return <img src={availableImages[0]} alt="" onError={() => markFailed(availableImages[0])} className="h-full w-full object-cover" />;
    return (
        <div className="grid h-full grid-cols-2 grid-rows-2 gap-1 bg-stone-100">
            <img src={availableImages[0]} alt="" onError={() => markFailed(availableImages[0])} className="row-span-2 h-full w-full object-cover" />
            {availableImages.slice(1, 3).map((src, index) => <img key={`${src}-${index}`} src={src} alt="" onError={() => markFailed(src)} className="h-full w-full object-cover" />)}
            {availableImages.length === 2 && <div className="bg-stone-300" />}
        </div>
    );
}

function ReferenceMasonry({
    references,
    moodboards,
    showFolderPicker,
    onOpenReference,
    onAddReferenceToBoard,
    isSelectMode = false,
    selectedReferenceIds = new Set<string>(),
    onToggleReference,
    onReferenceInteraction,
    isUploading = false,
    uploadProgress = 0,
}: {
    references: Video[];
    moodboards: Moodboard[];
    showFolderPicker: boolean;
    onOpenReference: (video: Video) => void;
    onAddReferenceToBoard: (boardId: string, video: Video) => Promise<void>;
    isSelectMode?: boolean;
    selectedReferenceIds?: Set<string>;
    onToggleReference?: (referenceId: string) => void;
    onReferenceInteraction?: () => void;
    isUploading?: boolean;
    uploadProgress?: number;
}) {
    if (references.length === 0 && !isUploading) {
        return (
            <div className="rounded-2xl border border-black/10 bg-white/60 px-6 py-14 text-center">
                <Film className="mx-auto h-7 w-7 text-stone-400" />
                <p className="mt-3 text-sm font-semibold">Nothing in this inspiration yet</p>
                <p className="mt-1 text-sm text-stone-500">Add references from All saves and they will appear here and on its canvas.</p>
            </div>
        );
    }

    return (
        <div className="columns-2 gap-2.5 sm:columns-3 md:gap-3 xl:columns-4 2xl:columns-5 select-none">
            {references.map((video, index) => (
                <article
                    key={video.id}
                    draggable
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => {
                        const payload = JSON.stringify({ video });
                        e.dataTransfer.setData('application/json', payload);
                        e.dataTransfer.setData('text/plain', payload);
                        e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onMouseEnter={(event) => {
                        const preview = event.currentTarget.querySelector('video') as HTMLVideoElement | null;
                        preview?.play().catch(() => undefined);
                    }}
                    onMouseLeave={(event) => {
                        const preview = event.currentTarget.querySelector('video') as HTMLVideoElement | null;
                        if (!preview) return;
                        preview.pause();
                        try { preview.currentTime = 0; } catch {}
                    }}
                    className={`moodboard-protected-media group relative mb-2.5 break-inside-avoid overflow-hidden rounded-xl bg-stone-200 md:mb-3 cursor-grab active:cursor-grabbing hover:shadow-xl transition-all duration-300 select-none ${
                        selectedReferenceIds.has(video.id) ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-[#f7f6f2] shadow-md' : ''
                    }`}
                >
                    <button onClick={() => {
                        onReferenceInteraction?.();
                        if (isSelectMode || selectedReferenceIds.size > 0) onToggleReference?.(video.id);
                        else onOpenReference(video);
                    }} className="block w-full text-left select-none">
                        <img
                            src={getReferenceImage(video)}
                            alt={video.title || 'Saved reference'}
                            draggable={false}
                            style={{ userSelect: 'none' }}
                            className={`w-full object-cover select-none pointer-events-none transition duration-500 group-hover:scale-[1.02] ${index % 5 === 0 ? 'aspect-[3/4]' : index % 3 === 0 ? 'aspect-square' : 'aspect-[4/3]'}`}
                        />
                        {video.videoUrl && (
                            <video
                                src={video.videoUrl}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            />
                        )}
                        {/* Protective Transparent DRM Barrier */}
                        <div className="absolute inset-0 z-10 pointer-events-none select-none bg-transparent" />
                        <span className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-3 pb-3 pt-12 text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100 pointer-events-none z-10">
                            <span className="block line-clamp-2 text-xs font-semibold leading-snug">{video.title || 'Untitled reference'}</span>
                        </span>
                    </button>
                    {/* Top Right Selection Circle Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onReferenceInteraction?.();
                            onToggleReference?.(video.id);
                        }}
                        className={`absolute right-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-200 cursor-pointer ${
                            selectedReferenceIds.has(video.id)
                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md scale-105 opacity-100'
                                : selectedReferenceIds.size > 0
                                    ? 'border-white/80 bg-black/40 text-transparent hover:border-white hover:bg-black/60 hover:scale-110 opacity-100'
                                    : 'border-white/80 bg-black/40 text-transparent opacity-0 group-hover:opacity-100 hover:border-white hover:bg-black/60 hover:scale-110'
                        }`}
                        title={selectedReferenceIds.has(video.id) ? "Deselect reference" : "Select reference"}
                    >
                        <span className="text-xs font-bold leading-none">✓</span>
                    </button>
                    {/* Subtle Drag Handle Indicator on Hover */}
                    <div className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 pointer-events-none shadow-sm" title="Drag to any board in sidebar">
                        <GripVertical className="h-3.5 w-3.5" />
                    </div>
                    {showFolderPicker && moodboards.length > 0 && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    className="absolute right-11 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-stone-950 opacity-0 group-hover:opacity-100 shadow-md transition hover:scale-105 z-20 cursor-pointer"
                                    aria-label={`Add ${video.title || 'reference'} to a board`}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-60 rounded-2xl p-2">
                                <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">Add to board</p>
                                <div className="max-h-64 space-y-0.5 overflow-y-auto">
                                    {moodboards.map(board => (
                                        <button
                                            key={board.id}
                                            onClick={() => onAddReferenceToBoard(board.id, video)}
                                            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-stone-100"
                                        >
                                            <Folder className="h-4 w-4 text-stone-400" />
                                            <span className="min-w-0 flex-1 truncate">{board.name || 'Untitled board'}</span>
                                            <Plus className="h-3.5 w-3.5 text-stone-400" />
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </article>
            ))}
            {isUploading && (
                <article className="mb-2.5 break-inside-avoid overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 p-4 shadow-sm md:mb-3">
                    <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-lg border border-dashed border-indigo-300 bg-white/55 text-center">
                        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                        <p className="mt-3 text-sm font-semibold text-indigo-950">Adding reference</p>
                        <p className="mt-1 text-xs text-indigo-700">{uploadProgress}% uploaded</p>
                        <div className="mt-4 h-1.5 w-3/4 overflow-hidden rounded-full bg-indigo-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} /></div>
                    </div>
                </article>
            )}
        </div>
    );
}

export function MoodboardDashboard({
    moodboards,
    savedReferences,
    userId,
    onCreateBoard,
    onOpenBoard,
    onRenameBoard,
    onDeleteBoard,
    onOpenReference,
    onAddReferenceToBoard,
    onExportPitchDeck,
    onUploadReferences,
    isUploadingReferences = false,
    uploadProgress = 0,
    onSetBoardCover,
    onRemoveReferencesFromBoard,
    onDeleteBoards,
    onRemoveReferencesFromAllSaves,
}: MoodboardDashboardProps) {
    const [query, setQuery] = useState('');
    const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftName, setDraftName] = useState('');
    const [boardItemsMap, setBoardItemsMap] = useState<Record<string, MoodboardItem[]>>({});
    const [dragOverBoardId, setDragOverBoardId] = useState<string | null>(null);
    const [isReferenceSelectMode, setIsReferenceSelectMode] = useState(false);
    const [selectedReferenceIds, setSelectedReferenceIds] = useState<Set<string>>(new Set());
    const [isBoardSelectMode, setIsBoardSelectMode] = useState(false);
    const [selectedBoardIds, setSelectedBoardIds] = useState<Set<string>>(new Set());

    // When clicking a board, load its fresh items immediately so references pop up in the list
    useEffect(() => {
        if (!userId || !selectedFolderId || selectedFolderId === 'all') return;
        MoodboardService.loadMoodboard(userId, selectedFolderId)
            .then((freshItems) => {
                if (freshItems) {
                    setBoardItemsMap(prev => ({ ...prev, [selectedFolderId]: freshItems }));
                }
            })
            .catch(err => console.error('Failed to load board references:', err));
    }, [selectedFolderId, userId]);

    const normalizedQuery = query.trim().toLowerCase();
    const selectedFolder = moodboards.find(board => board.id === selectedFolderId);
    // Parent updates (including direct dashboard uploads) should immediately
    // refresh the selected board gallery instead of leaving a stale empty cache.
    useEffect(() => {
        if (!selectedFolder) return;
        setBoardItemsMap(prev => ({ ...prev, [selectedFolder.id]: selectedFolder.items || [] }));
    }, [selectedFolder]);
    const currentFolderItems = selectedFolder
        ? (boardItemsMap[selectedFolder.id] || selectedFolder.items || [])
        : [];
    const folderReferences = selectedFolder
        ? getFolderReferences({ ...selectedFolder, items: currentFolderItems })
        : [];
    const sourceReferences = selectedFolder ? folderReferences : savedReferences;
    const visibleReferences = useMemo(() => sourceReferences.filter(video =>
        !normalizedQuery || video.title?.toLowerCase().includes(normalizedQuery) ||
        video.description?.toLowerCase().includes(normalizedQuery) ||
        video.tags?.some(tag => tag.toLowerCase().includes(normalizedQuery))
    ), [sourceReferences, normalizedQuery]);

    const commitRename = async (board: Moodboard) => {
        const nextName = draftName.trim();
        setEditingId(null);
        if (nextName && nextName !== board.name) await onRenameBoard(board.id, nextName);
    };

    const createInspiration = async () => {
        const newId = await onCreateBoard();
        if (newId) setSelectedFolderId(newId);
    };

    const toggleReferenceSelection = (referenceId: string) => setSelectedReferenceIds(current => {
        const next = new Set(current);
        if (next.has(referenceId)) next.delete(referenceId);
        else next.add(referenceId);
        return next;
    });
    const toggleBoardSelection = (boardId: string) => setSelectedBoardIds(current => {
        const next = new Set(current);
        if (next.has(boardId)) next.delete(boardId);
        else next.add(boardId);
        return next;
    });

    return (
        <main className="min-h-full bg-[#f7f6f2] text-stone-950">
            <div className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#f7f6f2]/90 backdrop-blur-xl">
                <div className="flex flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
                    <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Reference workspace</p>
                        <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Boards</h1>
                    </div>
                    <div className="flex w-full items-center gap-2 lg:w-auto">
                        <AntiScreenshotBadge className="hidden md:inline-flex shrink-0" />
                        <label className="relative min-w-0 flex-1 lg:w-80">
                            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search this board" className="h-11 w-full rounded-full border border-black/10 bg-white/80 pl-10 pr-4 text-sm outline-none transition focus:border-black/30 focus:bg-white" />
                        </label>
                        <Button
                            variant="outline"
                            onClick={() => onExportPitchDeck?.(selectedFolderId === 'all' ? undefined : selectedFolderId)}
                            className="h-11 shrink-0 rounded-full border-black/10 bg-white/90 px-4 text-stone-800 hover:bg-white hover:text-stone-950 font-medium shadow-sm transition-all"
                            title="Export pitch deck as printable presentation or PDF"
                        >
                            <Presentation className="mr-1.5 h-4 w-4 text-indigo-600" />
                            Pitch Deck <span className="ml-1 text-[9px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-black font-mono">PDF</span>
                        </Button>
                        {selectedFolder && onUploadReferences && (
                            <Button
                                variant="outline"
                                onClick={() => onUploadReferences(selectedFolder.id)}
                                className="h-11 shrink-0 rounded-full border-black/10 bg-white/90 px-4 text-stone-800 hover:bg-white hover:text-stone-950 font-medium shadow-sm transition-all"
                            >
                                <Upload className="mr-1.5 h-4 w-4 text-indigo-600" /> Upload references
                            </Button>
                        )}
                        <Button onClick={createInspiration} className="h-11 shrink-0 rounded-full bg-stone-950 px-5 text-white hover:bg-stone-800">
                            <Plus className="mr-1.5 h-4 w-4" /> New board
                        </Button>
                        {selectedReferenceIds.size > 0 && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedReferenceIds(new Set())}
                                    className="h-11 shrink-0 rounded-full border-black/10 bg-white px-4 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                                >
                                    Clear ({selectedReferenceIds.size})
                                </Button>
                                <Button
                                    onClick={async () => {
                                        if (selectedFolder) {
                                            if (!confirm(`Remove ${selectedReferenceIds.size} reference${selectedReferenceIds.size === 1 ? '' : 's'} from this board?`)) return;
                                            await onRemoveReferencesFromBoard?.(selectedFolder.id, [...selectedReferenceIds]);
                                        } else {
                                            if (!confirm(`Remove ${selectedReferenceIds.size} reference${selectedReferenceIds.size === 1 ? '' : 's'} from All saves?`)) return;
                                            await onRemoveReferencesFromAllSaves?.([...selectedReferenceIds]);
                                        }
                                        setSelectedReferenceIds(new Set());
                                    }}
                                    className="h-11 shrink-0 rounded-full bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Trash2 className="h-4 w-4" /> Delete ({selectedReferenceIds.size})
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid min-h-[calc(100vh-150px)] lg:grid-cols-[260px_minmax(0,1fr)]">
                <aside className="border-b border-black/[0.06] px-4 py-6 lg:sticky lg:top-[137px] lg:h-[calc(100vh-137px)] lg:border-b-0 lg:border-r lg:px-5">
                    <div className="flex items-center justify-between px-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">Library</p>
                        <button onClick={createInspiration} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/5" aria-label="Create board"><Plus className="h-4 w-4" /></button>
                    </div>
                    <nav className="mt-3 space-y-1">
                        <button onClick={() => setSelectedFolderId('all')} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${selectedFolderId === 'all' ? 'bg-stone-950 text-white' : 'hover:bg-black/5'}`}>
                            <LayoutDashboard className="h-4 w-4" /><span className="flex-1 font-medium">All saves</span><span className="text-xs opacity-60">{savedReferences.length}</span>
                        </button>
                        <div className="flex items-center justify-between px-3 pb-1.5 pt-5">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">Boards</span>
                            {moodboards.length > 0 && (
                                <button
                                    onClick={() => {
                                        setIsBoardSelectMode(value => !value);
                                        setSelectedBoardIds(new Set());
                                    }}
                                    className="text-xs font-semibold text-stone-600 hover:text-stone-950 transition flex items-center gap-1 cursor-pointer"
                                >
                                    {isBoardSelectMode ? 'Done' : 'Manage boards'}
                                </button>
                            )}
                        </div>
                        {isBoardSelectMode && selectedBoardIds.size > 0 && onDeleteBoards && (
                            <div className="px-3 pb-2 pt-0.5 animate-in fade-in zoom-in-95 duration-150">
                                <Button
                                    size="sm"
                                    onClick={async () => {
                                        if (!confirm(`Delete ${selectedBoardIds.size} board${selectedBoardIds.size === 1 ? '' : 's'}? This cannot be undone.`)) return;
                                        await onDeleteBoards([...selectedBoardIds]);
                                        setSelectedBoardIds(new Set());
                                        setIsBoardSelectMode(false);
                                        setSelectedFolderId('all');
                                    }}
                                    className="w-full h-8 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 shadow-sm flex items-center justify-center gap-1.5"
                                >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete ({selectedBoardIds.size})
                                </Button>
                            </div>
                        )}
                        {moodboards.map(board => {
                            const count = getFolderReferences(board).length;
                            const isSelected = selectedFolderId === board.id;
                            const isEditingThis = editingId === board.id;
                            const isDragTarget = dragOverBoardId === board.id;
                            return (
                                <div
                                    key={board.id}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        e.dataTransfer.dropEffect = 'copy';
                                        if (dragOverBoardId !== board.id) {
                                            setDragOverBoardId(board.id);
                                        }
                                    }}
                                    onDragLeave={(e) => {
                                        e.preventDefault();
                                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                                        setDragOverBoardId(curr => curr === board.id ? null : curr);
                                    }}
                                    onDrop={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDragOverBoardId(null);

                                        // 1. Check for dropped desktop image files
                                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && userId) {
                                            for (const file of Array.from(e.dataTransfer.files)) {
                                                if (file.type.startsWith('image/')) {
                                                    try {
                                                        const downloadURL = await MoodboardService.uploadImage(userId, file);
                                                        const newId = `img-${Date.now()}`;
                                                        const videoItem: Video = {
                                                            id: newId,
                                                            title: file.name,
                                                            thumbnailUrl: downloadURL,
                                                            posterUrl: downloadURL,
                                                            videoUrl: '',
                                                            description: 'Dropped from computer',
                                                            tags: [],
                                                            categories: [],
                                                        };
                                                        await onAddReferenceToBoard(board.id, videoItem);
                                                    } catch (err) {
                                                        console.error('Failed to upload dropped image:', err);
                                                    }
                                                }
                                            }
                                            return;
                                        }

                                        // 2. Check for dragged reference item from masonry
                                        const dataStr = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
                                        if (!dataStr) return;
                                        try {
                                            const parsed = JSON.parse(dataStr);
                                            const video = parsed.video || parsed;
                                            if (video && (video.id || video.videoUrl || video.thumbnailUrl)) {
                                                await onAddReferenceToBoard(board.id, video);
                                            }
                                        } catch (err) {
                                            console.error('Failed to parse dropped reference:', err);
                                        }
                                    }}
                                    className={`group/folder relative flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-all duration-200 ${
                                        isDragTarget
                                            ? 'bg-amber-100 ring-2 ring-amber-500 shadow-md scale-[1.02]'
                                            : isSelected
                                                ? 'bg-white shadow-sm'
                                                : 'hover:bg-black/5'
                                    }`}
                                >
                                    {isEditingThis ? (
                                        <input
                                            autoFocus
                                            value={draftName}
                                            onChange={e => setDraftName(e.target.value)}
                                            onBlur={() => commitRename(board)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') commitRename(board);
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            onClick={e => e.stopPropagation()}
                                            className="w-full bg-transparent border-b border-stone-800 text-sm font-medium outline-none py-0.5"
                                        />
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => isBoardSelectMode ? toggleBoardSelection(board.id) : setSelectedFolderId(board.id)}
                                                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer text-left"
                                            >
                                                {isSelected ? <FolderOpen className="h-4 w-4 text-amber-600 shrink-0" /> : <Folder className="h-4 w-4 text-stone-400 shrink-0" />}
                                                <span className="min-w-0 flex-1 truncate font-medium">{board.name || 'Untitled board'}</span>
                                            </button>
                                            <div className="flex items-center gap-1 shrink-0 ml-1">
                                                {isBoardSelectMode ? (
                                                    <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${selectedBoardIds.has(board.id) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-stone-300 text-transparent'}`}>✓</span>
                                                ) : isDragTarget ? (
                                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-200/80 px-1.5 py-0.5 rounded animate-pulse">
                                                        Drop to add
                                                    </span>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingId(board.id);
                                                                setDraftName(board.name || 'Untitled board');
                                                            }}
                                                            className="p-1 rounded-md text-stone-400 hover:text-stone-900 hover:bg-black/5 opacity-0 group-hover/folder:opacity-100 transition"
                                                            title="Rename board"
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </button>
                                                        <span className="text-xs text-stone-400">{count}</span>
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                        {moodboards.length === 0 && <p className="px-3 py-3 text-xs leading-relaxed text-stone-400">Create a board to group references with its own canvas.</p>}
                    </nav>
                </aside>

                <div className="min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
                    {selectedFolder ? (
                        <section>
                            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <div className="mb-2 flex items-center gap-2 text-xs text-stone-400"><span>All saves</span><ChevronRight className="h-3 w-3" /></div>
                                    {editingId === selectedFolder.id ? (
                                        <form onSubmit={(e) => { e.preventDefault(); commitRename(selectedFolder); }} className="flex items-center gap-2">
                                            <input
                                                autoFocus
                                                value={draftName}
                                                onChange={event => setDraftName(event.target.value)}
                                                onBlur={() => commitRename(selectedFolder)}
                                                onKeyDown={event => {
                                                    if (event.key === 'Enter') commitRename(selectedFolder);
                                                    if (event.key === 'Escape') setEditingId(null);
                                                }}
                                                className="border-b-2 border-stone-900 bg-transparent text-3xl font-semibold tracking-tight outline-none pb-0.5"
                                            />
                                        </form>
                                    ) : (
                                        <div className="flex items-center gap-2.5">
                                            <h2
                                                onClick={() => {
                                                    setEditingId(selectedFolder.id);
                                                    setDraftName(selectedFolder.name || 'Untitled board');
                                                }}
                                                className="text-3xl font-semibold tracking-[-0.03em] cursor-pointer hover:text-stone-700 transition-colors"
                                                title="Click to rename board"
                                            >
                                                {selectedFolder.name || 'Untitled board'}
                                            </h2>
                                            <button
                                                onClick={() => {
                                                    setEditingId(selectedFolder.id);
                                                    setDraftName(selectedFolder.name || 'Untitled board');
                                                }}
                                                className="p-1.5 rounded-full hover:bg-black/5 text-stone-400 hover:text-stone-700 transition"
                                                title="Rename board"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                    <p className="mt-2 text-sm text-stone-500">{visibleReferences.length} references · Gallery and canvas</p>
                                    {onUploadReferences && (
                                        <Button
                                            size="sm"
                                            onClick={() => onUploadReferences(selectedFolder.id)}
                                            disabled={isUploadingReferences}
                                            className="mt-4 h-10 rounded-full bg-stone-950 px-4 text-xs font-semibold text-white hover:bg-stone-800 shadow-sm"
                                        >
                                            {isUploadingReferences ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
                                            {isUploadingReferences ? 'Uploading references…' : 'Upload references'}
                                        </Button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <AntiScreenshotBadge className="hidden sm:inline-flex shrink-0" />
                                    {selectedReferenceIds.size > 0 && (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-3 duration-200">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedReferenceIds(new Set())}
                                                className="h-10 rounded-full border-black/10 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                                            >
                                                Clear ({selectedReferenceIds.size})
                                            </Button>
                                            {onRemoveReferencesFromBoard && (
                                                <Button
                                                    size="sm"
                                                    onClick={async () => {
                                                        if (!confirm(`Remove ${selectedReferenceIds.size} reference${selectedReferenceIds.size === 1 ? '' : 's'} from this board?`)) return;
                                                        await onRemoveReferencesFromBoard(selectedFolder.id, [...selectedReferenceIds]);
                                                        setSelectedReferenceIds(new Set());
                                                    }}
                                                    className="h-10 rounded-full bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" /> Delete ({selectedReferenceIds.size})
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {onUploadReferences && (
                                        <Button
                                            size="sm"
                                            onClick={() => onUploadReferences(selectedFolder.id)}
                                            className="h-10 rounded-full bg-stone-950 px-3.5 text-xs font-semibold text-white hover:bg-stone-800 shadow-sm transition-all"
                                        >
                                            <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload references
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onExportPitchDeck?.(selectedFolder.id)}
                                        className="h-10 rounded-full border-black/10 bg-white px-3.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 shadow-sm transition-all"
                                    >
                                        <Presentation className="mr-1.5 h-3.5 w-3.5 text-indigo-600" /> Pitch Deck <span className="ml-1 text-[9px] bg-amber-400 text-black px-1 py-0.5 rounded font-black font-mono">PDF</span>
                                    </Button>
                                    <Popover>
                                        <PopoverTrigger asChild><button className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm"><MoreHorizontal className="h-4 w-4" /></button></PopoverTrigger>
                                        <PopoverContent align="end" className="w-48 rounded-xl p-1">
                                            <button onClick={() => onExportPitchDeck?.(selectedFolder.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-stone-100 text-stone-800"><Presentation className="h-4 w-4 text-indigo-600" /> Export Pitch Deck</button>
                                            {onSetBoardCover && folderReferences.length > 0 && (
                                                <div className="border-t border-stone-100 px-3 py-2">
                                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">Set board cover</p>
                                                    <div className="grid grid-cols-4 gap-1.5">
                                                        {folderReferences.slice(0, 8).map((reference) => {
                                                            const imageUrl = getReferenceImage(reference);
                                                            return <button key={reference.id} onClick={() => onSetBoardCover(selectedFolder.id, imageUrl)} className="aspect-square overflow-hidden rounded-md ring-offset-1 hover:ring-2 hover:ring-indigo-500"><img src={imageUrl} alt={`Use ${reference.title || 'reference'} as board cover`} className="h-full w-full object-cover" /></button>;
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            <button onClick={() => { setEditingId(selectedFolder.id); setDraftName(selectedFolder.name || 'Untitled inspiration'); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-stone-100">Rename</button>
                                            <button onClick={() => onDeleteBoard(selectedFolder.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Delete</button>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            {isUploadingReferences && (
                                <div className="mb-7 overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
                                    <div className="flex items-center justify-between gap-4 text-sm font-semibold text-indigo-950"><span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> Adding reference to this board</span><span>{uploadProgress}%</span></div>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} /></div>
                                </div>
                            )}

                            <button
                                onClick={() => onOpenBoard(selectedFolder.id)}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.dataTransfer.dropEffect = 'copy';
                                }}
                                onDrop={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const dataStr = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
                                    if (dataStr) {
                                        try {
                                            const parsed = JSON.parse(dataStr);
                                            const video = parsed.video || parsed;
                                            if (video && (video.id || video.videoUrl)) {
                                                await onAddReferenceToBoard(selectedFolder.id, video);
                                            }
                                        } catch (err) {
                                            console.error('Failed to add reference to board on canvas drop:', err);
                                        }
                                    }
                                }}
                                className="group mb-9 grid w-full overflow-hidden rounded-2xl bg-stone-950 text-left text-white sm:grid-cols-[180px_1fr] transition-transform hover:scale-[1.005]"
                            >
                                <div className="aspect-[4/3] overflow-hidden sm:aspect-auto"><BoardCover board={selectedFolder} /></div>
                                <div className="flex items-center justify-between gap-5 p-5 sm:p-6">
                                    <div><span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400"><Lock className="h-3 w-3" /> Board canvas</span><h3 className="mt-2 text-xl font-semibold">Open canvas</h3><p className="mt-1 text-sm text-stone-400">Arrange references, notes, and drawings.</p></div>
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-stone-950 transition group-hover:scale-105"><ArrowUpRight className="h-5 w-5" /></span>
                                </div>
                            </button>
                            <ReferenceMasonry references={visibleReferences} moodboards={moodboards} showFolderPicker={false} onOpenReference={onOpenReference} onAddReferenceToBoard={onAddReferenceToBoard} isSelectMode={isReferenceSelectMode || selectedReferenceIds.size > 0} selectedReferenceIds={selectedReferenceIds} onToggleReference={toggleReferenceSelection} onReferenceInteraction={() => setIsBoardSelectMode(false)} isUploading={isUploadingReferences} uploadProgress={uploadProgress} />
                        </section>
                    ) : (
                        <section>
                            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-3xl font-semibold tracking-[-0.03em]">All saves</h2>
                                    <p className="mt-2 text-sm text-stone-500">Your main reference library. Use + on any save to file it into an inspiration.</p>
                                </div>
                                {onUploadReferences && (
                                    <Button
                                        onClick={async () => {
                                            const newBoardId = await onCreateBoard();
                                            if (newBoardId) onUploadReferences(newBoardId);
                                        }}
                                        disabled={isUploadingReferences}
                                        className="h-10 rounded-full bg-stone-950 px-4 text-xs font-semibold text-white hover:bg-stone-800 shadow-sm"
                                    >
                                        {isUploadingReferences ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
                                        {isUploadingReferences ? 'Uploading references…' : 'Upload references'}
                                    </Button>
                                )}
                                {selectedReferenceIds.size > 0 && (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-3 duration-200">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedReferenceIds(new Set())}
                                            className="h-10 rounded-full border-black/10 bg-white px-3.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                                        >
                                            Clear ({selectedReferenceIds.size})
                                        </Button>
                                        {onRemoveReferencesFromAllSaves && (
                                            <Button
                                                size="sm"
                                                onClick={async () => {
                                                    if (!confirm(`Remove ${selectedReferenceIds.size} reference${selectedReferenceIds.size === 1 ? '' : 's'} from All saves?`)) return;
                                                    await onRemoveReferencesFromAllSaves([...selectedReferenceIds]);
                                                    setSelectedReferenceIds(new Set());
                                                }}
                                                className="h-10 rounded-full bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" /> Delete ({selectedReferenceIds.size})
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                            {isUploadingReferences && (
                                <div className="mb-7 overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
                                    <div className="flex items-center justify-between gap-4 text-sm font-semibold text-indigo-950"><span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> Creating your upload board</span><span>{uploadProgress}%</span></div>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} /></div>
                                </div>
                            )}
                            <ReferenceMasonry references={visibleReferences} moodboards={moodboards} showFolderPicker onOpenReference={onOpenReference} onAddReferenceToBoard={onAddReferenceToBoard} isSelectMode={isReferenceSelectMode || selectedReferenceIds.size > 0} selectedReferenceIds={selectedReferenceIds} onToggleReference={toggleReferenceSelection} onReferenceInteraction={() => setIsBoardSelectMode(false)} isUploading={isUploadingReferences} uploadProgress={uploadProgress} />
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}
