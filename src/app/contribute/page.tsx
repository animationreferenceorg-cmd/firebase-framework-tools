import type { Metadata } from 'next';
import { ContributeClient } from '@/components/community/ContributeClient';
import { getActiveChallenge } from '@/lib/challenges';

export const metadata: Metadata = {
  title: 'Contribute to the Community',
  description: 'Share original animation reference, a reel, or a short film. Get discovered by animators and help build a better reference library.',
  alternates: { canonical: 'https://animationreference.org/contribute' },
  openGraph: {
    title: 'Share your animation work | Animation Reference',
    description: 'Submit original references, portfolio work, and animated short films to the Animation Reference community.',
    images: [{ url: '/icon.png', width: 1024, height: 1024, alt: 'Animation Reference' }],
  },
};

export default function ContributePage() {
  return <ContributeClient challenge={getActiveChallenge()} />;
}
