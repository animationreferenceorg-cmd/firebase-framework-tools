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
            title: 'Browse Animation Categories - Animation Reference',
            description: 'Explore animation styles, techniques, and studios.',
        };
    }

    const categorySlug = slug[0];
    return {
        title: `${categorySlug} References - Animation Reference`,
        description: `Browse the best animation references.`,
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
