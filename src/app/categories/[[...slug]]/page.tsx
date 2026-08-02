
import { Metadata, ResolvingMetadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { getAllSnapshotVideos } from '@/lib/videoSnapshot.server';
import type { Category, Video } from '@/lib/types';
import { CategoriesHubClient } from '@/components/CategoriesHubClient';

const slugifyCategory = (text: string) =>
    text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/&/g, '-and-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');

async function getCategoriesHubData(): Promise<{ categories: Category[]; videos: Video[] }> {
    try {
        const catSnap = await getDocs(query(collection(db, 'categories'), where('status', '==', 'published'), limit(100)));
        const categories = catSnap.docs.map((d) => {
            const data = d.data();
            const s = data.slug || slugifyCategory(data.title || '');
            return { id: d.id, ...data, slug: s, href: `/category/${s}` } as Category;
        });
        const videos = getAllSnapshotVideos().filter((v) => !v.isShort);
        return { categories, videos };
    } catch (e) {
        console.error('Failed to load categories hub data:', e);
        return { categories: [], videos: [] };
    }
}

export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ slug?: string[] }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Helper to match client-side slugify
const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/&/g, '-and-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

async function getCategory(slugOrId: string): Promise<Category | null> {
    try {
        const categoriesRef = collection(db, 'categories');

        // 1. Try slug field match
        const qSlug = query(categoriesRef, where('slug', '==', slugOrId), limit(1));
        const snapshotSlug = await getDocs(qSlug);

        if (!snapshotSlug.empty) {
            const doc = snapshotSlug.docs[0];
            return { id: doc.id, ...doc.data() } as Category;
        }

        // 2. Try ID match (if 20 chars)
        if (slugOrId.length === 20) {
            // relying on scan fallback for now or we could add explicit ID check if robust needed
        }

        // 3. Fallback: Scan ALL published categories
        const qAll = query(categoriesRef, where('status', '==', 'published'));
        const snapshotAll = await getDocs(qAll);

        const found = snapshotAll.docs.find(doc => {
            const data = doc.data();
            const generatedSlug = slugify(data.title || '');
            return generatedSlug === slugOrId || doc.id === slugOrId;
        });

        if (found) {
            return { id: found.id, ...found.data() } as Category;
        }

    } catch (e) {
        console.error("Error lookup category:", e);
    }
    return null;
}


export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = await params;

    // If no slug, generic metadata
    if (!slug || slug.length === 0) {
        return {
            title: 'Browse Animation Categories - Animation Reference',
            description: 'Explore animation styles, techniques, and studios.',
        };
    }

    // We only care about the first segment for now
    const categorySlug = slug[0];
    const category = await getCategory(categorySlug);

    if (!category) {
        return {
            title: 'Category Not Found - Animation Reference',
        };
    }

    return {
        title: `${category.title} References - Animation Reference`,
        description: category.description || `Browse the best ${category.title} animation references.`,
        openGraph: {
            title: `${category.title} References`,
            description: category.description,
            url: `https://animationreference.org/categories/${categorySlug}`,
            images: [category.imageUrl || '/logo.png'],
        },
    };
}

export default async function CategorySlugPage({ params }: Props) {
    const { slug } = await params;

    // Index (/categories) → the browse directory hub.
    if (!slug || slug.length === 0) {
        const { categories, videos } = await getCategoriesHubData();
        const heroVideo = videos.length > 0 ? videos[Math.floor(Math.random() * videos.length)] : null;
        return <CategoriesHubClient initialCategories={categories} initialVideos={videos} heroVideo={heroVideo} />;
    }

    // A specific category now lives on its own dedicated page (/category/[slug]).
    // Redirect old /categories/[slug] URLs there so links and bookmarks keep working.
    redirect(`/category/${slug[0]}`);
}
