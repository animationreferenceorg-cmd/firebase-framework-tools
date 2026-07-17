import type { Metadata } from 'next';
import { ResourceHub } from '@/components/ResourceHub';
import { getResourceHubVideos } from '@/lib/resource-hub';

export const metadata: Metadata = {
    title: 'FX Animation Reference: Fire, Smoke, Water & Debris',
    description: 'Study animation references for fire, smoke, water, explosions, debris, magical effects, timing, shapes, and secondary motion.',
    keywords: 'FX animation reference, effects animation reference, fire animation, smoke animation, water animation, explosion reference, debris animation',
    alternates: { canonical: 'https://animationreference.org/resources/fx-animation-reference' },
};

export default async function FxResources() {
    const videos = await getResourceHubVideos(['fx-animation', 'fire', 'smoke', 'water', 'explosion', 'debris']);
    return <ResourceHub
        eyebrow="Effects study series"
        title="FX animation reference"
        accent="bg-orange-600/20"
        description="Study how effects sell force, temperature, material, and timing through shape changes, rhythm, dissipation, and secondary motion."
        studyTopics={[
            { title: 'Shape & rhythm', description: 'Track how an effect grows, breaks, overlaps, and changes silhouette instead of treating it as a static shape.' },
            { title: 'Material behavior', description: 'Compare the movement of fire, smoke, water, debris, and magic to understand what makes each material feel distinct.' },
            { title: 'Force & dissipation', description: 'Study the initial burst, traveling energy, drag, and final settle so the effect has a readable beginning and end.' },
        ]}
        videos={videos}
        browseHref="/categories"
    />;
}
