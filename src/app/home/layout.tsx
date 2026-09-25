import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Animation Reference Videos | Frame-by-Frame Study Library',
  description: 'Browse animation reference videos for body mechanics, combat, acting, locomotion, timing, and effects. Study movement frame by frame with a free reference library for animators.',
  alternates: {
    canonical: '/home',
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
