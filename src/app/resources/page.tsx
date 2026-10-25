import type { Metadata } from 'next';
import { ResourcesClient } from './ResourcesClient';

export const metadata: Metadata = {
  title: 'Animation Reference Study Guides & Motion Breakdown Vault',
  description: 'Master human walk cycles, real-world footage, character turnarounds, mecha kinematics, combat choreography, and the 12 principles of animation with scrubbable reference clips.',
  alternates: { canonical: 'https://animationreference.org/resources' },
  openGraph: {
    title: 'Animation Reference Study Guides & Motion Breakdown Vault',
    description: 'Master human walk cycles, real-world footage, character turnarounds, mecha kinematics, and combat choreography.',
    url: 'https://animationreference.org/resources',
    siteName: 'Animation Reference',
    type: 'website',
  },
};

export default function ResourcesIndexPage() {
  return <ResourcesClient />;
}
