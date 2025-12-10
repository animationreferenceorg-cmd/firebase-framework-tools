

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MoreHorizontal, PlusCircle, Edit, ArrowLeft } from 'lucide-react';
import type { Video, Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { collection, getDocs, query, where, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter } from 'next/navigation';
import CategoryForm from '@/components/admin/CategoryForm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function EditCategoryPage() {
  const { id } = useParams();
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const fetchCategoryAndVideos = async () => {
    if (!id || !db) return;
    setLoading(true);
    try {
      // Fetch category details
      const categoryRef = doc(db, 'categories', id as string);
      const categorySnap = await getDoc(categoryRef);
      if (categorySnap.exists()) {
        setCategory({ id: categorySnap.id, ...categorySnap.data() } as Category);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Category not found.' });
        router.push('/admin/categories');
        return;
      }

      // Fetch videos for this category
      const videosCollection = collection(db, 'videos');
      const q = query(videosCollection, where("categoryIds", "array-contains", id));
      const videoSnapshot = await getDocs(q);
      const videosList = videoSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Video));
      setVideos(videosList);

    } catch (error) {
      console.error("Error fetching category videos:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch videos for this category.' })
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategoryAndVideos();
  }, [id, toast, router]);

  const handleDelete = async (videoId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "videos", videoId));
      toast({
        title: "Video Deleted",
        description: "The video has been successfully removed.",
      });
      fetchCategoryAndVideos();
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong while deleting the video.",
      });
    }
  };
  
  const handleEditSuccess = () => {
    fetchCategoryAndVideos(); // Refresh data on success
    setIsFormOpen(false); // Close the dialog
  }

  const handleSetFeatured = async (video: Video) => {
    if (!id || !db) return;
    try {
        const categoryRef = doc(db, "categories", id as string);
        await updateDoc(categoryRef, {
            featuredVideoId: video.id,
            imageUrl: video.thumbnailUrl, // Also update the category image
        });
        toast({
            title: "Featured Video Set!",
            description: `\"${video.title}\" is now the featured video for this category.`,
        });
        fetchCategoryAndVideos(); // Refresh category data to reflect changes
    } catch (error) {
        console.error("Error setting featured video: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Something went wrong while setting the featured video.",
        });
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-8 w-8" asChild>
            <Link href="/admin/categories">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Categories</span>
            </Link>
          </Button>
          <div className="flex-1">
            {loading ? (
                <Skeleton className="h-8 w-64" />
            ) : category ? (
                <h1 className="text-lg font-semibold md:text-2xl">Category: &quot;{category.title}&quot;</h1>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                     <Button size="sm" variant="outline" className="h-8 gap-1">
                        <Edit className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Edit Category
                        </span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="admin-theme max-w-6xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Category: {category?.title}</DialogTitle>
                        <DialogDescription>
                            Change the title, description, cover image, and preview video for this category.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-6 -mr-6">
                      {category && <CategoryForm category={category} onSuccess={handleEditSuccess} />}
                    </div>
                </DialogContent>
            </Dialog>
            <Button size="sm" className="h-8 gap-1" asChild>
                <Link href={`/admin/videos/new?categoryId=${id}`}>
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
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Videos in this Category</CardTitle>
                        <CardDescription>There {videos.length === 1 ? 'is' : 'are'} {videos.length} video{videos.length === 1 ? '' : 's'}.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
            {loading ? (
                <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-4">
                        <Skeleton className="h-16 w-16" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                ))}
                </div>
            ) : videos.length > 0 ? (
                <div className="space-y-4">
                {videos.map((video) => (
                    <Card key={video.id} className="flex items-center p-2 gap-4">
                        <Image
                        alt={video.title}
                        className="aspect-square rounded-md object-cover"
                        height="64"
                        src={video.thumbnailUrl}
                        width="64"
                        />
                        <div className="flex-1 font-medium text-sm truncate pr-4">
                            {video.title}
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                aria-haspopup="true"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                <Link href={`/admin/videos/edit/${video.id}`}>Edit</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSetFeatured(video)}>
                                  Set as Featured
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
                    </Card>
                ))}
                </div>
            ) : (
                <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted rounded-lg">
                <p className="text-lg font-medium">No videos found for this category.</p>
                <p>
                    You can <Link href={`/admin/videos/new?categoryId=${id}`} className="text-primary underline">add one now!</Link>
                </p>
                </div>
            )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
