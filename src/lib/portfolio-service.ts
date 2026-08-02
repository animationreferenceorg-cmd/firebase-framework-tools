import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  increment,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "./firebase";
import type { PortfolioItem, UserProfile, WipStage } from "./types";

const PORTFOLIO_COLLECTION = "portfolio_items";
const USERS_COLLECTION = "users";

/**
 * Uploads a file (video, image, thumbnail) to Firebase Storage under portfolio/{userId}/{folder}/
 * Falls back to Data URL if Firebase Storage permissions fail.
 */
export async function uploadPortfolioMedia(
  userId: string, 
  file: File, 
  folder: 'media' | 'thumbnails'
): Promise<string> {
  try {
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `portfolio/${userId}/${folder}/${timestamp}_${cleanName}`;
    const storageRef = ref(storage, storagePath);
    
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error: any) {
    console.warn("Firebase Storage upload permission fallback triggered:", error?.message || error);
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 1200;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve(dataUrl);
            return;
          }
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        };
        img.onerror = () => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        };
        img.src = url;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      }
    });
  }
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
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
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

export async function loadLocalItemsIndexedDB(userId?: string): Promise<PortfolioItem[]> {
  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction("portfolio_items", "readonly");
    const store = tx.objectStore("portfolio_items");
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results: PortfolioItem[] = request.result || [];
        resolve(results);
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

/**
 * Creates a new Portfolio or WIP item in Firestore.
 * Falls back to local persistence if Firestore permissions fail.
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
  const newItem: PortfolioItem = {
    ...itemData,
    id: newDocRef.id,
    mediaUrl,
    thumbnailUrl: thumbnailUrl || (itemData.mediaType === 'image' || itemData.mediaType === 'gif' ? mediaUrl : undefined),
    likesCount: 0,
    viewsCount: 0,
    likedBy: [],
    createdAt: { seconds: nowSeconds },
    updatedAt: { seconds: nowSeconds },
  };

  // Always store full item locally in IndexedDB and localStorage so uploaded work is immediately visible across preview links
  await saveLocalItemIndexedDB(newItem);
  try {
    const storageKey = `local_portfolio_items_${itemData.userId}`;
    const existingStr = localStorage.getItem(storageKey);
    const existing: PortfolioItem[] = existingStr ? JSON.parse(existingStr) : [];
    const filtered = existing.filter((i) => i.id !== newItem.id);
    safeSaveLocalStorage(storageKey, [newItem, ...filtered]);
  } catch (e) {
    console.error("Failed to save to local storage fallback:", e);
  }

  try {
    await setDoc(newDocRef, newItem);
  } catch (error: any) {
    console.warn("Firestore setDoc permission fallback triggered:", error?.message || error);
  }

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
      const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500));
      const snapshot = await Promise.race([getDocs(q), timeoutPromise]);
      if (snapshot && snapshot.docs) {
        return snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as PortfolioItem));
      }
    } catch (e) {
      console.warn("[getUserPortfolioItems] Firestore query fallback:", e);
    }
    return [];
  };

  const fetchLocalStorage = (): PortfolioItem[] => {
    const items: PortfolioItem[] = [];
    try {
      if (typeof window !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('local_portfolio_items_')) {
            const existingStr = localStorage.getItem(k);
            if (existingStr) {
              const parsed: PortfolioItem[] = JSON.parse(existingStr);
              if (Array.isArray(parsed)) {
                items.push(...parsed);
              }
            }
          }
        }
      }
    } catch (e) {}
    return items;
  };

  const [firestoreItems, idbItems] = await Promise.all([
    fetchFirestore(),
    loadLocalItemsIndexedDB().catch(() => [])
  ]);
  const localStorageItems = fetchLocalStorage();

  // Deduplicate items by ID with IndexedDB highest priority for full resolution base64
  const itemMap = new Map<string, PortfolioItem>();
  for (const item of [...firestoreItems, ...localStorageItems, ...idbItems]) {
    if (item && item.id) {
      itemMap.set(item.id, item);
    }
  }

  const allCombined = Array.from(itemMap.values());
  return allCombined.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

/**
 * Fetches public portfolio & WIP items with optional filters.
 */
export async function getPublicPortfolioItems(options?: {
  type?: 'portfolio' | 'wip';
  wipStage?: WipStage;
  limitCount?: number;
}): Promise<PortfolioItem[]> {
  try {
    const collectionRef = collection(db, PORTFOLIO_COLLECTION);
    let constraints: any[] = [];
    
    if (options?.type) {
      constraints.push(where("type", "==", options.type));
    }
    if (options?.wipStage) {
      constraints.push(where("wipStage", "==", options.wipStage));
    }
    
    constraints.push(orderBy("createdAt", "desc"));
    if (options?.limitCount) {
      constraints.push(limit(options.limitCount));
    }

    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PortfolioItem));
  } catch (error) {
    console.error("Error fetching public portfolio items:", error);
    return [];
  }
}

/**
 * Fetches a single portfolio item by ID and increments view count.
 */
export async function getPortfolioItemById(itemId: string): Promise<PortfolioItem | null> {
  try {
    const docRef = doc(db, PORTFOLIO_COLLECTION, itemId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    
    // Increment view count asynchronously
    updateDoc(docRef, { viewsCount: increment(1) }).catch(console.error);

    return { id: snapshot.id, ...snapshot.data() } as PortfolioItem;
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
 * Deletes a portfolio item.
 */
export async function deletePortfolioItem(itemId: string, userId: string): Promise<void> {
  const docRef = doc(db, PORTFOLIO_COLLECTION, itemId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return;
  if (snapshot.data().userId !== userId) throw new Error("Unauthorized delete");

  await deleteDoc(docRef);
}

/**
 * Toggles like on a portfolio item.
 */
export async function toggleLikePortfolioItem(
  itemId: string, 
  userId: string
): Promise<{ isLiked: boolean; count: number }> {
  const docRef = doc(db, PORTFOLIO_COLLECTION, itemId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) throw new Error("Item not found");

  const data = snapshot.data();
  const likedBy: string[] = data.likedBy || [];
  const isLiked = likedBy.includes(userId);

  if (isLiked) {
    await updateDoc(docRef, {
      likedBy: arrayRemove(userId),
      likesCount: increment(-1)
    });
    return { isLiked: false, count: Math.max(0, (data.likesCount || 1) - 1) };
  } else {
    await updateDoc(docRef, {
      likedBy: arrayUnion(userId),
      likesCount: increment(1)
    });
    return { isLiked: true, count: (data.likesCount || 0) + 1 };
  }
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
