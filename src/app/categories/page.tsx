import { Metadata, ResolvingMetadata } from 'next';
import { Suspense } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import BrowsePageClient from './BrowsePageClient';
import type { Category } from '@/lib/types';

// Force dynamic rendering to fix build failure on static export
export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getCategory(id: string): Promise<Category | null> {
    try {
        const docRef = doc(db, "categories", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Category;
        }
    } catch (error) {
        console.error("Error fetching category for metadata:", error);
    }
    return null;
}

export async function generateMetadata(
    { searchParams }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const categoryId = (await searchParams).category as string;

    if (!categoryId) {
        return {
            title: 'Browse Animation Categories - Animation Reference',
            description: 'Explore curated animation references by category.',
        };
    }

    const category = await getCategory(categoryId);

    if (!category) {
        return {
            title: 'Category Not Found - Animation Reference',
        };
    }

    const previousImages = (await parent).openGraph?.images || [];

    return {
        title: `${category.title} Animation References - Animation Reference`,
        description: category.description || `Browse the best ${category.title} animation references.`,
        openGraph: {
            title: `${category.title} References`,
            description: category.description,
            url: `https://animationreference.org/categories?category=${categoryId}`,
            siteName: 'Animation Reference',
            images: [
                {
                    url: category.imageUrl || '/logo.png',
                    width: 1200,
                    height: 630,
                    alt: category.title,
                },
                ...previousImages,
            ],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${category.title} Animation References`,
            description: category.description,
            images: [category.imageUrl || '/logo.png'],
        },
    };
}

export default function BrowsePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#030014] p-8 space-y-8 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
            </div>
        }>
            <BrowsePageClient />
        </Suspense>
    );
}
