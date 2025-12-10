
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Category, Video } from '@/lib/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoRow } from '@/components/VideoRow';

function VideoRowSkeleton() {
    return (
        <div>
            <Skeleton className="h-8 w-1/4 mb-4" />
            <div className="flex space-x-4">
                {Array.from({ length: 5 }).map((_, i) => (
                     <div key={i} className="w-1/5 flex-shrink-0">
                        <Skeleton className="w-full aspect-video rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function BrowsePage() {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            const categoriesQuery = query(collection(db, "categories"), where("status", "==", "published"));
            const videosQuery = query(collection(db, "videos"), where("isShort", "!=", true));

            const [categorySnapshot, videoSnapshot] = await Promise.all([
                getDocs(categoriesQuery),
                getDocs(videosQuery)
            ]);

            const categories = categorySnapshot.docs.map(doc => ({
                id: doc.id,
                href: `/browse/${doc.id}`,
                ...doc.data()
            } as Category));
            setAllCategories(categories);

            const videos = videoSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Video));
            setAllVideos(videos);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, []);

  const videosByCategory = useMemo(() => {
    const map = new Map<string, Video[]>();
    allVideos.forEach(video => {
        video.categoryIds?.forEach(catId => {
            if (!map.has(catId)) {
                map.set(catId, []);
            }
            map.get(catId)?.push(video);
        })
    });
    return map;
  }, [allVideos]);

  const sortedCategories = useMemo(() => {
    return [...allCategories].sort((a, b) => {
        const aCount = videosByCategory.get(a.id)?.length || 0;
        const bCount = videosByCategory.get(b.id)?.length || 0;
        return bCount - aCount;
    });
  }, [allCategories, videosByCategory]);


  return (
    <main className="container mx-auto px-4 md:px-6 pt-6 pb-16 space-y-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Browse All</h1>
        <div className="space-y-12">
            {loading ? (
                <>
                  <VideoRowSkeleton />
                  <VideoRowSkeleton />
                  <VideoRowSkeleton />
                </>
            ) : (
                sortedCategories.map((category) => {
                    const videos = videosByCategory.get(category.id) || [];
                    if (videos.length === 0) return null;
                    return (
                        <VideoRow 
                            key={category.id} 
                            title={category.title} 
                            videos={videos}
                            href={`/browse/${category.id}`}
                            category={category}
                        />
                    )
                })
            )}
        </div>
    </main>
  );
}
