
import { Metadata, ResolvingMetadata } from 'next';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { Category } from '@/lib/types';
import BrowsePageClient from '../BrowsePageClient';

export const revalidate = 3600;

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

    // Default to 'All' if no slug
    if (!slug || slug.length === 0) {
        return <BrowsePageClient />;
    }

    const categorySlug = slug[0];
    const category = await getCategory(categorySlug);

    // If we found a category, render the BrowsePage with it selected
    if (category) {
        return <BrowsePageClient initialCategoryId={category.id} />;
    }

    // If slug provided but not found, return default (All) instead of 404, 
    // effectively "ignoring" the bad filter but keeping the page alive.
    // Or we could show 404. Let's return default BrowsePage so user stays in app.
    return <BrowsePageClient />;
}
