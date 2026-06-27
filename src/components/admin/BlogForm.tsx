
'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation";
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BlogPost } from "@/lib/types";
import { useEffect, useState } from "react"
import { Globe, Layout, Search, Type, Image as ImageIcon, Film } from "lucide-react";
import Image from 'next/image';

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  slug: z.string().min(3, "Slug must be at least 3 characters.").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  content: z.string().min(20, "Content must be at least 20 characters."),
  excerpt: z.string().optional(),
  coverImage: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  seoTitle: z.string().max(70, "SEO Title should be under 70 characters").optional(),
  seoDescription: z.string().max(160, "SEO Description should be under 160 characters").optional(),
  keywords: z.string().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  videoIds: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface BlogFormProps {
  post?: BlogPost;
  onSuccess?: () => void;
}

export default function BlogForm({ post, onSuccess }: BlogFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isAutoSlug, setIsAutoSlug] = useState(!post);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: post?.title || "",
      slug: post?.slug || "",
      content: post?.content || "",
      excerpt: post?.excerpt || "",
      coverImage: post?.coverImage || "",
      seoTitle: post?.seoTitle || "",
      seoDescription: post?.seoDescription || "",
      keywords: post?.keywords?.join(', ') || "",
      status: post?.status || 'draft',
      videoIds: post?.videoIds || [],
    },
  });

  const title = form.watch('title');
  const [allVideos, setAllVideos] = useState<{ id: string; title: string; uploader?: string }[]>([]);
  const [videoSearch, setVideoSearch] = useState("");

  useEffect(() => {
    async function fetchVideos() {
      try {
        const videosRef = collection(db, "videos");
        const snapshot = await getDocs(videosRef);
        const videoList = snapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || "Untitled",
          uploader: doc.data().uploader || "Unknown"
        }));
        setAllVideos(videoList);
      } catch (err) {
        console.error("Error fetching videos for selection:", err);
      }
    }
    fetchVideos();
  }, []);

  const videoIds = form.watch('videoIds') || [];
  const filteredVideos = allVideos.filter(video => 
    video.title.toLowerCase().includes(videoSearch.toLowerCase()) || 
    (video.uploader || '').toLowerCase().includes(videoSearch.toLowerCase())
  );

  useEffect(() => {
    if (isAutoSlug && title) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      form.setValue('slug', slug, { shouldValidate: true });
    }
  }, [title, isAutoSlug, form]);

  async function onSubmit(values: FormValues) {
    try {
      const keywords = values.keywords 
        ? values.keywords.split(',').map(k => k.trim()).filter(k => k !== '')
        : [];

      const dataToSave = {
        title: values.title,
        slug: values.slug,
        content: values.content,
        excerpt: values.excerpt || "",
        coverImage: values.coverImage || "",
        seoTitle: values.seoTitle || "",
        seoDescription: values.seoDescription || "",
        keywords: keywords,
        status: values.status,
        videoIds: values.videoIds,
        updatedAt: serverTimestamp(),
      };

      if (post) {
        const postRef = doc(db, "blogPosts", post.id);
        await updateDoc(postRef, dataToSave);
        toast({
          title: "Post Updated!",
          description: "Your changes have been saved.",
        });
      } else {
        await addDoc(collection(db, "blogPosts"), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
        toast({
          title: "Post Created!",
          description: "New blog post has been added.",
        });
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/admin/blog");
        router.refresh();
      }
    } catch (error) {
      console.error("Error saving blog post: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong while saving the post.",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter post title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            placeholder="url-friendly-slug" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              setIsAutoSlug(false);
                            }}
                          />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsAutoSlug(true)}
                        >
                          Auto
                        </Button>
                      </div>
                      <FormDescription>
                        The URL path for this post: animationreference.org/blog/{field.value || '...'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Excerpt (Summary)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Short summary for preview cards" 
                          className="h-20"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Write your post content here (Markdown supported)" 
                          className="min-h-[400px] font-mono text-sm"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  SEO Settings
                </CardTitle>
                <CardDescription>
                  Optimize how this page appears in search results.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="seoTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SEO Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Custom search result title" {...field} />
                      </FormControl>
                      <div className="flex justify-between items-center">
                        <FormDescription>
                          Recommended: 50-60 characters.
                        </FormDescription>
                        <span className={`text-xs ${field.value?.length > 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {field.value?.length || 0}/60
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seoDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Short summary for search engines" 
                          className="h-24"
                          {...field} 
                        />
                      </FormControl>
                      <div className="flex justify-between items-center">
                        <FormDescription>
                          Recommended: 150-160 characters.
                        </FormDescription>
                        <span className={`text-xs ${field.value?.length > 160 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {field.value?.length || 0}/160
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Keywords</FormLabel>
                      <FormControl>
                        <Input placeholder="animation, reference, tips..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Comma-separated list of keywords.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Media
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="coverImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      {field.value && (
                        <div className="mt-2 relative aspect-video rounded-md overflow-hidden border">
                          <img src={field.value} alt="Preview" className="object-cover w-full h-full" />
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-5 w-5" />
                  Associated Videos
                </CardTitle>
                <CardDescription>
                  Select reference videos to display on this page (max 30).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Search videos by title or creator..."
                  value={videoSearch}
                  onChange={(e) => setVideoSearch(e.target.value)}
                  className="mb-2"
                />
                <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                  {filteredVideos.length === 0 ? (
                    <div className="text-zinc-500 text-xs py-4 text-center">No videos found.</div>
                  ) : (
                    filteredVideos.map(video => (
                      <div key={video.id} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          id={`video-${video.id}`}
                          checked={videoIds.includes(video.id)}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            let updatedIds = [...videoIds];
                            if (isChecked) {
                              if (videoIds.length >= 30) {
                                toast({
                                  variant: "destructive",
                                  title: "Limit reached",
                                  description: "You can associate a maximum of 30 videos per post."
                                });
                                return;
                              }
                              updatedIds.push(video.id);
                            } else {
                              updatedIds = updatedIds.filter(id => id !== video.id);
                            }
                            form.setValue('videoIds', updatedIds, { shouldDirty: true });
                          }}
                          className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-purple-600 focus:ring-purple-500"
                        />
                        <label htmlFor={`video-${video.id}`} className="leading-tight cursor-pointer select-none">
                          <span className="font-medium text-zinc-200">{video.title}</span>
                          <span className="text-zinc-500 block text-xs">by {video.uploader}</span>
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <div className="text-xs text-zinc-400">
                  {videoIds.length} video(s) selected
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Publishing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant={field.value === 'draft' ? 'default' : 'outline'}
                          className="flex-1"
                          onClick={() => field.onChange('draft')}
                        >
                          Draft
                        </Button>
                        <Button
                          type="button"
                          variant={field.value === 'published' ? 'default' : 'outline'}
                          className="flex-1"
                          onClick={() => field.onChange('published')}
                        >
                          Published
                        </Button>
                      </div>
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : post ? "Update Post" : "Create Post"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  )
}
