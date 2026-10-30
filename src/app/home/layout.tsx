import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Animation Reference Home & Library',
  description: 'Browse curated animation reference videos for body mechanics, combat, and acting. Free frame-by-frame study tool for 2D and 3D animators.',
  alternates: {
    canonical: '/home',
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
