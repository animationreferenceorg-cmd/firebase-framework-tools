import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAllSnapshotVideos } from '@/lib/videoSnapshot.server';
import type { Category, Video } from '@/lib/types';
import { LandingPageClient } from '@/components/LandingPageClient';

export const dynamic = 'force-dynamic';

async function getLandingData(): Promise<{ categories: Category[]; videos: Video[] }> {
    try {
        const categoriesQuery = query(collection(db, 'categories'), where('status', '==', 'published'));

        const categorySnapshot = await getDocs(categoriesQuery).catch((err) => {
            console.warn('Firestore categories query fallback:', err?.message || err);
            return { docs: [] };
        });
        const videos = getAllSnapshotVideos();

        const categories = (categorySnapshot.docs || []).map((doc) => ({
            id: doc.id,
            href: `/browse?category=${doc.id}`,
            ...doc.data(),
        } as Category));

        return { categories, videos };
    } catch (error) {
        console.warn('Error fetching landing data:', error);
        return { categories: [], videos: [] };
    }
}

export default async function LandingPage() {
    const { categories, videos } = await getLandingData();

    const heroVideo = videos.length > 0 ? videos[Math.floor(Math.random() * videos.length)] : null;
    const exampleVideos = [...videos].sort(() => 0.5 - Math.random()).slice(0, 9);

    return (
        <LandingPageClient
            initialCategories={categories}
            initialVideos={videos}
            heroVideo={heroVideo}
            exampleVideos={exampleVideos}
        />
    );
}
