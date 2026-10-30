import { Metadata, ResolvingMetadata } from 'next';
import { redirect } from 'next/navigation';
import { CategoriesHubClient } from '@/components/CategoriesHubClient';

export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ slug?: string[] }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = await params;

    if (!slug || slug.length === 0) {
        return {
            title: 'Browse Animation Categories',
            description: 'Explore curated animation reference categories: locomotion, combat, acting, and body mechanics with frame-by-frame study tools for artists.',
        };
    }

    const categorySlug = slug[0];
    return {
        title: `${categorySlug} References`,
        description: `Browse curated ${categorySlug} animation references with precision frame-by-frame controls for 2D, 3D, and game animators.`,
        alternates: {
            canonical: `https://animationreference.org/category/${categorySlug}`,
        },
    };
}

export default async function CategorySlugPage({ params }: Props) {
    const { slug } = await params;

    // Index (/categories) → the browse directory hub.
    if (!slug || slug.length === 0) {
        return <CategoriesHubClient />;
    }

    // A specific category now lives on its own dedicated page (/category/[slug]).
    // Redirect old /categories/[slug] URLs there so links and bookmarks keep working.
    redirect(`/category/${slug[0]}`);
}
