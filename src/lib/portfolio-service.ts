import { 
  collection, 
  doc, 
  getCountFromServer,
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  limit, 
  serverTimestamp, 
  runTransaction
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "./firebase";
import type { PortfolioItem, UserProfile, WipStage } from "./types";

const PORTFOLIO_COLLECTION = "portfolio_items";
const USERS_COLLECTION = "users";

/**
 * Uploads a file (video, image, thumbnail) to Firebase Storage under portfolio/{userId}/{folder}/.
 * Portfolio media must be remotely available so other community members can see it.
 */
export async function uploadPortfolioMedia(
  userId: string, 
  file: File, 
  folder: 'media' | 'thumbnails'
): Promise<string> {
  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const storagePath = `portfolio/${userId}/${folder}/${timestamp}_${cleanName}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, { contentType: file.type || undefined });
  return getDownloadURL(storageRef);
}

/**
 * Auto-generates a cover thumbnail for uploaded media (video, image, or video URL).
 */
export async function generateAutoThumbnail(
  fileOrUrl: File | string
): Promise<File | string | null> {
  if (typeof window === 'undefined') return null;

  if (typeof fileOrUrl === 'string') {
    const url = fileOrUrl.trim();
    // YouTube auto thumbnail
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
    // Vimeo auto thumbnail
    const vimeoMatch = url.match(/(?:vimeo\.com\/(?:video\/|channels\/\w+\/)?|player\.vimeo\.com\/video\/)(\d+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
    }
    // Direct image URL
    if (/\.(png|jpg|jpeg|webp|gif)($|\?)/i.test(url)) {
      return url;
    }
    return null;
  }

  const file = fileOrUrl;
  if (file.type.startsWith('image/')) {
    return file;
  }

  if (file.type.startsWith('video/')) {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        const objectUrl = URL.createObjectURL(file);
        video.src = objectUrl;

        const cleanup = () => {
          URL.revokeObjectURL(objectUrl);
          video.remove();
        };

        const timeout = setTimeout(() => {
          cleanup();
          resolve(null);
        }, 5000);

        video.onloadeddata = () => {
          video.currentTime = Math.min(0.5, (video.duration || 1) * 0.1);
        };

        video.onseeked = () => {
          clearTimeout(timeout);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 360;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              canvas.toBlob((blob) => {
                cleanup();
                if (blob) {
                  const thumbFile = new File([blob], `thumb_${file.name.replace(/\.[^/.]+$/, "")}.jpg`, {
                    type: 'image/jpeg'
                  });
                  resolve(thumbFile);
                } else {
                  resolve(null);
                }
              }, 'image/jpeg', 0.85);
              return;
            }
          } catch (e) {
            console.warn("Video thumbnail canvas extraction failed:", e);
          }
          cleanup();
          resolve(null);
        };

        video.onerror = () => {
          clearTimeout(timeout);
          cleanup();
          resolve(null);
        };
      } catch (err) {
        resolve(null);
      }
    });
  }

  return null;
}

/**
 * IndexedDB helper for storing large base64 media items without 5MB localStorage QuotaExceededError.
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error("IndexedDB not available"));
    }
    const request = indexedDB.open("AnimationReferenceDB", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("portfolio_items")) {
        db.createObjectStore("portfolio_items", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function saveLocalItemIndexedDB(item: PortfolioItem): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      const idb = await openIndexedDB();
      const tx = idb.transaction("portfolio_items", "readwrite");
      const store = tx.objectStore("portfolio_items");
      store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = (err) => {
        console.warn("[IndexedDB] Transaction error:", err);
        resolve();
      };
    } catch (e) {
      console.warn("[IndexedDB] Could not save item:", e);
      resolve();
    }
  });
}

export function deleteLocalItemIndexedDB(itemId: string): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      const idb = await openIndexedDB();
      const tx = idb.transaction("portfolio_items", "readwrite");
      const store = tx.objectStore("portfolio_items");
      store.delete(itemId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadLocalItemsIndexedDB(userId?: string): Promise<PortfolioItem[]> {
  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction("portfolio_items", "readonly");
    const store = tx.objectStore("portfolio_items");
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results: PortfolioItem[] = request.result || [];
        resolve(userId ? results.filter((item) => item.userId === userId) : results);
      };
      request.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

function safeSaveLocalStorage(key: string, items: PortfolioItem[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e: any) {
    console.warn("[localStorage] QuotaExceededError - full quality media is securely saved in IndexedDB.");
  }
}

function withPortfolioDefaults(item: PortfolioItem): PortfolioItem {
  const likedBy = Array.isArray(item.likedBy)
    ? Array.from(new Set(item.likedBy.filter((id): id is string => typeof id === 'string')))
    : [];

  return {
    ...item,
    tags: Array.isArray(item.tags) ? item.tags : [],
    software: Array.isArray(item.software) ? item.software : [],
    likedBy,
    likesCount: Math.max(likedBy.length, Number(item.likesCount) || 0),
    viewsCount: Math.max(0, Number(item.viewsCount) || 0),
    commentsCount: Math.max(0, Number(item.commentsCount) || 0),
    sharesCount: Math.max(0, Number(item.sharesCount) || 0),
  };
}

function portfolioCreatedAtSeconds(item: PortfolioItem): number {
  if (typeof item.createdAt === 'number') return item.createdAt;
  if (item.createdAt && typeof item.createdAt.seconds === 'number') return item.createdAt.seconds;
  if (item.createdAt && typeof item.createdAt.toMillis === 'function') {
    return Math.floor(item.createdAt.toMillis() / 1000);
  }
  return 0;
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  ) as T;
}

async function persistItemLocally(item: PortfolioItem): Promise<void> {
  if (typeof window === 'undefined') return;

  await saveLocalItemIndexedDB(item);
  const storageKey = `local_portfolio_items_${item.userId}`;
  try {
    const existingStr = localStorage.getItem(storageKey);
    const existing: PortfolioItem[] = existingStr ? JSON.parse(existingStr) : [];
    const filtered = Array.isArray(existing) ? existing.filter((entry) => entry.id !== item.id) : [];
    safeSaveLocalStorage(storageKey, [item, ...filtered]);
  } catch (error) {
    console.warn('[portfolio] Could not update the local cache:', error);
  }
}

const legacySyncs = new Map<string, Promise<PortfolioItem | null>>();

async function uploadLegacyDataUrl(
  userId: string,
  dataUrl: string,
  folder: 'media' | 'thumbnails',
  itemId: string,
): Promise<string> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
  const file = new File([blob], `${itemId}.${extension}`, { type: blob.type });
  return uploadPortfolioMedia(userId, file, folder);
}

/**
 * Older builds reported uploads as successful after saving them only in this browser.
 * When an owner returns, migrate those recoverable records to shared storage so they
 * become visible to the whole community.
 */
async function syncLegacyLocalItem(item: PortfolioItem): Promise<PortfolioItem | null> {
  if (
    typeof window === 'undefined' ||
    !auth.currentUser ||
    auth.currentUser.uid !== item.userId ||
    !item.id ||
    !item.mediaUrl
  ) {
    return null;
  }

  const existingSync = legacySyncs.get(item.id);
  if (existingSync) return existingSync;

  const sync = (async () => {
    try {
      const remoteRef = doc(db, PORTFOLIO_COLLECTION, item.id);
      const remoteSnapshot = await getDoc(remoteRef);
      if (remoteSnapshot.exists()) {
        const remoteItem = withPortfolioDefaults({
          id: remoteSnapshot.id,
          ...remoteSnapshot.data(),
        } as PortfolioItem);
        await persistItemLocally(remoteItem);
        return remoteItem;
      }

      let mediaUrl = item.mediaUrl;
      let thumbnailUrl = item.thumbnailUrl;

      if (mediaUrl.startsWith('data:')) {
        mediaUrl = await uploadLegacyDataUrl(item.userId, mediaUrl, 'media', item.id);
      }
      if (thumbnailUrl?.startsWith('data:')) {
        thumbnailUrl = item.thumbnailUrl === item.mediaUrl
          ? mediaUrl
          : await uploadLegacyDataUrl(item.userId, thumbnailUrl, 'thumbnails', `${item.id}_thumbnail`);
      }

      if (mediaUrl !== item.mediaUrl || thumbnailUrl !== item.thumbnailUrl) {
        await persistItemLocally(withPortfolioDefaults({ ...item, mediaUrl, thumbnailUrl }));
      }

      const commentsSnapshot = await getCountFromServer(
        collection(db, PORTFOLIO_COLLECTION, item.id, 'comments')
      );
      const migratedItem = withPortfolioDefaults({
        ...item,
        mediaUrl,
        thumbnailUrl,
        commentsCount: Math.max(Number(item.commentsCount) || 0, commentsSnapshot.data().count),
      });
      await setDoc(
        remoteRef,
        withoutUndefined(migratedItem as unknown as Record<string, unknown>)
      );
      await persistItemLocally(migratedItem);
      return migratedItem;
    } catch (error) {
      console.warn(`[portfolio] Could not migrate local item ${item.id} to the community feed:`, error);
      return null;
    } finally {
      legacySyncs.delete(item.id);
    }
  })();

  legacySyncs.set(item.id, sync);
  return sync;
}

/**
 * Pushes any of this user's browser-only portfolio items up to Firestore.
 *
 * Uploads made before server persistence worked live solely in this browser's
 * localStorage/IndexedDB. They are invisible to everyone else, and nobody else
 * can recover them — the data exists only on this device. Migrating on sign-in
 * means a returning user rescues their own work without having to re-upload,
 * and without needing to visit any particular page.
 *
 * Safe to call repeatedly: syncLegacyLocalItem skips anything already on the
 * server and de-dupes concurrent attempts for the same item.
 */
export async function syncLocalItemsForUser(userId: string): Promise<number> {
  if (typeof window === 'undefined' || !userId) return 0;

  const seen = new Map<string, PortfolioItem>();

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('local_portfolio_items_')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item?.id && item.userId === userId) seen.set(item.id, item);
        }
      }
    }
  } catch {
    // Storage unavailable or corrupt — fall through to IndexedDB.
  }

  const idbItems = await loadLocalItemsIndexedDB(userId).catch(() => [] as PortfolioItem[]);
  for (const item of idbItems) {
    if (item?.id && item.userId === userId) seen.set(item.id, item);
  }

  if (seen.size === 0) return 0;

  const results = await Promise.all(
    Array.from(seen.values()).map((item) =>
      syncLegacyLocalItem(item).catch(() => null)
    )
  );

  const migrated = results.filter(Boolean).length;
  if (migrated > 0) {
    console.log(`[portfolio] Restored ${migrated} local upload(s) to your account.`);
  }
  return migrated;
}

/**
 * Creates a new Portfolio or WIP item in shared storage and Firestore.
 * The remote write is authoritative; local caches are updated only after it succeeds.
 */
export async function createPortfolioItem(
  itemData: Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt' | 'likesCount' | 'viewsCount' | 'likedBy'>,
  mediaFile?: File | null,
  thumbnailFile?: File | null
): Promise<PortfolioItem> {
  const collectionRef = collection(db, PORTFOLIO_COLLECTION);
  const newDocRef = doc(collectionRef);

  let mediaUrl = itemData.mediaUrl;
  if (mediaFile) {
    mediaUrl = await uploadPortfolioMedia(itemData.userId, mediaFile, 'media');
  }

  let thumbnailUrl = itemData.thumbnailUrl;
  if (thumbnailFile) {
    thumbnailUrl = await uploadPortfolioMedia(itemData.userId, thumbnailFile, 'thumbnails');
  } else if (!thumbnailUrl && mediaFile) {
    try {
      const autoThumb = await generateAutoThumbnail(mediaFile);
      if (autoThumb instanceof File) {
        thumbnailUrl = await uploadPortfolioMedia(itemData.userId, autoThumb, 'thumbnails');
      } else if (typeof autoThumb === 'string') {
        thumbnailUrl = autoThumb;
      }
    } catch (e) {
      console.warn("Auto thumbnail generation fallback:", e);
    }
  } else if (!thumbnailUrl && mediaUrl) {
    try {
      const autoThumb = await generateAutoThumbnail(mediaUrl);
      if (typeof autoThumb === 'string') {
        thumbnailUrl = autoThumb;
      }
    } catch (e) {}
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const newItem = withPortfolioDefaults({
    ...itemData,
    id: newDocRef.id,
    mediaUrl,
    thumbnailUrl: thumbnailUrl || (itemData.mediaType === 'image' || itemData.mediaType === 'gif' ? mediaUrl : undefined),
    likesCount: 0,
    viewsCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    likedBy: [],
    createdAt: { seconds: nowSeconds },
    updatedAt: { seconds: nowSeconds },
  } as PortfolioItem);

  await setDoc(
    newDocRef,
    withoutUndefined(newItem as unknown as Record<string, unknown>)
  );
  await persistItemLocally(newItem);

  return newItem;
}

/**
 * Fetches real videos from Firestore "videos" collection and adapts them as PortfolioItems.
 */
export async function getDatabaseVideosAsPortfolioItems(limitCount = 12): Promise<PortfolioItem[]> {
  try {
    const videosRef = collection(db, "videos");
    const q = query(videosRef, limit(limitCount));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return [];

    const STAGES: WipStage[] = ['blocking', 'splining', 'polish', 'completed', 'concept'];

    return snapshot.docs.map((docSnap, index) => {
      const data = docSnap.data();
      const wipStage = STAGES[index % STAGES.length];
      const isWip = index % 2 === 1;

      return {
        id: docSnap.id,
        userId: data.uploader || 'db-user',
        authorName: data.author_name || 'Animation Database',
        authorAvatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80`,
        title: data.title || 'Untitled Animation Reference',
        description: data.description || 'Animation reference clip pulled from database.',
        type: isWip ? 'wip' : 'portfolio',
        wipStage: isWip ? wipStage : 'completed',
        mediaType: 'video_url',
        mediaUrl: data.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: data.thumbnailUrl || data.posterUrl || `https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80`,
        tags: data.tags && data.tags.length > 0 ? data.tags : ['3D Animation', 'Body Mechanics', 'Reference'],
        software: index % 2 === 0 ? ['Maya', 'Blender'] : ['ToonBoom', 'TVPaint'],
        likesCount: Math.floor(Math.random() * 80) + 15,
        viewsCount: Math.floor(Math.random() * 500) + 120,
        sortIndex: index,
        isFeatured: index === 0,
        createdAt: data.createdAt || { seconds: Math.floor(Date.now() / 1000) },
        updatedAt: data.updatedAt || { seconds: Math.floor(Date.now() / 1000) },
      } as PortfolioItem;
    });
  } catch (error) {
    console.error("Error fetching database videos for portfolio:", error);
    return [];
  }
}

/**
 * Fetches all portfolio & WIP items for a given user.
 */
export async function getUserPortfolioItems(userId: string): Promise<PortfolioItem[]> {
  const fetchFirestore = async (): Promise<PortfolioItem[]> => {
    try {
      const collectionRef = collection(db, PORTFOLIO_COLLECTION);
      const q = query(collectionRef, where("userId", "==", userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((snapshotDoc) =>
        withPortfolioDefaults({ id: snapshotDoc.id, ...snapshotDoc.data() } as PortfolioItem)
      );
    } catch (e) {
      console.warn("[getUserPortfolioItems] Firestore query fallback:", e);
    }
    return [];
  };

  const fetchLocalStorage = (): PortfolioItem[] => {
    try {
      if (typeof window !== 'undefined') {
        const existingStr = localStorage.getItem(`local_portfolio_items_${userId}`);
        const parsed: PortfolioItem[] = existingStr ? JSON.parse(existingStr) : [];
        return Array.isArray(parsed) ? parsed.filter((item) => item.userId === userId) : [];
      }
    } catch (e) {}
    return [];
  };

  const [firestoreItems, idbItems] = await Promise.all([
    fetchFirestore(),
    loadLocalItemsIndexedDB(userId).catch(() => [])
  ]);
  const localStorageItems = fetchLocalStorage();

  const remoteIds = new Set(firestoreItems.map((item) => item.id));
  const localById = new Map<string, PortfolioItem>();
  for (const item of [...localStorageItems, ...idbItems]) {
    if (item?.id && item.userId === userId) localById.set(item.id, item);
  }

  const migratedItems = await Promise.all(
    Array.from(localById.values())
      .filter((item) => !remoteIds.has(item.id))
      .map((item) => syncLegacyLocalItem(item))
  );
  for (const item of migratedItems) {
    if (item && !remoteIds.has(item.id)) {
      firestoreItems.push(item);
      remoteIds.add(item.id);
    }
  }

  // Deduplicate items by ID with Firestore taking priority, local caches as fallback/merged values
  const itemMap = new Map<string, PortfolioItem>();
  for (const item of firestoreItems) {
    if (item && item.id) {
      itemMap.set(item.id, item);
    }
  }
  for (const item of localById.values()) {
    if (item && item.id) {
      if (!itemMap.has(item.id)) {
        itemMap.set(item.id, item);
      } else {
        const dbItem = itemMap.get(item.id)!;
        itemMap.set(item.id, {
          ...item,
          ...dbItem,
          mediaUrl: dbItem.mediaUrl || item.mediaUrl,
          thumbnailUrl: dbItem.thumbnailUrl || item.thumbnailUrl,
        });
      }
    }
  }

  return Array.from(itemMap.values())
    .map(withPortfolioDefaults)
    .sort((a, b) => portfolioCreatedAtSeconds(b) - portfolioCreatedAtSeconds(a));
}

/**
 * Fetches public portfolio & WIP items with optional filters.
 */
export async function getPublicPortfolioItems(options?: {
  type?: 'portfolio' | 'wip';
  wipStage?: WipStage;
  limitCount?: number;
}): Promise<PortfolioItem[]> {
  const fetchFirestore = async (): Promise<PortfolioItem[]> => {
    try {
      const collectionRef = collection(db, PORTFOLIO_COLLECTION);
      const snapshot = await getDocs(collectionRef);
      return snapshot.docs.map((snapshotDoc) =>
        withPortfolioDefaults({ id: snapshotDoc.id, ...snapshotDoc.data() } as PortfolioItem)
      );
    } catch (error) {
      console.warn("[getPublicPortfolioItems] Firestore query fallback:", error);
      return [];
    }
  };

  const fetchLocalStorage = (): PortfolioItem[] => {
    const items: PortfolioItem[] = [];
    try {
      if (typeof window !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('local_portfolio_items_')) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) items.push(...parsed);
            }
          }
        }
      }
    } catch {}
    return items;
  };

  const [firestoreItems, idbItems] = await Promise.all([
    fetchFirestore(),
    loadLocalItemsIndexedDB().catch(() => [])
  ]);
  const localStorageItems = fetchLocalStorage();

  const remoteIds = new Set(firestoreItems.map((item) => item.id));
  const localById = new Map<string, PortfolioItem>();
  for (const item of [...localStorageItems, ...idbItems]) {
    if (item?.id && item.title) localById.set(item.id, item);
  }

  const currentUserId = auth.currentUser?.uid;
  if (currentUserId) {
    const migratedItems = await Promise.all(
      Array.from(localById.values())
        .filter((item) => item.userId === currentUserId && !remoteIds.has(item.id))
        .map((item) => syncLegacyLocalItem(item))
    );
    for (const item of migratedItems) {
      if (item && !remoteIds.has(item.id)) {
        firestoreItems.push(item);
        remoteIds.add(item.id);
      }
    }
  }

  const itemMap = new Map<string, PortfolioItem>();
  for (const item of firestoreItems) {
    if (item && item.id && item.title) {
      itemMap.set(item.id, item);
    }
  }
  for (const item of localById.values()) {
    if (item && item.id && item.title) {
      if (!itemMap.has(item.id)) {
        itemMap.set(item.id, item);
      } else {
        const dbItem = itemMap.get(item.id)!;
        itemMap.set(item.id, {
          ...item,
          ...dbItem,
          mediaUrl: dbItem.mediaUrl || item.mediaUrl,
          thumbnailUrl: dbItem.thumbnailUrl || item.thumbnailUrl,
        });
      }
    }
  }

  const allItems = Array.from(itemMap.values())
    .map(withPortfolioDefaults)
    .filter((item) => !options?.type || item.type === options.type)
    .filter((item) => !options?.wipStage || item.wipStage === options.wipStage)
    .sort((a, b) => portfolioCreatedAtSeconds(b) - portfolioCreatedAtSeconds(a));

  return options?.limitCount ? allItems.slice(0, options.limitCount) : allItems;
}

/**
 * Fetches a single portfolio item by ID and increments view count.
 */
export async function getPortfolioItemById(itemId: string): Promise<PortfolioItem | null> {
  try {
    const docRef = doc(db, PORTFOLIO_COLLECTION, itemId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    
    // Increment view count asynchronously without delaying the detail view.
    incrementPortfolioItemViews(itemId).catch(console.error);

    return withPortfolioDefaults({ id: snapshot.id, ...snapshot.data() } as PortfolioItem);
  } catch (error) {
    console.error("Error getting portfolio item by ID:", error);
    return null;
  }
}

/**
 * Updates an existing portfolio item.
 */
export async function updatePortfolioItem(
  itemId: string, 
  userId: string, 
  updateData: Partial<PortfolioItem>
): Promise<void> {
  const docRef = doc(db, PORTFOLIO_COLLECTION, itemId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) throw new Error("Portfolio item not found");
  if (snapshot.data().userId !== userId) throw new Error("Unauthorized update");

  await updateDoc(docRef, {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Atomically increments a public engagement counter and returns its persisted value.
 */
async function incrementPortfolioCounter(
  itemId: string,
  field: 'viewsCount' | 'sharesCount',
): Promise<number> {
  const docRef = doc(db, PORTFOLIO_COLLECTION, itemId);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists()) throw new Error('Portfolio item not found');

    const currentCount = Math.max(0, Number(snapshot.data()[field]) || 0);
    const nextCount = currentCount + 1;
    transaction.update(docRef, { [field]: nextCount });
    return nextCount;
  });
}

/**
 * Increments view count on a portfolio item.
 */
export function incrementPortfolioItemViews(itemId: string): Promise<number> {
  return incrementPortfolioCounter(itemId, 'viewsCount');
}

/**
 * Increments share count on a portfolio item.
 */
export function incrementPortfolioItemShares(itemId: string): Promise<number> {
  return incrementPortfolioCounter(itemId, 'sharesCount');
}

/**
 * Deletes a portfolio item from Firestore, IndexedDB, and localStorage.
 */
export async function deletePortfolioItem(itemId: string, userId: string): Promise<void> {
  // 1. Delete from Firestore
  try {
    const docRef = doc(db, PORTFOLIO_COLLECTION, itemId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn("[deletePortfolioItem] Firestore delete error:", error);
  }

  // 2. Delete from IndexedDB
  await deleteLocalItemIndexedDB(itemId).catch(() => {});

  // 3. Delete from localStorage keys
  try {
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('local_portfolio_items_')) {
          const existingStr = localStorage.getItem(k);
          if (existingStr) {
            const parsed: PortfolioItem[] = JSON.parse(existingStr);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter((item) => item.id !== itemId);
              localStorage.setItem(k, JSON.stringify(filtered));
            }
          }
        }
      }
    }
  } catch {}
}

/**
 * Toggles like on a portfolio item.
 */
export async function toggleLikePortfolioItem(
  itemId: string, 
  userId: string
): Promise<{ isLiked: boolean; count: number }> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('You must be signed in to like a portfolio item.');
  }

  const docRef = doc(db, PORTFOLIO_COLLECTION, itemId);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists()) throw new Error('Portfolio item not found');

    const data = snapshot.data();
    const likedBy = Array.isArray(data.likedBy)
      ? Array.from(new Set(data.likedBy.filter((id): id is string => typeof id === 'string')))
      : [];
    const isLiked = likedBy.includes(userId);
    const currentCount = Math.max(0, Number(data.likesCount) || 0);
    const updatedLikedBy = isLiked
      ? likedBy.filter((id) => id !== userId)
      : [...likedBy, userId];
    const nextCount = isLiked ? Math.max(0, currentCount - 1) : currentCount + 1;

    transaction.update(docRef, {
      likedBy: updatedLikedBy,
      likesCount: nextCount,
    });

    return { isLiked: !isLiked, count: nextCount };
  });
}

/**
 * Updates bio, social links, and headline for a user profile in Firestore.
 */
export async function updateUserProfileData(
  userId: string, 
  data: Partial<UserProfile>
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(userRef, data, { merge: true });
  } catch (error: any) {
    console.warn("Firestore updateUserProfileData permission fallback triggered:", error?.message || error);
    try {
      const storageKey = `user_profile_${userId}`;
      const existingStr = localStorage.getItem(storageKey);
      const existing = existingStr ? JSON.parse(existingStr) : {};
      localStorage.setItem(storageKey, JSON.stringify({ ...existing, ...data }));
    } catch (e) {}
  }
}
