'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Check,
  FolderPlus,
  Loader2,
  Lock,
  Plus,
  Search,
  Sparkles,
  Video as VideoIcon,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import {
  createReferenceBoard,
  getClipSavedBoardIds,
  getUserReferenceBoards,
  removeClipFromBoard,
  saveClipToBoard,
} from '@/lib/reference-service';
import type { ReferenceBoard, ReferenceClip } from '@/lib/types';
import { cn } from '@/lib/utils';

const SUGGESTED_BOARDS = [
  'Body Mechanics',
  'Acting & Expression',
  'Action & Combat',
  'Creatures & Animals',
  'Walks & Runs',
];

export function SaveClipToBoardDialog({
  clip,
  open,
  onOpenChange,
}: {
  clip: ReferenceClip;
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const { toast } = useToast();

  const [boards, setBoards] = useState<ReferenceBoard[]>([]);
  const [savedBoardIds, setSavedBoardIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingBoardId, setSavingBoardId] = useState<string | null>(null);

  // New board creation state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(clip?.isPrivate ?? false);
  const [creating, setCreating] = useState(false);

  // Fetch user boards and which boards already contain this clip
  useEffect(() => {
    if (!open || !user?.uid || !clip?.id) return;

    let isMounted = true;
    setLoading(true);
    setSearchQuery('');
    setShowCreateForm(false);
    setNewTitle('');

    Promise.all([
      getUserReferenceBoards(user.uid, true),
      getClipSavedBoardIds(clip.id, user.uid),
    ])
      .then(([userBoards, savedIds]) => {
        if (!isMounted) return;
        setBoards(userBoards);
        setSavedBoardIds(new Set(savedIds));
      })
      .catch((err) => {
        console.error('Failed to load boards for save dialog:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, user?.uid, clip?.id]);

  // 1-Click Save or Unsave to a selected board
  const handleBoardClick = async (board: ReferenceBoard) => {
    if (!user?.uid || savingBoardId) return;

    const isAlreadySaved = savedBoardIds.has(board.id);
    setSavingBoardId(board.id);

    try {
      if (isAlreadySaved) {
        // Toggle/Remove from board
        await removeClipFromBoard(clip.id, board.id);
        setSavedBoardIds((prev) => {
          const next = new Set(prev);
          next.delete(board.id);
          return next;
        });
        setBoards((prev) =>
          prev.map((b) => (b.id === board.id ? { ...b, clipCount: Math.max(0, (b.clipCount || 1) - 1) } : b))
        );
        toast({
          title: `Removed from ${board.title}`,
          description: clip.title,
        });
      } else {
        // Automatic 1-Click Save
        const thumb = clip.thumbnailUrl || clip.posterUrl || clip.videoUrl;
        await saveClipToBoard(clip.id, board.id, user.uid, thumb);

        setSavedBoardIds((prev) => new Set([...prev, board.id]));
        setBoards((prev) =>
          prev.map((b) =>
            b.id === board.id
              ? { ...b, clipCount: (b.clipCount || 0) + 1, coverUrl: b.coverUrl || thumb }
              : b
          )
        );

        toast({
          title: `Saved to ${board.title}! ✨`,
          description: `Clip added to your vault board.`,
        });

        // Automatically close modal after brief positive visual feedback
        setTimeout(() => {
          onOpenChange(false);
        }, 650);
      }
    } catch (error: any) {
      console.error('Error saving clip to board:', error);
      toast({
        variant: 'destructive',
        title: 'Could not save clip',
        description: error.message || 'Please try again.',
      });
    } finally {
      setSavingBoardId(null);
    }
  };

  // Create new board and automatically save clip to it in one go
  const handleCreateAndSave = async (boardTitleToUse?: string) => {
    const titleToCreate = (boardTitleToUse || newTitle).trim();
    if (!userProfile || !titleToCreate || creating) return;

    setCreating(true);
    try {
      const boardId = await createReferenceBoard({
        owner: userProfile,
        title: titleToCreate,
        isPrivate,
      });

      const thumb = clip.thumbnailUrl || clip.posterUrl || clip.videoUrl;
      await saveClipToBoard(clip.id, boardId, userProfile.uid, thumb);

      const newBoard: ReferenceBoard = {
        id: boardId,
        ownerId: userProfile.uid,
        ownerName: userProfile.displayName || userProfile.username || 'Animator',
        title: titleToCreate,
        slug: titleToCreate.toLowerCase().replace(/\s+/g, '-'),
        coverUrl: thumb,
        isPrivate,
        clipCount: 1,
        followerCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setBoards((prev) => [newBoard, ...prev]);
      setSavedBoardIds((prev) => new Set([...prev, boardId]));

      toast({
        title: `Board created & saved! ✨`,
        description: `"${clip.title}" saved to "${titleToCreate}".`,
      });

      setTimeout(() => {
        onOpenChange(false);
      }, 650);
    } catch (error: any) {
      console.error('Failed to create board:', error);
      toast({
        variant: 'destructive',
        title: 'Could not create board',
        description: error.message || 'Please try again.',
      });
    } finally {
      setCreating(false);
      setNewTitle('');
      setShowCreateForm(false);
    }
  };

  // Filter boards based on search query
  const filteredBoards = boards.filter((b) =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-950/95 text-white backdrop-blur-2xl sm:max-w-md rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-300">
              <Bookmark className="h-4 w-4 fill-purple-400 text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-white">
                Save to board
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Click any board to save automatically, similar to Pinterest.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!user ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-zinc-400">Sign in to organize and save clips into your boards.</p>
            <Button asChild className="rounded-2xl bg-purple-600 hover:bg-purple-500 font-bold">
              <Link href="/login">Sign in to save</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Video Preview Card */}
            {clip && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/70 p-3 shadow-inner">
                <div className="relative h-13 w-20 shrink-0 overflow-hidden rounded-xl bg-black border border-white/10">
                  {clip.thumbnailUrl || clip.posterUrl ? (
                    <img
                      src={clip.thumbnailUrl || clip.posterUrl}
                      alt={clip.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-purple-950/60">
                      <VideoIcon className="h-5 w-5 text-purple-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xs font-bold text-white leading-snug">
                    {clip.title}
                  </h4>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/30 text-purple-300 bg-purple-950/40">
                      {clip.category || 'Reference'}
                    </Badge>
                    {clip.isPrivate && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-300">
                        <Lock className="h-2.5 w-2.5" /> Secret clip
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Search Input for filtering boards */}
            {boards.length > 2 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Search your boards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 rounded-xl border-white/10 bg-zinc-900/60 pl-9 text-xs text-white placeholder:text-zinc-500 focus-visible:ring-purple-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {/* Boards List */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <span>All Boards ({boards.length})</span>
                {savedBoardIds.size > 0 && (
                  <span className="text-purple-400 normal-case font-medium">
                    Saved in {savedBoardIds.size} {savedBoardIds.size === 1 ? 'board' : 'boards'}
                  </span>
                )}
              </div>

              <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs font-semibold text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                    <span>Loading your boards...</span>
                  </div>
                ) : boards.length === 0 ? (
                  /* Empty state with suggested starter boards */
                  <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center space-y-3">
                    <p className="text-xs text-zinc-400">
                      You haven't created any boards yet. Pick a suggestion below to start:
                    </p>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {SUGGESTED_BOARDS.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          disabled={creating}
                          onClick={() => handleCreateAndSave(sug)}
                          className="flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-950/40 px-3 py-1 text-xs font-semibold text-purple-200 transition hover:bg-purple-600 hover:text-white"
                        >
                          <Plus className="h-3 w-3" />
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : filteredBoards.length === 0 ? (
                  /* Search yielded no matches - Quick create button */
                  <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 text-center space-y-2">
                    <p className="text-xs text-zinc-400">
                      No board named "{searchQuery}" found.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleCreateAndSave(searchQuery)}
                      disabled={creating}
                      className="rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold gap-1.5"
                    >
                      {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      Create "{searchQuery}" & Save
                    </Button>
                  </div>
                ) : (
                  filteredBoards.map((board) => {
                    const isSaved = savedBoardIds.has(board.id);
                    const isSavingThis = savingBoardId === board.id;

                    return (
                      <div
                        key={board.id}
                        onClick={() => handleBoardClick(board)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleBoardClick(board);
                          }
                        }}
                        className={cn(
                          'group relative flex w-full items-center justify-between gap-3 rounded-2xl border p-2.5 text-left transition-all cursor-pointer select-none',
                          isSaved
                            ? 'border-purple-500/50 bg-purple-950/25 text-white hover:bg-purple-950/40'
                            : 'border-white/5 bg-zinc-900/40 text-zinc-200 hover:border-white/20 hover:bg-zinc-900 hover:text-white'
                        )}
                      >
                        {/* Left: Thumbnail & Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-800">
                            {board.coverUrl ? (
                              <img
                                src={board.coverUrl}
                                alt=""
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-zinc-800/80 text-zinc-400 group-hover:text-purple-300">
                                <Bookmark className="h-5 w-5" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-bold tracking-tight">
                                {board.title}
                              </span>
                              {board.isPrivate && (
                                <Lock className="h-3 w-3 shrink-0 text-amber-400" title="Private board" />
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-400">
                              {board.clipCount || 0} {board.clipCount === 1 ? 'clip' : 'clips'}
                            </span>
                          </div>
                        </div>

                        {/* Right: Instant Save Button / Saved Badge */}
                        <div className="shrink-0 pl-1">
                          {isSavingThis ? (
                            <div className="flex h-8 w-20 items-center justify-center rounded-full bg-purple-600/50 text-white">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : isSaved ? (
                            <div className="flex h-8 items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-900/40 px-3 text-xs font-bold text-purple-200 shadow-sm transition group-hover:border-red-500/40 group-hover:bg-red-950/30 group-hover:text-red-300">
                              <Check className="h-3.5 w-3.5 stroke-[3] group-hover:hidden" />
                              <span className="group-hover:hidden">Saved</span>
                              <span className="hidden group-hover:inline">Remove</span>
                            </div>
                          ) : (
                            <div className="flex h-8 items-center rounded-full bg-purple-600 px-4 text-xs font-bold text-white shadow-md shadow-purple-600/30 transition duration-200 group-hover:scale-105 group-hover:bg-purple-500">
                              Save
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Create New Board Form / Trigger */}
            <div className="border-t border-white/10 pt-3">
              {showCreateForm ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateAndSave();
                  }}
                  className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-3"
                >
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      New Board Name
                    </label>
                    <Input
                      autoFocus
                      type="text"
                      placeholder="e.g. Quadruped Mechanics, Smears"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="h-9 rounded-xl border-white/15 bg-black/60 text-xs text-white placeholder:text-zinc-500 focus-visible:ring-purple-500"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-zinc-800 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="flex items-center gap-1 font-medium">
                      <Lock className="h-3 w-3 text-amber-400" /> Keep this board secret / private
                    </span>
                  </label>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="submit"
                      disabled={creating || !newTitle.trim()}
                      className="flex-1 h-8 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white gap-1.5"
                    >
                      {creating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Create & Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCreateForm(false)}
                      className="h-8 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(true)}
                  className="w-full h-10 rounded-2xl border-dashed border-white/20 bg-black/40 hover:bg-white/5 text-xs font-bold text-purple-300 hover:text-white flex items-center justify-center gap-2 transition"
                >
                  <FolderPlus className="h-4 w-4 text-purple-400" />
                  Create New Board
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
