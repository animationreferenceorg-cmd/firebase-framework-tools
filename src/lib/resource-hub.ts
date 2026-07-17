import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video } from '@/lib/types';

export async function getResourceHubVideos(tags: string[], max = 12): Promise<Video[]> {
    const snapshots = await Promise.all(tags.map((tag) => getDocs(query(
        collection(db, 'videos'),
        where('tags', 'array-contains', tag),
        limit(max),
    ))));

    const videos = new Map<string, Video>();
    snapshots.flatMap((snapshot) => snapshot.docs).forEach((doc) => {
        const data = doc.data();
        if (data.status !== 'draft') videos.set(doc.id, { id: doc.id, ...data } as Video);
    });

    return Array.from(videos.values()).slice(0, max);
}
