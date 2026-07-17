import type { Metadata } from 'next';
import { ResourceHub } from '@/components/ResourceHub';
import { getResourceHubVideos } from '@/lib/resource-hub';

export const metadata: Metadata = {
    title: 'Combat Animation Reference: Attacks, Hits & Reactions',
    description: 'Study curated combat animation references for anticipation, contact poses, impact, hit reactions, blocks, and follow-through.',
    keywords: 'combat animation reference, fighting animation reference, attack animation, hit reaction reference, impact frames',
    alternates: { canonical: 'https://animationreference.org/resources/combat-animation-reference' },
};

export default async function CombatResources() {
    const videos = await getResourceHubVideos(['combat', 'fight-scene', 'impact', 'attack', 'hit-reaction']);
    return <ResourceHub
        eyebrow="Combat study series"
        title="Combat animation reference"
        accent="bg-red-600/20"
        description="Study the mechanics that make a strike feel readable, heavy, and intentional—from anticipation and contact to impact, recovery, and reaction."
        studyTopics={[
            { title: 'Anticipation', description: 'Track the wind-up, line of action, and timing choices that make the attack legible before contact.' },
            { title: 'Impact & recoil', description: 'Compare contact poses, hitstop, spacing, and body compression to understand where force is communicated.' },
            { title: 'Recovery', description: 'Study follow-through, balance, and the return to a guard or new action after the hit.' },
        ]}
        videos={videos}
        browseHref="/categories"
    />;
}
