import type { Metadata } from 'next';
import { getUserProfileByUsernameOrId } from '@/lib/firestore';
import { getUserPortfolioItems } from '@/lib/portfolio-service';

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  try {
    const profile = await getUserProfileByUsernameOrId(username);
    if (!profile) {
      return { title: 'Profile Not Found', robots: { index: false, follow: false } };
    }

    const items = await getUserPortfolioItems(profile.uid || username).catch(() => []);
    const displayName = profile.username || profile.displayName || username;

    // Thin/empty portfolios add no unique value to index -- avoid the
    // thin-user-generated-content pattern search engines penalize at scale.
    if (items.length === 0) {
      return {
        title: `${displayName} on Animation Reference`,
        robots: { index: false, follow: true },
      };
    }

    return {
      title: `${displayName} — Animation Portfolio`,
      description: profile.headline || profile.bio || `${displayName}'s animation portfolio on Animation Reference.`,
      alternates: { canonical: `https://animationreference.org/${username}` },
    };
  } catch {
    return { title: 'Animation Reference' };
  }
}

export default function UsernameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
