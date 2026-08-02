import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Moodboards',
  robots: { index: false, follow: false },
};

export default function MoodboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
