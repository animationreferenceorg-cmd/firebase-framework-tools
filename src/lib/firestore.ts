
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, addDoc, collection, writeBatch, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "firebase/auth";
import type { Category, UserProfile } from "./types";

// Firestore collection reference
const USERS_COLLECTION = "users";
const CUSTOMERS_COLLECTION = "customers";
const CATEGORIES_COLLECTION = "categories";

/**
 * Creates a new user profile document in Firestore if it doesn't already exist.
 * This is safe to call on every login.
 * @param user The Firebase auth user object.
 */
export async function createUserProfile(user: User): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Set a default role of 'user'
    const defaultRole = 'user';
    const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: defaultRole,
        likedVideoIds: [],
        likedCategoryTitles: [],
        savedShortIds: [],
        recentlyViewedShortIds: [],
    };
    await setDoc(userRef, userProfile);
  }
  
  // Also create a customer document for Stripe if it doesn't exist.
  const customerRef = doc(db, CUSTOMERS_COLLECTION, user.uid);
  const customerSnap = await getDoc(customerRef);

  if (!customerSnap.exists()) {
    try {
        await setDoc(customerRef, {
            email: user.email,
            // You can add more Stripe-specific customer data here
        });
    } catch (error) {
        console.error("Error creating customer document for Stripe:", error);
    }
  }
}

/**
 * Fetches a user's profile from Firestore.
 * @param uid The user's ID.
 * @returns The user profile data, or null if not found.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const docSnap = await getDoc(userRef);

  let profile: UserProfile | null = null;

  if (docSnap.exists()) {
    profile = docSnap.data() as UserProfile;
  }

  // Check for active subscription in Stripe extension collection
  try {
    const locations = [
        collection(db, CUSTOMERS_COLLECTION, uid, 'subscriptions'),
        collection(db, USERS_COLLECTION, uid, 'subscriptions'),
        collection(db, 'stripe_customers', uid, 'subscriptions')
    ];

    let activeSubDoc = null;

    console.log(`[Subscription Check] Checking locations for UID: ${uid}`);

    for (const subRef of locations) {
        try {
            const anySnap = await getDocs(subRef);
            console.log(`[Subscription Check] Found ${anySnap.size} total docs in ${subRef.path}`);
            
            if (!anySnap.empty) {
                anySnap.forEach(d => console.log(`[Subscription Check] Doc ${d.id} has status: ${d.data().status}`));
                const active = anySnap.docs.find(d => ['active', 'trialing'].includes(d.data().status));
                if (active) {
                    activeSubDoc = active;
                    console.log(`[Subscription Check] Found active subscription in ${subRef.path}`);
                    break;
                }
            }
        } catch (e) {
            console.warn(`[Subscription Check] Could not access ${subRef.path}:`, e);
        }
    }

    if (activeSubDoc) {
      const subData = activeSubDoc.data();
      const priceId = subData.items?.[0]?.price?.id || subData.price?.id || subData.plan?.id || subData.items?.[0]?.plan?.id;
      
      console.log(`[Subscription Check] Found priceId: ${priceId}`);

      let detectedTier: UserProfile['tier'] = 'tier1'; 
      if (priceId === 'price_1SFgiV59QHehw05fc0lPRRf7') detectedTier = 'tier2';
      else if (priceId === 'price_1SFgiq59QHehw05fy017h1gR') detectedTier = 'tier5';
      else if (priceId === 'price_1SFgUc59QHehw05fROtqwkLN' || priceId?.includes('1SFgUc')) detectedTier = 'tier1';
      else {
          console.warn(`[Subscription Check] Unknown Price ID: ${priceId}. Defaulting to tier1.`);
          detectedTier = 'tier1';
      }

      if (profile) {
        if (!profile.isPremium || profile.tier !== detectedTier) {
          console.log(`[Subscription Check] Syncing detected tier: ${detectedTier}`);
          profile.isPremium = true;
          profile.tier = detectedTier;
          try {
            await updateDoc(userRef, { 
                isPremium: true, 
                tier: detectedTier,
                subscriptionStatus: subData.status,
                updatedAt: new Date().toISOString()
            });
          } catch (e) {
            console.error("[Subscription Check] Failed to update profile doc:", e);
          }
        }
      } else {
        profile = {
          uid: uid,
          email: null,
          displayName: null,
          photoURL: null,
          role: 'user',
          isPremium: true,
          tier: detectedTier,
          subscriptionStatus: subData.status,
          likedVideoIds: [],
          likedCategoryTitles: [],
          savedShortIds: [],
          recentlyViewedShortIds: [],
        } as UserProfile;
      }
    } else {
        console.log("[Subscription Check] No active/trialing subscription found in any location.");
    }
  } catch (error) {
    console.error("[Subscription Check] Error during search:", error);
  }

  if (profile) {
    return profile;
  } else {
    console.warn(`No user profile found for UID: ${uid}`);
    return null;
  }
}

/**
 * Adds a video ID to the user's liked videos list.
 * It will create a user profile if one doesn't exist.
 * @param uid The user's ID.
 * @param videoId The ID of the video to like.
 */
export async function likeVideo(uid: string, videoId: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists()) {
    // If the document exists, update it.
    await updateDoc(userRef, {
        likedVideoIds: arrayUnion(videoId),
    });
  } else {
    // If the document does not exist, create it with the liked video.
    // This handles cases for users who existed before the profile creation logic was added.
    const newUserProfile: Partial<UserProfile> = {
        uid: uid,
        likedVideoIds: [videoId],
    };
    await setDoc(userRef, newUserProfile, { merge: true });
  }
}

/**
 * Removes a video ID from the user's liked videos list.
 * @param uid The user's ID.
 * @param videoId The ID of the video to unlike.
 */
export async function unlikeVideo(uid: string, videoId: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    likedVideoIds: arrayRemove(videoId),
  });
}


// --- Category Functions ---

export async function likeCategory(uid: string, categoryTitle: string): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      likedCategoryTitles: arrayUnion(categoryTitle),
    });
}

export async function unlikeCategory(uid: string, categoryTitle: string): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      likedCategoryTitles: arrayRemove(categoryTitle),
    });
}

/**
 * Updates the sort order of categories in Firestore.
 * @param orderedCategories The array of categories in their new order.
 */
export async function updateCategoryOrder(orderedCategories: Category[]): Promise<void> {
    const batch = writeBatch(db);

    orderedCategories.forEach((category, index) => {
        const categoryRef = doc(db, CATEGORIES_COLLECTION, category.id);
        batch.update(categoryRef, { sortIndex: index });
    });

    await batch.commit();
}

/**
 * Updates the tags for a specific category.
 * @param categoryId The ID of the category to update.
 * @param newTags The new array of tags.
 */
export async function updateCategoryTags(categoryId: string, newTags: string[]): Promise<void> {
    const categoryRef = doc(db, CATEGORIES_COLLECTION, categoryId);
    await updateDoc(categoryRef, { tags: newTags });
}


/**
 * Creates a new category with a 'draft' status.
 * @param title The title of the new category.
 * @returns The newly created category object.
 */
export async function createDraftCategory(title: string): Promise<Category | null> {
    try {
        const categoriesRef = collection(db, CATEGORIES_COLLECTION);
        const newDocRef = doc(categoriesRef); // Create a new doc with a generated ID

        const newCategory: Category = {
            id: newDocRef.id,
            title,
            description: "A compelling description of the category goes here.",
            status: 'draft',
            tags: [],
            imageUrl: `https://placehold.co/400x300.png`,
            href: `/browse/${newDocRef.id}`, // Use the generated ID
        };

        await setDoc(newDocRef, newCategory);
        return newCategory;
    } catch (error) {
        console.error("Error creating draft category:", error);
        return null;
    }
}


// --- Short Film Functions ---

export async function saveShort(uid: string, videoId: string): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
        savedShortIds: arrayUnion(videoId),
    });
}

export async function unsaveShort(uid: string, videoId: string): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
        savedShortIds: arrayRemove(videoId),
    });
}

// --- Recently Viewed ---
export async function addRecentlyViewedShort(uid: string, videoId: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    recentlyViewedShortIds: arrayUnion(videoId),
  });
}


// --- Taxonomy Deletion ---

/**
 * Deletes a tag from its collection.
 * @param tag The tag name (document ID).
 * @param isShort Whether the tag belongs to short films or regular videos.
 */
export async function deleteTag(tag: string, isShort: boolean): Promise<void> {
  const collectionName = isShort ? 'shortFilmTags' : 'tags';
  const tagRef = doc(db, collectionName, tag);
  await deleteDoc(tagRef);
}


export async function updateTagGroups(tag: string, group: string, isShort: boolean): Promise<void> {
    const collectionName = isShort ? 'shortFilmTags' : 'tags';
    const tagRef = doc(db, collectionName, tag);
    // This is a simplified approach. A real implementation might involve
    // removing old group tags and adding the new one.
    await updateDoc(tagRef, { group: group });
}


/**
 * Deletes a category from its collection.
 * @param categoryId The category document ID.
 * @param isShort Whether the category belongs to short films or regular videos.
 */
export async function deleteCategory(categoryId: string, isShort: boolean): Promise<void> {
  const collectionName = isShort ? 'shortFilmCategories' : 'categories';
  const categoryRef = doc(db, collectionName, categoryId);
  await deleteDoc(categoryRef);
}
