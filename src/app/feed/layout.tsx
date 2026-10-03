import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community',
  description: 'Explore community-submitted animation references, WIP blocking passes, and reels from animators worldwide.',
};

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
