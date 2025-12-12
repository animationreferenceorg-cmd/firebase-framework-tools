'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Category, Video } from '@/lib/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoRow } from '@/components/VideoRow';
import { BrowseHero } from '@/components/BrowseHero';

function VideoRowSkeleton() {
    return (
        <div className="space-y-2">
            <Skeleton className="h-8 w-48 mb-4 rounded-md bg-zinc-800" />
            <div className="flex space-x-4 overflow-hidden">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="w-[18vw] flex-shrink-0">
                        <Skeleton className="w-full aspect-video rounded-lg bg-zinc-800" />
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

    const featuredVideo = useMemo(() => {
        if (allVideos.length === 0) return null;
        // Select a random video to feature (consistent per session if we wanted, but random on mount is fine)
        const randomIndex = Math.floor(Math.random() * allVideos.length);
        return allVideos[randomIndex];
    }, [allVideos]);


    return (
        <div className="min-h-screen bg-transparent pb-16">

            {/* Hero Section */}
            {loading ? (
                <div className="relative h-[80vh] w-full bg-zinc-900/50 animate-pulse">
                    <div className="absolute bottom-1/3 left-12 space-y-4">
                        <Skeleton className="h-16 w-[400px] bg-zinc-800" />
                        <Skeleton className="h-4 w-[600px] bg-zinc-800" />
                        <Skeleton className="h-4 w-[500px] bg-zinc-800" />
                        <div className="flex gap-4 pt-4">
                            <Skeleton className="h-14 w-32 bg-zinc-800 rounded-lg" />
                            <Skeleton className="h-14 w-32 bg-zinc-800 rounded-lg" />
                        </div>
                    </div>
                </div>
            ) : featuredVideo ? (
                <BrowseHero video={featuredVideo} />
            ) : null}

            {/* Content Rows */}
            <main className="relative z-20 -mt-32 space-y-8 md:space-y-12 pl-4 md:pl-12 overflow-hidden">
                {loading ? (
                    <div className="space-y-12 mt-12">
                        <VideoRowSkeleton />
                        <VideoRowSkeleton />
                        <VideoRowSkeleton />
                    </div>
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
            </main>
        </div>
    );
}
