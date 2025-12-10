
"use client";

import { useMemo, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { VideoRow } from '@/components/VideoRow';
import { CategoryRow } from '@/components/CategoryRow';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video, Category } from '@/lib/types';

export default function MyListPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { userProfile, loading: userProfileLoading } = useUser();

  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!authUser) {
        setDataLoading(false);
        return;
      }
      setDataLoading(true);
      try {
        const videosQuery = query(collection(db, "videos"));
        const categoriesQuery = query(collection(db, "categories"), where("status", "==", "published"));
        
        const [videoSnapshot, categorySnapshot] = await Promise.all([
          getDocs(videosQuery),
          getDocs(categoriesQuery)
        ]);

        const videos = videoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video));
        const categories = categorySnapshot.docs.map(doc => ({ id: doc.id, href: `/browse/${doc.id}`, ...doc.data() } as Category));
        
        setAllVideos(videos);
        setAllCategories(categories);
      } catch (error) {
        console.error("Error fetching list data:", error);
      } finally {
        setDataLoading(false);
      }
    }
    fetchData();
  }, [authUser]);

  const recentlyViewed = useMemo(() => {
    if (!userProfile) return [];
    const viewedIds = userProfile.recentlyViewedShortIds ?? [];
    return allVideos.filter(v => v.isShort && viewedIds.includes(v.id));
  }, [userProfile, allVideos]);
  
  const likedVideos = useMemo(() => {
    if (!userProfile) return [];
    const likedIds = userProfile.likedVideoIds ?? [];
    return allVideos.filter(video => !video.isShort && likedIds.includes(video.id));
  }, [userProfile, allVideos]);

  const likedCategories = useMemo(() => {
    if (!userProfile) return [];
    const likedTitles = userProfile.likedCategoryTitles ?? [];
    return allCategories.filter(category => likedTitles.includes(category.title));
  }, [userProfile, allCategories]);

  const loading = authLoading || userProfileLoading || dataLoading;

  if (loading) {
    return (
      <main className="container mx-auto px-4 md:px-6 pt-6 pb-16 space-y-12">
        <Skeleton className="h-10 w-1/3 mb-8" />
        <div className="space-y-12">
            <div>
                <Skeleton className="h-8 w-1/4 mb-4" />
                <div className="flex space-x-4">
                    <Skeleton className="h-28 w-1/5 rounded-lg" />
                    <Skeleton className="h-28 w-1/5 rounded-lg" />
                    <Skeleton className="h-28 w-1/5 rounded-lg" />
                    <Skeleton className="h-28 w-1/5 rounded-lg" />
                    <Skeleton className="h-28 w-1/5 rounded-lg" />
                </div>
            </div>
            <div>
                <Skeleton className="h-8 w-1/4 mb-4" />
                 <div className="flex space-x-4">
                    <Skeleton className="h-40 w-1/4 rounded-lg" />
                    <Skeleton className="h-40 w-1/4 rounded-lg" />
                    <Skeleton className="h-40 w-1/4 rounded-lg" />
                    <Skeleton className="h-40 w-1/4 rounded-lg" />
                </div>
            </div>
        </div>
      </main>
    );
  }

  if (!authUser) {
    return (
        <main className="container mx-auto px-4 md:px-6 pt-6 pb-16 flex flex-col items-center justify-center text-center h-[60vh]">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">My Library</h1>
            <p className="text-muted-foreground mb-6">You need to be signed in to see your personalized lists.</p>
            <Button asChild>
                <Link href="/login">Sign In</Link>
            </Button>
        </main>
    )
  }

  const hasContent = recentlyViewed.length > 0 || likedVideos.length > 0 || likedCategories.length > 0;

  return (
      <main className="container mx-auto px-4 md:px-6 pt-6 pb-16 space-y-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white">My Library</h1>

        {hasContent ? (
            <div className="space-y-12">
                {recentlyViewed.length > 0 && <VideoRow title="Recently Viewed" videos={recentlyViewed} poster />}
                {likedVideos.length > 0 && <VideoRow title="Liked Videos" videos={likedVideos} />}
                {likedCategories.length > 0 && <CategoryRow title="Liked Categories" categories={likedCategories} />}
            </div>
        ) : (
            <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">Your library is looking a little empty.</p>
                <p className="text-muted-foreground mt-2">Start exploring and like some videos or categories to see them here!</p>
                 <Button asChild variant="secondary" className="mt-6">
                    <Link href="/browse">Browse Categories</Link>
                </Button>
            </div>
        )}
      </main>
  );
}
