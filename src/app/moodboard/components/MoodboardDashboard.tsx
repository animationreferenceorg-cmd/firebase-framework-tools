'use client';

import { useMemo, useState } from 'react';
import type { Moodboard, Video } from '@/lib/types';
import {
    ArrowUpRight,
    ChevronRight,
    Film,
    Folder,
    FolderOpen,
    LayoutDashboard,
    Lock,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MoodboardDashboardProps {
    moodboards: Moodboard[];
    savedReferences: Video[];
    onCreateBoard: () => Promise<string | void>;
    onOpenBoard: (boardId: string) => void;
    onRenameBoard: (boardId: string, name: string) => Promise<void>;
    onDeleteBoard: (boardId: string) => void;
    onOpenReference: (video: Video) => void;
    onAddReferenceToBoard: (boardId: string, video: Video) => Promise<void>;
}

function getBoardImages(board: Moodboard) {
    const itemImages = (board.items || [])
        .filter(item => item.type === 'image' || item.type === 'video')
        .map(item => item.imageUrl || item.videoData?.thumbnailUrl || item.videoData?.posterUrl)
        .filter(Boolean) as string[];
    return Array.from(new Set([board.thumbnailUrl, ...itemImages].filter(Boolean) as string[])).slice(0, 3);
}

function getFolderReferences(board?: Moodboard) {
    if (!board) return [];
    const seen = new Set<string>();
    return (board.items || []).flatMap(item => {
        const video = item.videoData;
        if (!video || seen.has(video.id)) return [];
        seen.add(video.id);
        return [video];
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
    if (images.length === 0) {
        return (
            <div className="flex h-full items-center justify-center bg-[#e8e3d9]">
                <LayoutDashboard className="h-8 w-8 text-stone-400" />
            </div>
        );
    }
    if (images.length === 1) return <img src={images[0]} alt="" className="h-full w-full object-cover" />;
    return (
        <div className="grid h-full grid-cols-2 grid-rows-2 gap-1 bg-stone-100">
            <img src={images[0]} alt="" className="row-span-2 h-full w-full object-cover" />
            {images.slice(1, 3).map((src, index) => <img key={`${src}-${index}`} src={src} alt="" className="h-full w-full object-cover" />)}
            {images.length === 2 && <div className="bg-stone-300" />}
        </div>
    );
}

function ReferenceMasonry({
    references,
    moodboards,
    showFolderPicker,
    onOpenReference,
    onAddReferenceToBoard,
}: {
    references: Video[];
    moodboards: Moodboard[];
    showFolderPicker: boolean;
    onOpenReference: (video: Video) => void;
    onAddReferenceToBoard: (boardId: string, video: Video) => Promise<void>;
}) {
    if (references.length === 0) {
        return (
            <div className="rounded-2xl border border-black/10 bg-white/60 px-6 py-14 text-center">
                <Film className="mx-auto h-7 w-7 text-stone-400" />
                <p className="mt-3 text-sm font-semibold">Nothing in this inspiration yet</p>
                <p className="mt-1 text-sm text-stone-500">Add references from All saves and they will appear here and on its canvas.</p>
            </div>
        );
    }

    return (
        <div className="columns-2 gap-2.5 sm:columns-3 md:gap-3 xl:columns-4 2xl:columns-5">
            {references.map((video, index) => (
                <article key={video.id} className="group relative mb-2.5 break-inside-avoid overflow-hidden rounded-xl bg-stone-200 md:mb-3">
                    <button onClick={() => onOpenReference(video)} className="block w-full text-left">
                        <img
                            src={getReferenceImage(video)}
                            alt={video.title || 'Saved reference'}
                            className={`w-full object-cover transition duration-500 group-hover:scale-[1.02] ${index % 5 === 0 ? 'aspect-[3/4]' : index % 3 === 0 ? 'aspect-square' : 'aspect-[4/3]'}`}
                        />
                        <span className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-3 pb-3 pt-12 text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                            <span className="block line-clamp-2 text-xs font-semibold leading-snug">{video.title || 'Untitled reference'}</span>
                        </span>
                    </button>
                    {showFolderPicker && moodboards.length > 0 && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-stone-950 opacity-100 shadow-md transition hover:scale-105 md:opacity-0 md:group-hover:opacity-100"
                                    aria-label={`Add ${video.title || 'reference'} to a board`}
                                >
                                    <Plus className="h-4 w-4" />
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
        </div>
    );
}

export function MoodboardDashboard({
    moodboards,
    savedReferences,
    onCreateBoard,
    onOpenBoard,
    onRenameBoard,
    onDeleteBoard,
    onOpenReference,
    onAddReferenceToBoard,
}: MoodboardDashboardProps) {
    const [query, setQuery] = useState('');
    const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftName, setDraftName] = useState('');
    const normalizedQuery = query.trim().toLowerCase();
    const selectedFolder = moodboards.find(board => board.id === selectedFolderId);
    const folderReferences = getFolderReferences(selectedFolder);
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

    return (
        <main className="min-h-full bg-[#f7f6f2] text-stone-950">
            <div className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#f7f6f2]/90 backdrop-blur-xl">
                <div className="flex flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
                    <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Reference workspace</p>
                        <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Boards</h1>
                    </div>
                    <div className="flex w-full items-center gap-2 lg:w-auto">
                        <label className="relative min-w-0 flex-1 lg:w-80">
                            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search this board" className="h-11 w-full rounded-full border border-black/10 bg-white/80 pl-10 pr-4 text-sm outline-none transition focus:border-black/30 focus:bg-white" />
                        </label>
                        <Button onClick={createInspiration} className="h-11 shrink-0 rounded-full bg-stone-950 px-5 text-white hover:bg-stone-800">
                            <Plus className="mr-1.5 h-4 w-4" /> New board
                        </Button>
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
                        <div className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">Boards</div>
                        {moodboards.map(board => {
                            const count = getFolderReferences(board).length;
                            const isSelected = selectedFolderId === board.id;
                            return (
                                <button key={board.id} onClick={() => setSelectedFolderId(board.id)} className={`group/folder flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${isSelected ? 'bg-white shadow-sm' : 'hover:bg-black/5'}`}>
                                    {isSelected ? <FolderOpen className="h-4 w-4 text-amber-600" /> : <Folder className="h-4 w-4 text-stone-400" />}
                                    <span className="min-w-0 flex-1 truncate font-medium">{board.name || 'Untitled board'}</span>
                                    <span className="text-xs text-stone-400">{count}</span>
                                </button>
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
                                        <input autoFocus value={draftName} onChange={event => setDraftName(event.target.value)} onBlur={() => commitRename(selectedFolder)} onKeyDown={event => { if (event.key === 'Enter') commitRename(selectedFolder); if (event.key === 'Escape') setEditingId(null); }} className="border-b border-stone-900 bg-transparent text-3xl font-semibold tracking-tight outline-none" />
                                    ) : <h2 className="text-3xl font-semibold tracking-[-0.03em]">{selectedFolder.name || 'Untitled board'}</h2>}
                                    <p className="mt-2 text-sm text-stone-500">{visibleReferences.length} references · Gallery and canvas</p>
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild><button className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white"><MoreHorizontal className="h-4 w-4" /></button></PopoverTrigger>
                                    <PopoverContent align="end" className="w-44 rounded-xl p-1">
                                        <button onClick={() => { setEditingId(selectedFolder.id); setDraftName(selectedFolder.name || 'Untitled inspiration'); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-stone-100">Rename</button>
                                        <button onClick={() => onDeleteBoard(selectedFolder.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Delete</button>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <button onClick={() => onOpenBoard(selectedFolder.id)} className="group mb-9 grid w-full overflow-hidden rounded-2xl bg-stone-950 text-left text-white sm:grid-cols-[180px_1fr]">
                                <div className="aspect-[4/3] overflow-hidden sm:aspect-auto"><BoardCover board={selectedFolder} /></div>
                                <div className="flex items-center justify-between gap-5 p-5 sm:p-6">
                                    <div><span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400"><Lock className="h-3 w-3" /> Board canvas</span><h3 className="mt-2 text-xl font-semibold">Open canvas</h3><p className="mt-1 text-sm text-stone-400">Arrange references, notes, drawings, and connections.</p></div>
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-stone-950 transition group-hover:scale-105"><ArrowUpRight className="h-5 w-5" /></span>
                                </div>
                            </button>
                            <ReferenceMasonry references={visibleReferences} moodboards={moodboards} showFolderPicker={false} onOpenReference={onOpenReference} onAddReferenceToBoard={onAddReferenceToBoard} />
                        </section>
                    ) : (
                        <section>
                            <div className="mb-7"><h2 className="text-3xl font-semibold tracking-[-0.03em]">All saves</h2><p className="mt-2 text-sm text-stone-500">Your main reference library. Use + on any save to file it into an inspiration.</p></div>
                            <ReferenceMasonry references={visibleReferences} moodboards={moodboards} showFolderPicker onOpenReference={onOpenReference} onAddReferenceToBoard={onAddReferenceToBoard} />
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}
