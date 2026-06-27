
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BlogPost } from '@/lib/types';
import BlogForm from '@/components/admin/BlogForm';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function EditBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!params.id || !db) return;
      try {
        const docRef = doc(db, 'blogPosts', params.id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() } as BlogPost);
        } else {
          toast({
            variant: 'destructive',
            title: 'Not Found',
            description: 'The blog post you are trying to edit does not exist.'
          });
          router.push('/admin/blog');
        }
      } catch (error) {
        console.error('Error fetching blog post:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load blog post.'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [params.id, router, toast]);

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/blog">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Edit: {post.title}</h1>
      </div>
      <BlogForm post={post} />
    </div>
  );
}
