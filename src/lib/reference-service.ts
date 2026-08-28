'use client';

import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, limit, query,
  runTransaction, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { BoardFollow, BoardSave, ReferenceBoard, ReferenceClip, ShotBreakdown, UserProfile } from './types';
import { isProProfile, slugifyReference } from './reference-utils';

const BOARDS = 'reference_boards';
const CLIPS = 'reference_clips';
const SAVES = 'reference_board_saves';
const FOLLOWS = 'reference_board_follows';
const BREAKDOWNS = 'shot_breakdowns';

function withId<T>(snapshot: { id: string; data(): unknown }): T {
  return { id: snapshot.id, ...(snapshot.data() as object) } as T;
}

function newestFirst<T extends { createdAt?: { seconds?: number } }>(items: T[]): T[] {
  return items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

export async function createReferenceBoard(input: {
  owner: UserProfile;
  title: string;
  description?: string;
  isPrivate?: boolean;
  duplicatedFromId?: string;
}): Promise<string> {
  if (input.isPrivate && !isProProfile(input.owner)) throw new Error('Private boards require Animation Reference Pro.');
  const ref = await addDoc(collection(db, BOARDS), {
    ownerId: input.owner.uid,
    ownerName: input.owner.displayName || input.owner.username || 'Animator',
    ownerUsername: input.owner.username || null,
    ownerAvatar: input.owner.photoURL || null,
    title: input.title.trim(),
    slug: slugifyReference(input.title),
    description: input.description?.trim() || '',
    isPrivate: Boolean(input.isPrivate),
    clipCount: 0,
    followerCount: 0,
    duplicatedFromId: input.duplicatedFromId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateReferenceBoard(boardId: string, input: Partial<Pick<ReferenceBoard, 'title' | 'description' | 'coverUrl' | 'isPrivate'>>, owner: UserProfile) {
  if (input.isPrivate && !isProProfile(owner)) throw new Error('Private boards require Animation Reference Pro.');
  const changes: Record<string, unknown> = { ...input, updatedAt: serverTimestamp() };
  if (input.title) changes.slug = slugifyReference(input.title);
  await updateDoc(doc(db, BOARDS, boardId), changes);
}

export async function deleteReferenceBoard(boardId: string) {
  const saves = await getDocs(query(collection(db, SAVES), where('boardId', '==', boardId)));
  const batch = writeBatch(db);
  saves.docs.forEach((save) => batch.delete(save.ref));
  batch.delete(doc(db, BOARDS, boardId));
  await batch.commit();
}

export async function getReferenceBoard(boardId: string): Promise<ReferenceBoard | null> {
  const snap = await getDoc(doc(db, BOARDS, boardId));
  return snap.exists() ? withId<ReferenceBoard>(snap) : null;
}

export async function getUserReferenceBoards(ownerId: string, includePrivate = false): Promise<ReferenceBoard[]> {
  const constraints = [where('ownerId', '==', ownerId)];
  if (!includePrivate) constraints.push(where('isPrivate', '==', false));
  const snaps = await getDocs(query(collection(db, BOARDS), ...constraints));
  return newestFirst(snaps.docs.map((item) => withId<ReferenceBoard>(item)));
}

export async function getPublicReferenceBoards(max = 30): Promise<ReferenceBoard[]> {
  const snaps = await getDocs(query(collection(db, BOARDS), where('isPrivate', '==', false), limit(max)));
  return newestFirst(snaps.docs.map((item) => withId<ReferenceBoard>(item)));
}

export async function createReferenceClip(input: Omit<ReferenceClip, 'id' | 'saveCount' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, CLIPS), {
    ...input,
    saveCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (input.primaryBoardId) await saveClipToBoard(ref.id, input.primaryBoardId, input.creatorId);
  return ref.id;
}

export async function getReferenceClip(clipId: string): Promise<ReferenceClip | null> {
  const snap = await getDoc(doc(db, CLIPS, clipId));
  return snap.exists() ? withId<ReferenceClip>(snap) : null;
}

export async function getPublicReferenceClips(max = 60): Promise<ReferenceClip[]> {
  try {
    const snaps = await getDocs(query(collection(db, CLIPS), where('isPrivate', '==', false), limit(max)));
    let clips = snaps.docs.map((item) => withId<ReferenceClip>(item)).filter((clip) => !clip.removedFromCreatorAt);
    if (clips.length === 0) {
      const allSnaps = await getDocs(query(collection(db, CLIPS), limit(max)));
      clips = allSnaps.docs
        .map((item) => withId<ReferenceClip>(item))
        .filter((clip) => !clip.isPrivate && !clip.removedFromCreatorAt);
    }
    return newestFirst(clips);
  } catch {
    return [];
  }
}

export async function getUserReferenceClips(creatorId: string, includePrivate = false): Promise<ReferenceClip[]> {
  const constraints = [where('creatorId', '==', creatorId)];
  if (!includePrivate) constraints.push(where('isPrivate', '==', false));
  const snaps = await getDocs(query(collection(db, CLIPS), ...constraints));
  return newestFirst(snaps.docs.map((item) => withId<ReferenceClip>(item)));
}

export async function saveClipToBoard(clipId: string, boardId: string, ownerId: string) {
  const saveId = `${boardId}_${clipId}`;
  await runTransaction(db, async (transaction) => {
    const saveRef = doc(db, SAVES, saveId);
    const existing = await transaction.get(saveRef);
    if (existing.exists()) return;
    transaction.set(saveRef, { boardId, clipId, ownerId, createdAt: serverTimestamp() });
    transaction.update(doc(db, BOARDS, boardId), { clipCount: increment(1), updatedAt: serverTimestamp() });
    transaction.update(doc(db, CLIPS, clipId), { saveCount: increment(1) });
  });
}

export async function removeClipFromBoard(clipId: string, boardId: string) {
  const saveRef = doc(db, SAVES, `${boardId}_${clipId}`);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(saveRef);
    if (!existing.exists()) return;
    transaction.delete(saveRef);
    transaction.update(doc(db, BOARDS, boardId), { clipCount: increment(-1), updatedAt: serverTimestamp() });
    transaction.update(doc(db, CLIPS, clipId), { saveCount: increment(-1) });
  });
}

export async function getBoardClips(boardId: string): Promise<ReferenceClip[]> {
  const saves = await getDocs(query(collection(db, SAVES), where('boardId', '==', boardId)));
  const clips = await Promise.all(saves.docs.map((save) => getReferenceClip((save.data() as BoardSave).clipId)));
  return newestFirst(clips.filter(Boolean) as ReferenceClip[]);
}

export async function duplicateReferenceBoard(source: ReferenceBoard, clips: ReferenceClip[], owner: UserProfile): Promise<string> {
  const boardId = await createReferenceBoard({
    owner,
    title: `${source.title} — copy`,
    description: source.description,
    isPrivate: false,
    duplicatedFromId: source.id,
  });
  for (const clip of clips) await saveClipToBoard(clip.id, boardId, owner.uid);
  return boardId;
}

export async function isFollowingBoard(boardId: string, userId: string): Promise<boolean> {
  return (await getDoc(doc(db, FOLLOWS, `${boardId}_${userId}`))).exists();
}

export async function toggleBoardFollow(boardId: string, userId: string): Promise<boolean> {
  const followRef = doc(db, FOLLOWS, `${boardId}_${userId}`);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(followRef);
    if (snap.exists()) {
      transaction.delete(followRef);
      transaction.update(doc(db, BOARDS, boardId), { followerCount: increment(-1) });
      return false;
    }
    transaction.set(followRef, { boardId, userId, createdAt: serverTimestamp() } satisfies Omit<BoardFollow, 'id'>);
    transaction.update(doc(db, BOARDS, boardId), { followerCount: increment(1) });
    return true;
  });
}

export async function createShotBreakdown(input: Omit<ShotBreakdown, 'id' | 'createdAt' | 'updatedAt'>, owner: UserProfile): Promise<string> {
  if (!isProProfile(owner)) throw new Error('Shot breakdowns require Animation Reference Pro.');
  const ref = await addDoc(collection(db, BREAKDOWNS), {
    ...input,
    slug: slugifyReference(input.slug || input.title),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getShotBreakdown(ownerId: string, slug: string): Promise<ShotBreakdown | null> {
  const snaps = await getDocs(query(collection(db, BREAKDOWNS), where('ownerId', '==', ownerId), where('slug', '==', slug), limit(1)));
  return snaps.empty ? null : withId<ShotBreakdown>(snaps.docs[0]);
}

export async function getUserShotBreakdowns(ownerId: string): Promise<ShotBreakdown[]> {
  const snaps = await getDocs(query(collection(db, BREAKDOWNS), where('ownerId', '==', ownerId)));
  return newestFirst(snaps.docs.map((item) => withId<ShotBreakdown>(item)));
}
