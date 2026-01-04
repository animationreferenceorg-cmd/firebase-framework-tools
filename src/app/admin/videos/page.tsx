
'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MoreHorizontal, PlusCircle, LayoutGrid, List, Sparkles, Loader2 } from 'lucide-react';
import type { Video, Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import { collection, getDocs, query, where, deleteDoc, doc, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';

import { nanoid } from 'nanoid';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { VideoCard } from '@/components/VideoCard';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BulkVideoEditor } from '@/components/admin/BulkVideoEditor';
import { QuickEditVideoDialog } from '@/components/admin/QuickEditVideoDialog';

import { useSearchParams } from 'next/navigation';

function VideosPageContent() {
  const searchParams = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('tab') || 'all');
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchVideos = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const videosCollection = collection(db, 'videos');
      const videoSnapshot = await getDocs(videosCollection);
      const videosList = videoSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Video))
        .filter(video => video.isShort !== true);
      setVideos(videosList);

      const tagsCollection = collection(db, 'tags');
      const tagsSnapshot = await getDocs(tagsCollection);
      const tagsList = tagsSnapshot.docs.map(doc => doc.id);
      setAllTags(tagsList);

      const categoriesCollection = collection(db, 'categories');
      const categorySnapshot = await getDocs(categoriesCollection);
      const categoryList = categorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Category));
      setAllCategories(categoryList);

    } catch (error) {
      console.error("Error fetching videos:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch videos.' })
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVideos();
  }, [toast]);

  const handleDelete = async (videoId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "videos", videoId));
      toast({
        title: "Video Deleted",
        description: "The video has been successfully removed.",
      });
      fetchVideos();
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong while deleting the video.",
      });
    }
  };

  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTag =
        tagFilter === 'all' ||
        video.tags?.includes(tagFilter);

      const matchesCategory =
        categoryFilter === 'all' ||
        video.categoryIds?.includes(categoryFilter);

      let matchesStatus = true;
      if (statusFilter === 'published') {
        // If status is undefined, assume published (legacy)
        matchesStatus = video.status === 'published' || !video.status;
      } else if (statusFilter === 'draft') {
        matchesStatus = video.status === 'draft';
      }

      return matchesSearch && matchesTag && matchesCategory && matchesStatus;
    })
  }, [videos, searchTerm, tagFilter, categoryFilter, statusFilter]);

  const [quickEditVideo, setQuickEditVideo] = useState<Video | null>(null);

  // Bulk Actions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVideoIds(new Set(filteredVideos.map(v => v.id)));
    } else {
      setSelectedVideoIds(new Set());
    }
  };

  const handleSelectOne = (videoId: string, checked: boolean) => {
    const newSelected = new Set(selectedVideoIds);
    if (checked) {
      newSelected.add(videoId);
    } else {
      newSelected.delete(videoId);
    }
    setSelectedVideoIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!db) return;
    if (!confirm(`Are you sure you want to delete ${selectedVideoIds.size} videos? This cannot be undone.`)) return;

    try {
      const batch = writeBatch(db);
      selectedVideoIds.forEach(id => {
        batch.delete(doc(db, "videos", id));
      });
      await batch.commit();

      toast({ title: "Bulk Delete Successful", description: `Deleted ${selectedVideoIds.size} videos.` });
      setSelectedVideoIds(new Set());
      fetchVideos();
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast({ variant: "destructive", title: "Error", description: "Bulk delete failed." });
    }
  };

  const handleBulkPublish = async () => {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      selectedVideoIds.forEach(id => {
        batch.update(doc(db, "videos", id), { status: 'published' });
      });
      await batch.commit();

      toast({ title: "Bulk Publish Successful", description: `Published ${selectedVideoIds.size} videos.` });
      setSelectedVideoIds(new Set());
      fetchVideos();
    } catch (error) {
      console.error("Bulk publish failed:", error);
      toast({ variant: "destructive", title: "Error", description: "Bulk publish failed." });
    }
  };

  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  const handleBulkEdit = async (addCategories: string[], addTags: string[]) => {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      let count = 0;

      for (const videoId of selectedVideoIds) {
        const video = videos.find(v => v.id === videoId);
        if (!video) continue;

        const updateData: any = {};

        // Categories
        if (addCategories.length > 0) {
          const currentCats = video.categoryIds || [];
          // Merge unique
          const newCats = Array.from(new Set([...currentCats, ...addCategories]));
          if (newCats.length !== currentCats.length) {
            updateData.categoryIds = newCats;
          }
        }

        // Tags
        if (addTags.length > 0) {
          const currentTags = video.tags || [];
          const newTags = Array.from(new Set([...currentTags, ...addTags]));
          if (newTags.length !== currentTags.length) {
            updateData.tags = newTags;
          }
        }

        if (Object.keys(updateData).length > 0) {
          batch.update(doc(db, "videos", videoId), updateData);
          count++;
        }
      }

      if (count > 0) {
        await batch.commit();
        toast({ title: "Bulk Edit Successful", description: `Updated ${count} videos.` });
        fetchVideos();
      } else {
        toast({ title: "No Changes", description: "No updates were needed." });
      }

    } catch (error) {
      console.error("Bulk edit failed:", error);
      toast({ variant: "destructive", title: "Error", description: "Bulk edit failed." });
    }
  };



  // Helper to render the video list/grid, so we don't duplicate code
  const renderVideoList = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Input
          placeholder="Search by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-background lg:col-span-2"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={loading}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.sort((a, b) => a.title.localeCompare(b.title)).map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tagFilter} onValueChange={setTagFilter} disabled={loading}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Filter by tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {allTags.sort().map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 mb-4">
        <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('list')}>
          <List className="h-4 w-4" />
          <span className="sr-only">List View</span>
        </Button>
        <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('grid')}>
          <LayoutGrid className="h-4 w-4" />
          <span className="sr-only">Grid View</span>
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedVideoIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <span className="font-semibold">{selectedVideoIds.size} selected</span>
          <div className="h-4 w-px bg-background/20" />
          <Button size="sm" variant="secondary" onClick={() => setIsBulkEditOpen(true)} className="bg-blue-600 text-white hover:bg-blue-700 border-none">
            Edit Selected
          </Button>
          <Button size="sm" variant="secondary" onClick={handleBulkPublish} className="bg-green-600 text-white hover:bg-green-700 border-none">Publish Selected</Button>

          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>Delete Selected</Button>
          <Button size="sm" variant="ghost" className="text-background hover:bg-background/20" onClick={() => setSelectedVideoIds(new Set())}>Cancel</Button>
        </div>
      )}

      <BulkVideoEditor
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        selectedCount={selectedVideoIds.size}
        onSave={handleBulkEdit}
        allCategories={allCategories}
        allTags={allTags}
      />

      <QuickEditVideoDialog
        open={!!quickEditVideo}
        onOpenChange={(open) => !open && setQuickEditVideo(null)}
        video={quickEditVideo}
        onSave={fetchVideos}
        allCategories={allCategories}
        allTags={allTags}
      />

      {view === 'list' ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={filteredVideos.length > 0 && selectedVideoIds.size === filteredVideos.length}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
              </TableHead>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead className="hidden md:table-cell">Tags</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-4 rounded-sm" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-16 w-16 rounded-md" />
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredVideos.length > 0 ? (
              filteredVideos.map((video) => (
                <TableRow key={video.id} data-state={selectedVideoIds.has(video.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedVideoIds.has(video.id)}
                      onCheckedChange={(checked) => handleSelectOne(video.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Image
                      alt={video.title}
                      className="aspect-square rounded-md object-cover"
                      height="64"
                      src={video.thumbnailUrl}
                      width="64"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{video.title}</TableCell>
                  <TableCell>
                    <Badge variant={video.status === 'draft' ? "secondary" : "default"}>
                      {video.status === 'draft' ? 'Draft' : 'Published'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {video.categoryIds?.map(catId => {
                        const category = allCategories.find(c => c.id === catId);
                        return category ? <Badge key={catId} variant="outline">{category.title}</Badge> : null;
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {video.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setQuickEditVideo(video)}>
                          Quick Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/videos/edit/${video.id}`}>Edit Full</Link>
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the
                                video and remove its data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(video.id)}>
                                Continue
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No videos found. <Link href="/admin/videos/new" className="text-primary underline">Add one now!</Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <Card key={index}>
                <Skeleton className="aspect-video w-full rounded-t-lg" />
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-8 w-full" />
                </CardFooter>
              </Card>
            ))
          ) : filteredVideos.length > 0 ? (
            filteredVideos.map((video) => (
              <Card key={video.id} className="flex flex-col">
                <VideoCard video={video} />
                <CardHeader className="flex-1 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base leading-tight line-clamp-2">{video.title}</CardTitle>
                    <Badge variant={video.status === 'draft' ? "secondary" : "default"} className="shrink-0 text-[10px] px-1.5 py-0 h-5">
                      {video.status === 'draft' ? 'Draft' : 'Pub'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-1 pt-2">
                  <div>
                    <h4 className="text-xs font-semibold mb-1">Categories</h4>
                    <div className="flex flex-wrap gap-1">
                      {video.categoryIds?.slice(0, 2).map(catId => {
                        const category = allCategories.find(c => c.id === catId);
                        return category ? <Badge key={catId} variant="outline">{category.title}</Badge> : null;
                      })}
                      {video.categoryIds && video.categoryIds.length > 2 && (
                        <Badge variant="secondary">+{video.categoryIds.length - 2} more</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold mb-1 mt-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {video.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-2 border-t mt-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-haspopup="true"
                        size="sm"
                        variant="ghost"
                        className="w-full justify-center gap-2"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setQuickEditVideo(video)}>
                        Quick Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/videos/edit/${video.id}`}>Edit</Link>
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the
                              video and remove its data from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(video.id)}>
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full h-48 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted rounded-lg">
              <p className="text-lg font-medium">No videos found.</p>
              <p>Try adjusting your filters or <Link href="/admin/videos/new" className="text-primary underline">add one now!</Link></p>
            </div>
          )}
        </div>
      )}
    </>);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold md:text-2xl">Videos</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" className="h-8 gap-1" asChild>
              <Link href="/admin/videos/new">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add Video
                </span>
              </Link>
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Video Library</CardTitle>
            <CardDescription>
              Manage your video collection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" onValueChange={setStatusFilter} value={statusFilter} className="w-full">
              <div className="flex items-center mb-4">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="published">Published</TabsTrigger>
                  <TabsTrigger value="draft">Drafts</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="mt-0">
                {renderVideoList()}
              </TabsContent>
              <TabsContent value="published" className="mt-0">
                {renderVideoList()}
              </TabsContent>
              <TabsContent value="draft" className="mt-0">
                {renderVideoList()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function VideosPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <VideosPageContent />
    </Suspense>
  );
}
