import { db, storage } from './firebase';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MoodboardItem, Moodboard } from './types';

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

    // Delete moodboard
    static async deleteMoodboard(userId: string, moodboardId: string) {
        const docRef = doc(db, 'users', userId, 'moodboards', moodboardId);
        await deleteDoc(docRef);
    }
}
