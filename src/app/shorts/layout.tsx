import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Short Animated Films | Animation Reference',
  description: 'Watch award-winning short animated films and student shorts, with detailed breakdowns of the animation, acting, and craft behind each one.',
  alternates: {
    canonical: '/shorts',
  },
};

export default function ShortsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
