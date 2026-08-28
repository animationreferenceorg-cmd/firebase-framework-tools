import { db, storage } from './firebase';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, getDocs, QueryDocumentSnapshot, DocumentData, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MoodboardItem, Moodboard, Video } from './types';

export class MoodboardService {

    // Upload image to Firebase Storage
    static async uploadImage(userId: string, blob: Blob): Promise<string> {
        const filename = `moodboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const storageRef = ref(storage, `users/${userId}/moodboard_uploads/${filename}`);

        await uploadBytes(storageRef, blob);
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

    // Save specific moodboard state
    static async saveMoodboard(userId: string, moodboardId: string, items: MoodboardItem[], thumbnailUrl?: string) {
        const docRef = doc(db, 'users', userId, 'moodboards', moodboardId);

        // Deep sanitize to ensure no undefined values exist anywhere
        const cleanItems = JSON.parse(JSON.stringify(items));

        const updateData: any = {
            items: cleanItems,
            itemCount: cleanItems.length,
            updatedAt: new Date()
        };

        if (thumbnailUrl) {
            updateData.thumbnailUrl = thumbnailUrl;
        }

        await updateDoc(docRef, updateData);
    }

    // Load specific moodboard
    static async loadMoodboard(userId: string, moodboardId: string): Promise<MoodboardItem[] | null> {
        const docRef = doc(db, 'users', userId, 'moodboards', moodboardId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            const data = snap.data();
            return data.items as MoodboardItem[];
        }
        return null;
    }

    // Update moodboard metadata (e.g. name)
    static async updateMoodboardName(userId: string, moodboardId: string, name: string) {
        const docRef = doc(db, 'users', userId, 'moodboards', moodboardId);
        await updateDoc(docRef, { name, updatedAt: new Date() });
    }

    // File a saved reference into an inspiration and place it on that folder's canvas.
    static async addReferenceToMoodboard(userId: string, moodboardId: string, video: Video): Promise<MoodboardItem | null> {
        const docRef = doc(db, 'users', userId, 'moodboards', moodboardId);
        return runTransaction(db, async transaction => {
            const snapshot = await transaction.get(docRef);
            if (!snapshot.exists()) throw new Error('Moodboard not found');

            const items = (snapshot.data().items || []) as MoodboardItem[];
            const alreadySaved = items.some(item => item.videoId === video.id || item.videoData?.id === video.id);
            if (alreadySaved) return null;

            const mediaCount = items.filter(item => item.type === 'video' || item.type === 'image').length;
            const item: MoodboardItem = {
                id: `reference-${video.id}-${Date.now()}`,
                type: 'video',
                videoId: video.id,
                videoData: JSON.parse(JSON.stringify(video)),
                x: 120 + (mediaCount % 4) * 280,
                y: 120 + Math.floor(mediaCount / 4) * 190,
                width: 256,
                height: 144,
                zIndex: items.length + 1,
            };

            const nextItems = [...items, item];
            transaction.update(docRef, {
                items: nextItems,
                itemCount: nextItems.length,
                updatedAt: new Date(),
            });
            return item;
        });
    }

    // Delete moodboard
    static async deleteMoodboard(userId: string, moodboardId: string) {
        const docRef = doc(db, 'users', userId, 'moodboards', moodboardId);
        await deleteDoc(docRef);
    }
}
