
import { MetadataRoute } from 'next';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const BASE_URL = 'https://animationreference.org';

// Generate the sitemap when requested instead of blocking deployments on a full
// Firestore library read during the build.
export const dynamic = 'force-dynamic';

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
        // Premium Resource Guides
        {
            url: `${BASE_URL}/resources/best-animation-reference-websites`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/resources/how-to-analyze-animation-reference`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/resources/combat-animation-reference`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/resources/personal-animation-vault`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/resources/12-principles-of-animation-reference`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/resources/locomotion-animation-reference`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/resources/character-acting-animation-reference`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/resources/fx-animation-reference`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/resources/foundations-of-life`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.9,
        },
    ];

    try {
        // 2. Dynamic Categories (SEO Landing Pages)
        const categoriesQuery = query(
            collection(db, 'categories'),
            where('status', '==', 'published')
        );
        const categorySnapshot = await getDocs(categoriesQuery);
        const categoryRoutes: MetadataRoute.Sitemap = categorySnapshot.docs.map((doc) => {
            const data = doc.data();
            const slug = data.slug || (data.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return {
                url: `${BASE_URL}/category/${slug}`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.8,
            };
        });

        // 3. Blog Posts
        const blogQuery = query(
            collection(db, 'blogPosts'),
            where('status', '==', 'published')
        );
        const blogSnapshot = await getDocs(blogQuery);
        const blogRoutes: MetadataRoute.Sitemap = blogSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                url: `${BASE_URL}/blog/${data.slug}`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.7,
            };
        });

        // 4. Dynamic Videos (include the full published library)
        const videoSnapshot = await getDocs(collection(db, 'videos'));
        const videoRoutes: MetadataRoute.Sitemap = videoSnapshot.docs
            .filter((doc) => doc.data().status !== 'draft')
            .map((doc) => {
            const data = doc.data();
            const path = data.isShort ? 'shorts' : 'video';
            const timestamp = data.updatedAt || data.createdAt;
            const lastModified = timestamp?.toDate
                ? timestamp.toDate()
                : timestamp?.seconds
                    ? new Date(timestamp.seconds * 1000)
                    : undefined;
            return {
                url: `${BASE_URL}/${path}/${doc.id}`,
                ...(lastModified ? { lastModified } : {}),
                changeFrequency: 'monthly',
                priority: 0.6,
            };
            });

        return [...staticRoutes, ...categoryRoutes, ...blogRoutes, ...videoRoutes];
    } catch (error) {
        console.error('Error generating sitemap:', error);
        // Return at least static routes if Firestore fails
        return staticRoutes;
    }
}
