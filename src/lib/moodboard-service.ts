import { db, storage } from './firebase';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, getDocs, QueryDocumentSnapshot, DocumentData, runTransaction } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { MoodboardItem, Moodboard, Video } from './types';

export class MoodboardService {

    // Upload image to Firebase Storage
    static async uploadImage(userId: string, blob: Blob, onProgress?: (percent: number) => void): Promise<string> {
        const filename = `moodboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const storageRef = ref(storage, `users/${userId}/moodboard_uploads/${filename}`);

        const task = uploadBytesResumable(storageRef, blob);
        await new Promise<void>((resolve, reject) => {
            task.on('state_changed', snapshot => {
                onProgress?.(snapshot.totalBytes ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0);
            }, reject, () => resolve());
        });
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    }

    // Create a new moodboard
    static async createMoodboard(userId: string, name: string = 'Untitled Moodboard'): Promise<string> {
        const id = `mb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const docRef = doc(db, 'users', userId, 'moodboards', id);

        await setDoc(docRef, {
            id,
            userId,
            name,
            items: [],
            itemCount: 0,
            isPrivate: true,
            thumbnailUrl: '', // Initialize empty
            updatedAt: new Date(),
            createdAt: new Date()
        });
        return id;
    }

    // Get all moodboards for a user (minimal data for list)
    static async getMoodboards(userId: string): Promise<Moodboard[]> {
        const colRef = collection(db, 'users', userId, 'moodboards');
        const snap = await getDocs(colRef);

        return snap.docs.map((d: QueryDocumentSnapshot<DocumentData, DocumentData>) => ({ id: d.id, ...d.data() } as Moodboard));
    }

    // Save specific moodboard state (uses setDoc with merge to ensure resilience)
    static async saveMoodboard(userId: string, moodboardId: string, items: MoodboardItem[], thumbnailUrl?: string) {
        const docRef = doc(db, 'users', userId, 'moodboards', moodboardId);

        // Deep sanitize to ensure no undefined values exist anywhere
        const cleanItems = JSON.parse(JSON.stringify(items));

        const updateData: Record<string, unknown> = {
            items: cleanItems,
            itemCount: cleanItems.length,
            updatedAt: new Date()
        };

        if (thumbnailUrl) {
            updateData.thumbnailUrl = thumbnailUrl;
        }

        await setDoc(docRef, updateData, { merge: true });
    }

    // Load specific moodboard
    static async loadMoodboard(userId: string, moodboardId: string): Promise<MoodboardItem[] | null> {
        const docRef = doc(db, 'users', userId, 'moodboards', moodboardId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            const data = snap.data();
            return (data.items || []) as MoodboardItem[];
        }
        return null;
    }

    // Update moodboard metadata (e.g. name)
    static async updateMoodboardName(userId: string, moodboardId: string, name: string) {
        const docRef = doc(db, 'users', userId, 'moodboards', moodboardId);
        await setDoc(docRef, { name, updatedAt: new Date() }, { merge: true });
    }

    static async updateMoodboardCover(userId: string, moodboardId: string, thumbnailUrl: string) {
        const docRef = doc(db, 'users', userId, 'moodboards', moodboardId);
        await setDoc(docRef, { thumbnailUrl, updatedAt: new Date() }, { merge: true });
    }

    static async removeReferencesFromMoodboard(userId: string, moodboardId: string, referenceIds: string[]) {
        const docRef = doc(db, 'users', userId, 'moodboards', moodboardId);
        return runTransaction(db, async transaction => {
            const snapshot = await transaction.get(docRef);
            if (!snapshot.exists()) return [] as MoodboardItem[];
            const items = (snapshot.data().items || []) as MoodboardItem[];
            const nextItems = items.filter(item => !referenceIds.includes(item.videoId || item.videoData?.id || item.id));
            transaction.set(docRef, { items: nextItems, itemCount: nextItems.length, updatedAt: new Date() }, { merge: true });
            return nextItems;
        });
    }

    static async saveUploadedReference(userId: string, video: Video) {
        const refId = video.id;
        await setDoc(doc(db, 'users', userId, 'moodboard_references', refId), {
            ...JSON.parse(JSON.stringify(video)),
            id: refId,
            createdAt: new Date(),
        }, { merge: true });
    }

    static async getUploadedReferences(userId: string): Promise<Video[]> {
        const snapshot = await getDocs(collection(db, 'users', userId, 'moodboard_references'));
        return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Video));
    }

    static async deleteUploadedReferences(userId: string, referenceIds: string[]) {
        await Promise.all(referenceIds.map(referenceId => deleteDoc(doc(db, 'users', userId, 'moodboard_references', referenceId))));
    }

    // File a saved reference into an inspiration and place it on that folder's canvas.
    static async addReferenceToMoodboard(userId: string, moodboardId: string, video: Video): Promise<MoodboardItem | null> {
        const docRef = doc(db, 'users', userId, 'moodboards', moodboardId);
        return runTransaction(db, async transaction => {
            const snapshot = await transaction.get(docRef);
            let items: MoodboardItem[] = [];
            let boardData: Record<string, any> = {};

            if (snapshot.exists()) {
                boardData = snapshot.data();
                items = (boardData.items || []) as MoodboardItem[];
            }

            const alreadySaved = items.some(item => item.videoId === video.id || item.videoData?.id === video.id);
            if (alreadySaved) return null;

            const mediaCount = items.filter(item => item.type === 'video' || item.type === 'image').length;
            const v = video as any;
            const thumb = video.thumbnailUrl || video.posterUrl || '';

            const normalizedVideo: Record<string, any> = {
                id: video.id,
                title: video.title || 'Untitled Reference',
                videoUrl: video.videoUrl || '',
                thumbnailUrl: thumb,
                posterUrl: video.posterUrl || thumb,
                categories: video.categories || (v.category ? [v.category] : ['Reference']),
                category: v.category || video.categories?.[0] || 'Reference',
                tags: video.tags || [],
                description: video.description || '',
                sourceUrl: v.sourceUrl || '',
                sourceAuthorName: v.sourceAuthorName || '',
            };

            const item: MoodboardItem = {
                id: `reference-${video.id}-${Date.now()}`,
                type: 'video',
                videoId: video.id,
                videoData: JSON.parse(JSON.stringify(normalizedVideo)),
                imageUrl: thumb,
                x: 120 + (mediaCount % 4) * 300,
                y: 120 + Math.floor(mediaCount / 4) * 200,
                width: 280,
                height: 160,
                zIndex: items.length + 1,
            };

            const nextItems = [...items, item];
            const updates: Record<string, unknown> = {
                items: JSON.parse(JSON.stringify(nextItems)),
                itemCount: nextItems.length,
                updatedAt: new Date(),
            };
            if (thumb && !boardData.thumbnailUrl) {
                updates.thumbnailUrl = thumb;
            }

            transaction.set(docRef, updates, { merge: true });
            return item;
        });
    }

    // Delete moodboard
    static async deleteMoodboard(userId: string, moodboardId: string) {
        const docRef = doc(db, 'users', userId, 'moodboards', moodboardId);
        await deleteDoc(docRef);
    }
}
