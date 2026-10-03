
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MoreHorizontal,
  PlusCircle,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
  FileText,
  Video as VideoIcon,
  Image as ImageIcon,
  ExternalLink,
  Mail,
  UserCheck,
} from 'lucide-react';
import type { Video, BehindTheScenesExtra } from '@/lib/types';
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
import { Badge } from '@/components/ui/badge';
import { collection, getDocs, query, where, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';

export default function ShortsPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [tabFilter, setTabFilter] = useState<'all' | 'pending' | 'published'>('all');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { toast } = useToast();

  const [selectedProofVideo, setSelectedProofVideo] = useState<Video | null>(null);

  const fetchShorts = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const videosCollection = collection(db, 'videos');
      const q = query(videosCollection, where("isShort", "==", true));
      const videoSnapshot = await getDocs(q);
      const videosList = videoSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Video));
      setVideos(videosList);

    } catch (error) {
        console.error("Error fetching shorts:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch short films.'})
    } finally {
        setLoading(false);
    }
  }

  const handleApprove = async (videoId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "videos", videoId), {
        status: 'published',
        approvedAt: serverTimestamp(),
      });
      toast({
        title: "Film Approved & Published!",
        description: "The short film is now live on the public shorts page with all its extras.",
      });
      fetchShorts();
    } catch (error: any) {
      console.error("Error approving short film: ", error);
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: error?.message || "Could not approve the film.",
      });
    }
  };

  const handleReject = async (videoId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "videos", videoId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
      });
      toast({
        title: "Submission Rejected",
        description: "The submission has been marked as rejected.",
      });
      fetchShorts();
    } catch (error: any) {
      console.error("Error rejecting short film: ", error);
      toast({
        variant: "destructive",
        title: "Rejection Failed",
        description: error?.message || "Could not reject the film.",
      });
    }
  };

  useEffect(() => {
    const fetchTaxonomy = async () => {
      if (!db) return;
      try {
          const tagsCollection = collection(db, 'shortFilmTags');
          const tagsSnapshot = await getDocs(tagsCollection);
          const tagsList = tagsSnapshot.docs.map(doc => doc.id);
          setAllTags(tagsList.sort());

          const categoriesCollection = collection(db, 'shortFilmCategories');
          const categorySnapshot = await getDocs(categoriesCollection);
          const categoryList = categorySnapshot.docs.map(doc => doc.id);
          setAllCategories(categoryList.sort());
      } catch (error) {
          console.error("Error fetching taxonomy:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch tags and categories.'})
      }
    };
    
    fetchShorts();
    fetchTaxonomy();
  }, [toast]);

  const handleDelete = async (videoId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "videos", videoId));
      toast({
        title: "Short Film Deleted",
        description: "The short film has been successfully removed.",
      });
      fetchShorts();
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong while deleting the short film.",
      });
    }
  };

  const pendingCount = useMemo(() => {
    return videos.filter((v) => v.status === 'pending_review').length;
  }, [videos]);

  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      const matchesTab =
        tabFilter === 'all' ||
        (tabFilter === 'pending' && video.status === 'pending_review') ||
        (tabFilter === 'published' && (video.status === 'published' || (!video.status && !video.submissionProof)));

      const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTag = 
        tagFilter === 'all' || 
        video.tags?.includes(tagFilter);
      
      const matchesCategory =
        categoryFilter === 'all' ||
        video.categories?.includes(categoryFilter);

      return matchesTab && matchesSearch && matchesTag && matchesCategory;
    })
  }, [videos, tabFilter, searchTerm, tagFilter, categoryFilter]);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold md:text-2xl">Short Films</h1>
          <div className="ml-auto flex items-center gap-2">
             <Button size="sm" className="h-8 gap-1" asChild>
              <Link href="/admin/shorts/new">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add Short Film
                </span>
              </Link>
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Short Film Library & Submissions</CardTitle>
                <CardDescription>
                  Review submitted films, verify behind-the-scenes proof of craftsmanship, and manage catalog.
                </CardDescription>
              </div>

              {/* Tabs Filter */}
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 p-1 self-start sm:self-auto">
                <Button
                  type="button"
                  variant={tabFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTabFilter('all')}
                  className="h-8 text-xs font-semibold"
                >
                  All ({videos.length})
                </Button>
                <Button
                  type="button"
                  variant={tabFilter === 'pending' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTabFilter('pending')}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Pending Review
                  {pendingCount > 0 && (
                    <Badge className="ml-1 bg-amber-500 text-black font-extrabold h-4 px-1.5 text-[10px]">
                      {pendingCount}
                    </Badge>
                  )}
                </Button>
                <Button
                  type="button"
                  variant={tabFilter === 'published' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTabFilter('published')}
                  className="h-8 text-xs font-semibold"
                >
                  Published ({videos.filter((v) => (v.status ?? 'published') === 'published').length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Input
                placeholder="Search by title or director..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={loading}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <Select value={tagFilter} onValueChange={setTagFilter} disabled={loading}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <Card key={index}>
                    <Skeleton className="aspect-video w-full rounded-t-lg" />
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-5 w-1/2" />
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
                filteredVideos.map((video) => {
                  const isPending = video.status === 'pending_review';
                  const isPublished = video.status === 'published' || (!video.status && !video.submissionProof);
                  const isRejected = video.status === 'rejected';
                  const btsCount = video.behindTheScenes?.length || 0;

                  return (
                    <Card key={video.id} className={`flex flex-col overflow-hidden transition-all ${isPending ? 'border-amber-500/50 shadow-lg shadow-amber-500/5' : ''}`}>
                      <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                        <Image
                          alt={video.title}
                          className="object-cover"
                          fill
                          src={video.posterUrl || video.thumbnailUrl || '/placeholder.png'}
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10">
                          {isPending && (
                            <Badge className="bg-amber-500 text-black font-extrabold text-[10px] shadow-md">
                              <Clock className="mr-1 h-3 w-3" />
                              Pending Verification
                            </Badge>
                          )}
                          {isPublished && (
                            <Badge className="bg-emerald-600 text-white font-bold text-[10px] shadow-md">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Published
                            </Badge>
                          )}
                          {isRejected && (
                            <Badge className="bg-red-600 text-white font-bold text-[10px] shadow-md">
                              <XCircle className="mr-1 h-3 w-3" />
                              Rejected
                            </Badge>
                          )}
                        </div>

                        {btsCount > 0 && (
                          <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-purple-950/80 backdrop-blur-md text-purple-200 border border-purple-500/40 text-[10px] font-semibold">
                              <Layers className="mr-1 h-3 w-3 text-purple-400" />
                              {btsCount} BTS Extras
                            </Badge>
                          </div>
                        )}
                      </div>

                      <CardHeader className="pb-2">
                        <CardTitle className="text-base leading-tight line-clamp-1">{video.title}</CardTitle>
                        {video.author_name && (
                          <CardDescription className="text-xs text-muted-foreground truncate">
                            By {video.author_name} {video.submissionProof?.directorRole && `(${video.submissionProof.directorRole})`}
                          </CardDescription>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-3 flex-1 pt-0">
                        {video.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {video.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {video.categories?.slice(0, 2).map(cat => <Badge key={cat} variant="outline" className="text-[10px]">{cat}</Badge>)}
                          {video.tags?.slice(0, 2).map(tag => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
                        </div>

                        {/* If pending review, show proof inspection trigger */}
                        {isPending && (
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2 mt-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-amber-400 flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Proof of Work
                              </span>
                              <span className="text-[11px] text-zinc-400">
                                {btsCount} Asset{btsCount === 1 ? '' : 's'}
                              </span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedProofVideo(video)}
                              className="w-full h-8 text-xs border-amber-500/40 hover:bg-amber-500/10 text-amber-300 font-semibold"
                            >
                              Inspect Proof & Assets
                            </Button>
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="p-2 border-t mt-auto flex items-center gap-1.5">
                        {isPending ? (
                          <div className="grid grid-cols-2 gap-1.5 w-full">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(video.id)}
                              className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                            >
                              <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(video.id)}
                              className="h-8 border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-xs"
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-primary" asChild>
                              <Link href={`/shorts/${video.id}`} target="_blank">
                                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                                View on Site
                              </Link>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  aria-haspopup="true"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/shorts/edit/${video.id}`}>Edit</Link>
                                </DropdownMenuItem>
                                {btsCount > 0 && (
                                  <DropdownMenuItem onClick={() => setSelectedProofVideo(video)}>
                                    View Extras ({btsCount})
                                  </DropdownMenuItem>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500">
                                      Delete
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the
                                        short film and remove its data from our servers.
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
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })
              ) : (
                <div className="col-span-full h-48 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted rounded-lg">
                  <p className="text-lg font-medium">No short films found.</p>
                  <p className="text-xs mt-1">
                    {tabFilter === 'pending'
                      ? 'No films currently awaiting verification.'
                      : 'Try adjusting your filters or add a new one.'}
                  </p>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* ─── PROOF & EXTRAS INSPECTOR DIALOG ─── */}
        <Dialog open={!!selectedProofVideo} onOpenChange={(open) => !open && setSelectedProofVideo(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-border bg-card text-foreground">
            {selectedProofVideo && (
              <div className="space-y-6">
                <DialogHeader className="border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-amber-500" />
                    <DialogTitle className="text-lg font-bold">
                      Submission Verification & Extras: {selectedProofVideo.title}
                    </DialogTitle>
                  </div>
                </DialogHeader>

                {/* Submitter Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-border bg-muted/30 p-3 text-xs">
                  <div>
                    <div className="text-muted-foreground font-semibold">Creator / Submitter</div>
                    <div className="font-bold text-foreground text-sm mt-0.5">
                      {selectedProofVideo.submissionProof?.submittedByName || selectedProofVideo.author_name || 'Anonymous'}
                    </div>
                    <div className="text-muted-foreground">
                      Role: {selectedProofVideo.submissionProof?.directorRole || 'Director'}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-semibold">Contact Email</div>
                    <div className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {selectedProofVideo.submissionProof?.contactEmail || 'Not provided'}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-semibold">Attestation Status</div>
                    <div className="font-semibold text-emerald-500 mt-0.5 flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Original Rights Certified
                    </div>
                  </div>
                </div>

                {/* Film Video Player */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <VideoIcon className="h-4 w-4 text-purple-400" />
                    Submitted Film Video File (MP4)
                  </div>
                  <div className="overflow-hidden rounded-xl bg-black aspect-video max-h-[360px] w-full flex items-center justify-center">
                    {selectedProofVideo.videoUrl ? (
                      <video
                        src={selectedProofVideo.videoUrl}
                        controls
                        playsInline
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="text-muted-foreground text-xs">No video URL available</div>
                    )}
                  </div>
                </div>

                {/* Behind the Scenes Proof Assets */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-purple-400" />
                      Behind-the-Scenes Assets ({selectedProofVideo.behindTheScenes?.length || 0})
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Used for verification & featured in public Extras
                    </span>
                  </div>

                  {selectedProofVideo.behindTheScenes && selectedProofVideo.behindTheScenes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedProofVideo.behindTheScenes.map((extra) => (
                        <div
                          key={extra.id}
                          className="rounded-xl border border-border bg-muted/20 overflow-hidden flex flex-col"
                        >
                          <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                            {extra.mediaType === 'image' ? (
                              <img
                                src={extra.mediaUrl}
                                alt={extra.title}
                                className="h-full w-full object-cover"
                              />
                            ) : extra.mediaType === 'video' ? (
                              <video
                                src={extra.mediaUrl}
                                controls
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1 p-2 text-center">
                                <FileText className="h-8 w-8 text-purple-400" />
                                <span className="text-[10px] text-muted-foreground">PDF Document</span>
                                <a
                                  href={extra.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-primary underline font-medium"
                                >
                                  Open PDF
                                </a>
                              </div>
                            )}
                            <Badge className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wider bg-black/80 text-purple-300">
                              {extra.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="p-2.5 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="font-bold text-xs text-foreground line-clamp-1">{extra.title}</div>
                              {extra.description && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                                  {extra.description}
                                </p>
                              )}
                            </div>
                            <a
                              href={extra.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-primary underline mt-2 inline-flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open Original Asset
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      No behind-the-scenes assets were attached with this submission.
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedProofVideo(null)}
                    className="text-xs"
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      handleReject(selectedProofVideo.id);
                      setSelectedProofVideo(null);
                    }}
                    className="text-xs gap-1.5 font-bold"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Submission
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      handleApprove(selectedProofVideo.id);
                      setSelectedProofVideo(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 font-bold"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve & Publish to Shorts
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
