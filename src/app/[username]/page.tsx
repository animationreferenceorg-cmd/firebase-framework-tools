import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getUserProfileByUsernameOrId } from '@/lib/firestore';
import { getUserPortfolioItems } from '@/lib/portfolio-service';
import { UsernamePublicProfileClient } from '@/components/portfolio/UsernamePublicProfileClient';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  if (!username || username.includes('.') || username.startsWith('_') || username.startsWith('.')) {
    return { title: 'Page Not Found', robots: { index: false } };
  }
  const profile = await getUserProfileByUsernameOrId(username);
  if (!profile) {
    return { title: 'Page Not Found', robots: { index: false } };
  }
  const name = profile.displayName || profile.username || username;
  return {
    title: `${name} — Animation Portfolio`,
    description: profile.bio || `Explore the animation portfolio and shot breakdown of ${name}. Frame-by-frame reels and study reference.`,
  };
}

export default async function UsernamePublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  if (!username || username.includes('.') || username.startsWith('_') || username.startsWith('.')) {
    notFound();
  }

  const [profile, itemsByUsername] = await Promise.all([
    getUserProfileByUsernameOrId(username),
    getUserPortfolioItems(username),
  ]);

  let items = itemsByUsername || [];
  if (profile?.uid && profile.uid !== username) {
    const itemsByUid = await getUserPortfolioItems(profile.uid);
    const map = new Map<string, any>();
    [...items, ...itemsByUid].forEach((i) => i?.id && map.set(i.id, i));
    items = Array.from(map.values());
  }

  if (!profile && items.length === 0) {
    notFound();
  }

  return (
    <UsernamePublicProfileClient
      rawUsername={username}
      initialProfile={profile}
      initialItems={items}
    />
  );
}
