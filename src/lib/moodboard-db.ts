import { LocalImage } from './types';

const DB_NAME = 'AnimationMoodboardDB';
const STORE_NAME = 'local_images';
const DB_VERSION = 1;

export class MoodboardDB {
    private static db: IDBDatabase | null = null;

    private static async getDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined') {
                reject(new Error('IndexedDB is not supported on the server'));
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                reject((event.target as IDBOpenDBRequest).error);
            };
        });
    }

    static async saveImage(blob: Blob): Promise<LocalImage> {
        const db = await this.getDB();
        const id = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const localImage: LocalImage = {
            id,
            blob,
            createdAt: Date.now()
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(localImage);

            request.onsuccess = () => {
                resolve({
                    ...localImage,
                    url: URL.createObjectURL(blob)
                });
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    static async getAllImages(): Promise<LocalImage[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const images = request.result as LocalImage[];
                // Revive object URLs
                const revived = images.map(img => ({
                    ...img,
                    url: URL.createObjectURL(img.blob)
                }));
                resolve(revived);
            };

            request.onerror = () => reject(request.error);
        });
    }

    static async deleteImage(id: string): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}
