"use client";

import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FollowedArtist {
  uid: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  followedAt: number;
}

const STORAGE_KEY_PREFIX = 'followed_artists_';

export function getFollowedArtists(userId: string): FollowedArtist[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function isArtistFollowed(userId: string, targetArtistUid: string): boolean {
  if (!userId || !targetArtistUid) return false;
  const followed = getFollowedArtists(userId);
  return followed.some((a) => a.uid === targetArtistUid);
}

export async function toggleFollowArtist(
  currentUserId: string,
  artist: { uid: string; username: string; displayName: string; avatarUrl?: string }
): Promise<boolean> {
  if (!currentUserId || !artist.uid) return false;

  const followed = getFollowedArtists(currentUserId);
  const exists = followed.some((a) => a.uid === artist.uid);

  let newFollowed: FollowedArtist[];
  let isNowFollowing = false;

  if (exists) {
    newFollowed = followed.filter((a) => a.uid !== artist.uid);
    isNowFollowing = false;
  } else {
    const newEntry: FollowedArtist = {
      uid: artist.uid,
      username: artist.username,
      displayName: artist.displayName,
      avatarUrl: artist.avatarUrl,
      followedAt: Date.now(),
    };
    newFollowed = [newEntry, ...followed];
    isNowFollowing = true;
  }

  // Update localStorage
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${currentUserId}`, JSON.stringify(newFollowed));
  } catch (e) {}

  // Sync to Firestore user profile document
  try {
    const userRef = doc(db, 'users', currentUserId);
    if (isNowFollowing) {
      await updateDoc(userRef, {
        following: arrayUnion(artist.uid),
      });
    } else {
      await updateDoc(userRef, {
        following: arrayRemove(artist.uid),
      });
    }
  } catch (e) {}

  return isNowFollowing;
}
