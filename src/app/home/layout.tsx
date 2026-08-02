import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Animation References | Animation Reference',
  description: 'Browse thousands of curated animation reference clips by category, tag, and type. Study body mechanics, combat, acting, locomotion and more, then build your animator portfolio.',
  alternates: {
    canonical: '/home',
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
