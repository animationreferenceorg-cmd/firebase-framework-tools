import type { Metadata } from 'next';
import { ResourceHub } from '@/components/ResourceHub';
import { getResourceHubVideos } from '@/lib/resource-hub';

export const metadata: Metadata = {
    title: 'Character Acting Animation Reference: Poses, Emotion & Performance',
    description: 'Study character acting references for gesture, facial performance, dialogue, emotion, weight shifts, and subtle body language.',
    keywords: 'character acting animation reference, acting reference for animators, emotion animation reference, gesture reference, facial acting',
    alternates: { canonical: 'https://animationreference.org/resources/character-acting-animation-reference' },
};

export const dynamic = 'force-dynamic';

export default async function CharacterActingResources() {
    const videos = await getResourceHubVideos(['character-acting', 'acting', 'emotion', 'performance', 'dialogue']);
    return <ResourceHub
        eyebrow="Performance study series"
        title="Character acting animation reference"
        accent="bg-pink-600/20"
        description="Build performances that read through the whole body. Study pose, gesture, facial change, eye direction, and the pauses between actions."
        studyTopics={[
            { title: 'Intent before motion', description: 'Look for the thought or decision that arrives before the body moves, then study how anticipation reveals it.' },
            { title: 'Gesture & silhouette', description: 'Compare the shape of the torso, hands, and head to see how a clear pose communicates emotion at a glance.' },
            { title: 'Subtle timing', description: 'Use pauses, eye darts, holds, and small weight shifts to study believable performance without overacting.' },
        ]}
        videos={videos}
        browseHref="/categories"
    />;
}
