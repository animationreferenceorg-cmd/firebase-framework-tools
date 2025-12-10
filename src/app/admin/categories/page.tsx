
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { MoreHorizontal, PlusCircle, LayoutGrid, List, UploadCloud, Edit } from 'lucide-react';
import type { Category, Video } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { collection, getDocs, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CategoryCard } from '@/components/CategoryCard';
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();

  const fetchData = async () => {
    if (!db) return;
    setLoading(true);
    try {
        const categoriesCollection = collection(db, 'categories');
        const categorySnapshot = await getDocs(categoriesCollection);
        const categoryList = categorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
        } as Category));
        setCategories(categoryList.sort((a, b) => a.title.localeCompare(b.title)));

        const videosCollection = collection(db, 'videos');
        const videoSnapshot = await getDocs(videosCollection);
        const videoList = videoSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Video));
        setVideos(videoList);
    } catch (error) {
        console.error("Error fetching data:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not fetch categories or videos.'
        });
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [toast]);
  
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    categories.forEach(category => {
      category.tags?.forEach(tag => tags.add(tag));
    });
    return ['all', ...Array.from(tags).sort()];
  }, [categories]);
  
  const videosMap = useMemo(() => {
    const map = new Map<string, Video>();
    videos.forEach(video => map.set(video.id, video));
    return map;
  }, [videos]);

  const enhancedCategories = useMemo(() => {
    return categories.map(category => {
      const featuredVideo = category.featuredVideoId ? videosMap.get(category.featuredVideoId) : undefined;
      return {
        ...category,
        imageUrl: featuredVideo?.thumbnailUrl || category.imageUrl,
        videoUrl: featuredVideo?.videoUrl || category.videoUrl,
      };
    });
  }, [categories, videosMap]);


  const filteredCategories = useMemo(() => {
    return enhancedCategories.filter(category => {
      const matchesSearch = category.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = tagFilter === 'all' || category.tags?.includes(tagFilter);
      return matchesSearch && matchesTag;
    });
  }, [enhancedCategories, searchTerm, tagFilter]);

  const draftCount = useMemo(() => {
    return categories.filter(c => c.status === 'draft').length;
  }, [categories]);


  const handlePublish = async (categoryId: string) => {
    if (!db) return;
    try {
      const categoryRef = doc(db, 'categories', categoryId);
      await updateDoc(categoryRef, { status: 'published' });
      toast({
        title: 'Category Published!',
        description: 'The category is now live.',
      });
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error publishing category: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong while publishing the category.',
      });
    }
  };

  const handlePublishAll = async () => {
    if (!db) return;
    const draftCategories = categories.filter(c => c.status === 'draft');
    if (draftCategories.length === 0) {
      toast({
        title: 'No Drafts to Publish',
        description: 'All categories are already live.',
      });
      return;
    }

    try {
        const batch = writeBatch(db);
        for (const category of draftCategories) {
            const categoryRef = doc(db, 'categories', category.id);
            batch.update(categoryRef, { status: 'published' });
        }
        await batch.commit();
      
      toast({
        title: 'All Drafts Published!',
        description: `${draftCategories.length} categories have been published.`,
      });
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error publishing all categories: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong while publishing all drafts.',
      });
    }
  };
  
    const handleDelete = async (categoryId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      toast({
        title: "Category Deleted",
        description: "The category has been successfully removed.",
      });
      fetchData();
    } catch (error) {
      console.error("Error deleting category: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong while deleting the category.",
      });
    }
  };


  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold md:text-2xl">Categories</h1>
          <div className="ml-auto flex items-center gap-2">
            {draftCount > 0 && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button size="sm" variant="outline" className="h-8 gap-1">
                            <UploadCloud className="h-3.5 w-3.5" />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                            Publish All ({draftCount})
                            </span>
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Publish All Drafts?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will make {draftCount} {draftCount === 1 ? 'category' : 'categories'} live and visible to all users. Are you sure?
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePublishAll}>
                            Publish All
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            <Button size="sm" className="h-8 gap-1" asChild>
              <Link href="/admin/categories/new">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add Category
                </span>
              </Link>
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Category Library</CardTitle>
            <CardDescription>
              A list of all the categories in your collection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <Input
                    placeholder="Search by title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-background lg:col-span-2"
                />
                <Select value={tagFilter} onValueChange={setTagFilter} disabled={loading}>
                    <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Filter by tag" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {allTags.filter(t => t !== 'all').map(tag => (
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

            {view === 'list' ? (
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="hidden md:table-cell">
                        Description
                    </TableHead>
                    <TableHead>
                        <span className="sr-only">Actions</span>
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                        <TableCell>
                            <Skeleton className="h-4 w-[200px]" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </TableCell>
                        <TableCell>
                            <Skeleton className="h-4 w-[150px]" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            <Skeleton className="h-4 w-[250px]" />
                        </TableCell>
                        <TableCell>
                            <Skeleton className="h-8 w-8 rounded-full" />
                        </TableCell>
                        </TableRow>
                    ))
                    ) : filteredCategories.length > 0 ? (
                    filteredCategories.map((category) => (
                        <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.title}</TableCell>
                        <TableCell className="hidden md:table-cell">
                            <Badge variant={category.status === 'published' ? 'default' : 'secondary'}>
                            {category.status === 'published' ? 'Published' : 'Draft'}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="flex gap-1 flex-wrap max-w-xs">
                            {category.tags?.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                            </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-sm truncate">
                            {category.description}
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
                                {category.status === 'draft' && (
                                    <DropdownMenuItem onClick={() => handlePublish(category.id)}>
                                        Publish
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/categories/${category.id}`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit / View
                                  </Link>
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
                                            This action cannot be undone. This will permanently delete this category.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(category.id)}>
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
                            <TableCell colSpan={5} className="h-24 text-center">
                                No categories found. <Link href="/admin/categories/new" className="text-primary underline">Add one now!</Link>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {loading ? (
                        Array.from({ length: 8 }).map((_, index) => (
                           <Skeleton key={index} className="w-full aspect-[4/3] rounded-lg" />
                        ))
                    ) : filteredCategories.length > 0 ? (
                        filteredCategories.map((category) => (
                           <div key={category.id} className="relative group/card">
                             <CategoryCard 
                                hideLikeButton
                                {...category}
                              />
                             <div className="absolute top-2 right-2 z-10 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                        aria-haspopup="true"
                                        size="icon"
                                        variant="secondary"
                                        className="h-8 w-8"
                                        >
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Toggle menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        {category.status === 'draft' && (
                                            <DropdownMenuItem onClick={() => handlePublish(category.id)}>
                                                Publish
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem asChild>
                                          <Link href={`/admin/categories/${category.id}`}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit / View
                                          </Link>
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
                                                    This action cannot be undone. This will permanently delete this category.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(category.id)}>
                                                    Continue
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                             </div>
                           </div>
                        ))
                    ) : (
                        <div className="col-span-full h-48 flex items-center justify-center text-center">
                            <p>No categories found.</p>
                        </div>
                    )}
                </div>
            )}

          </CardContent>
        </Card>
      </main>
    </div>
  );
}
