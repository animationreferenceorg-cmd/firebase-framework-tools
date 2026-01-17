
import { MetadataRoute } from 'next';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const BASE_URL = 'https://animationreference.org';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // 1. Static Routes
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${BASE_URL}/home`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/categories`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/shorts`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/terms`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.3,
        },
    ];

    try {
        // 2. Dynamic Categories
        const categoriesQuery = query(
            collection(db, 'categories'),
            where('status', '==', 'published')
        );
        const categorySnapshot = await getDocs(categoriesQuery);
        const categoryRoutes: MetadataRoute.Sitemap = categorySnapshot.docs.map((doc) => ({
            url: `${BASE_URL}/categories?category=${doc.id}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
        }));

        // 3. Dynamic Videos (Latest 200 to keep sitemap manageable)
        const videosQuery = query(
            collection(db, 'videos'),
            where('status', '==', 'published'),
            limit(200)
        );
        const videoSnapshot = await getDocs(videosQuery);
        const videoRoutes: MetadataRoute.Sitemap = videoSnapshot.docs.map((doc) => {
            const data = doc.data();
            const path = data.isShort ? 'shorts' : 'video';
            return {
                url: `${BASE_URL}/${path}/${doc.id}`,
                lastModified: new Date(),
                changeFrequency: 'monthly',
                priority: 0.6,
            };
        });

        return [...staticRoutes, ...categoryRoutes, ...videoRoutes];
    } catch (error) {
        console.error('Error generating sitemap:', error);
        // Return at least static routes if Firestore fails
        return staticRoutes;
    }
}
