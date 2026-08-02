import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My List',
  robots: { index: false, follow: false },
};

export default function ListLayout({ children }: { children: React.ReactNode }) {
  return children;
}
