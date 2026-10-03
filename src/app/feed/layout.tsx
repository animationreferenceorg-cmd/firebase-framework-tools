import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community | Animation Reference',
  description: 'Explore community portfolio submissions, work-in-progress passes, and reels from animators worldwide.',
};

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
