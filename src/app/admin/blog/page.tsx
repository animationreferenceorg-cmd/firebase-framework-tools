
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { MoreHorizontal, PlusCircle, BookOpen, Search, Edit, Trash, Globe } from 'lucide-react';
import type { BlogPost } from '@/lib/types';
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
import { collection, getDocs, doc, deleteDoc, updateDoc, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
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

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchPosts = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const blogCollection = collection(db, 'blogPosts');
      const q = query(blogCollection, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const postList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BlogPost));
      setPosts(postList);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch blog posts.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [toast]);

  const filteredPosts = useMemo(() => {
    return posts.filter(post => 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [posts, searchTerm]);

  const handleDelete = async (postId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'blogPosts', postId));
      toast({
        title: "Post Deleted",
        description: "The blog post has been successfully removed.",
      });
      fetchPosts();
    } catch (error) {
      console.error("Error deleting post: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong while deleting the post.",
      });
    }
  };

  const handleToggleStatus = async (post: BlogPost) => {
    if (!db) return;
    try {
      const newStatus = post.status === 'published' ? 'draft' : 'published';
      await updateDoc(doc(db, 'blogPosts', post.id), {
        status: newStatus,
        updatedAt: new Date()
      });
      toast({
        title: `Post ${newStatus === 'published' ? 'Published' : 'Moved to Drafts'}`,
        description: `The post status has been updated.`,
      });
      fetchPosts();
    } catch (error) {
      console.error("Error updating post status: ", error);
    }
  };

  const getSeoStatus = (post: BlogPost) => {
    const issues = [];
    if (!post.seoTitle) issues.push("Missing SEO Title");
    if (!post.seoDescription) issues.push("Missing Meta Description");
    if (!post.keywords || post.keywords.length === 0) issues.push("No keywords defined");
    if (post.seoDescription && post.seoDescription.length < 50) issues.push("Description too short");
    if (post.seoDescription && post.seoDescription.length > 160) issues.push("Description too long");
    
    return issues;
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold md:text-2xl">Articles</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" className="h-8 gap-1" asChild>
              <Link href="/admin/blog/new">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add Article
                </span>
              </Link>
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Content Management & SEO Tracker</CardTitle>
            <CardDescription>
              Manage your articles and monitor their SEO optimization status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search posts..."
                  className="pl-8 w-full bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SEO Health</TableHead>
                    <TableHead className="hidden md:table-cell">Slug</TableHead>
                    <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[100px]" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredPosts.length > 0 ? (
                    filteredPosts.map((post) => {
                      const seoIssues = getSeoStatus(post);
                      return (
                        <TableRow key={post.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{post.title}</span>
                              <span className="text-xs text-muted-foreground md:hidden">{post.slug}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={post.status === 'published' ? 'default' : 'secondary'}
                              className="cursor-pointer"
                              onClick={() => handleToggleStatus(post)}
                            >
                              {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {seoIssues.length === 0 ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 gap-1">
                                <Globe className="h-3 w-3" />
                                Optimized
                              </Badge>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200 w-fit">
                                  {seoIssues.length} Issue{seoIssues.length > 1 ? 's' : ''}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                  {seoIssues[0]}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            /{post.slug}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {post.updatedAt?.toDate ? post.updatedAt.toDate().toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/blog/edit/${post.id}`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Post
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/blog/${post.slug}`} target="_blank">
                                    <Globe className="mr-2 h-4 w-4" />
                                    View Live
                                  </Link>
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                      <Trash className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the post "{post.title}".
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(post.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No blog posts found. <Link href="/admin/blog/new" className="text-primary underline">Create your first post!</Link>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
