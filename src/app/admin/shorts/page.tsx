
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import type { Video } from '@/lib/types';
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
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { toast } = useToast();

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
      // Refresh the list after deletion
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

  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTag = 
        tagFilter === 'all' || 
        video.tags?.includes(tagFilter);
      
      const matchesCategory =
        categoryFilter === 'all' ||
        video.categories?.includes(categoryFilter);

      return matchesSearch && matchesTag && matchesCategory;
    })
  }, [videos, searchTerm, tagFilter, categoryFilter]);

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
          <CardHeader>
            <CardTitle>Short Film Library</CardTitle>
            <CardDescription>
              A list of all the short films in your collection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Input
                placeholder="Search by title..."
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
                Array.from({ length: 8 }).map((_, index) => (
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
                filteredVideos.map((video) => (
                  <Card key={video.id} className="flex flex-col">
                    <div className="relative aspect-video w-full rounded-t-lg overflow-hidden">
                       <Image
                          alt={video.title}
                          className="object-cover"
                          fill
                          src={video.posterUrl}
                        />
                    </div>
                    <CardHeader className="flex-1 pb-2">
                      <CardTitle className="text-base leading-tight line-clamp-2">{video.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-1 pt-2">
                      <div>
                          <h4 className="text-xs font-semibold mb-1">Categories</h4>
                          <div className="flex flex-wrap gap-1">
                            {video.categories?.slice(0, 2).map(cat => <Badge key={cat} variant="outline">{cat}</Badge>)}
                            {video.categories && video.categories.length > 2 && (
                                <Badge variant="secondary">+{video.categories.length - 2} more</Badge>
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
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/shorts/edit/${video.id}`}>Edit</Link>
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
                    </CardFooter>
                  </Card>
                ))
              ) : (
                  <div className="col-span-full h-48 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted rounded-lg">
                      <p className="text-lg font-medium">No short films found.</p>
                      <p>Try adjusting your filters or <Link href="/admin/shorts/new" className="text-primary underline">add one now!</Link></p>
                  </div>
              )}
            </div>

          </CardContent>
        </Card>
      </main>
    </div>
  );
}
