/**
 * Firestore rules: a client must never be able to grant itself paid access.
 * Run with `npm run test:rules` (starts the Firestore emulator; needs Java).
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-animationreference',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/alice'), { email: 'alice@example.com', role: 'user', displayName: 'Alice' });
    await setDoc(doc(db, 'users/sam'), { role: 'user', tier: 'student_unlimited', isVIP: true, isPremium: true });
    await setDoc(doc(db, 'users/admin1'), { role: 'admin' });
    await setDoc(doc(db, 'customers/alice'), { email: 'alice@example.com', stripeId: 'cus_A' });
  });
});

const alice = () => env.authenticatedContext('alice').firestore();

describe('users/{uid} entitlement fields', () => {
  it('owners can edit ordinary profile fields', async () => {
    await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), { displayName: 'Alice A.', bio: 'Animator' }));
  });

  it.each([
    ['isPremium', true],
    ['tier', 'tier5'],
    ['plan', 'pro_annual'],
    ['subscriptionStatus', 'active'],
    ['isVIP', true],
    ['unlimitedAccess', true],
    ['isStudent', true],
    ['role', 'admin'],
    ['stripeCustomerId', 'cus_victim'],
  ])('owners cannot set %s', async (field, value) => {
    await assertFails(updateDoc(doc(alice(), 'users/alice'), { [field]: value }));
  });

  it('owners cannot smuggle a grant in with an ordinary edit', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice'), { displayName: 'x', unlimitedAccess: true }, { merge: true }));
  });

  it('re-saving unchanged values is allowed (merge writes of the whole profile)', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice'), { email: 'alice@example.com', role: 'user' }, { merge: true }));
  });

  it('an SJSU user cannot upgrade or alter their grant', async () => {
    const sam = env.authenticatedContext('sam').firestore();
    await assertFails(updateDoc(doc(sam, 'users/sam'), { tier: 'tier5' }));
    await assertSucceeds(updateDoc(doc(sam, 'users/sam'), { bio: 'Spartan' }));
  });

  it('new profiles may only carry default values', async () => {
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(setDoc(doc(bob, 'users/bob'), { role: 'user', isVIP: true }));
    await assertFails(setDoc(doc(bob, 'users/bob'), { role: 'user', isPremium: true, tier: 'tier5' }));
    await assertSucceeds(setDoc(doc(bob, 'users/bob'), { role: 'user', email: 'bob@example.com' }));
  });

  it('users cannot write another user profile', async () => {
    await assertFails(updateDoc(doc(alice(), 'users/sam'), { bio: 'hacked' }));
  });

  it('admins can manage entitlements', async () => {
    const admin = env.authenticatedContext('admin1').firestore();
    await assertSucceeds(updateDoc(doc(admin, 'users/alice'), { tier: 'tier5', isPremium: true }));
  });

  it('anonymous clients cannot write profiles', async () => {
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(updateDoc(doc(anon, 'users/alice'), { bio: 'x' }));
  });
});

describe('customers/{uid} Stripe linkage', () => {
  it('owners can read their customer doc', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'customers/alice')));
  });

  it('owners cannot point their account at another Stripe customer', async () => {
    await assertFails(updateDoc(doc(alice(), 'customers/alice'), { stripeId: 'cus_victim' }));
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(setDoc(doc(bob, 'customers/bob'), { email: 'bob@example.com', stripeId: 'cus_victim' }));
    await assertSucceeds(setDoc(doc(bob, 'customers/bob'), { email: 'bob@example.com' }));
  });
});

describe('users/{uid} subcollections', () => {
  it('owners can write their own subcollections (moodboards, etc.)', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/moodboards/b1'), { name: 'Board' }));
  });

  it('the subcollection rule does not reopen the profile doc itself', async () => {
    // `users/{uid}/{document=**}` matches zero segments in rules v2; it must not grant this.
    await assertFails(setDoc(doc(alice(), 'users/alice'), { isVIP: true }, { merge: true }));
  });

  it('users cannot write another user subcollections', async () => {
    await assertFails(setDoc(doc(alice(), 'users/sam/moodboards/b1'), { name: 'x' }));
  });
});

describe('private boards and clips require Pro', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users/pro1'), { role: 'user', isPremium: true, tier: 'tier5', plan: 'pro_monthly', subscriptionStatus: 'active' });
      await setDoc(doc(db, 'users/lapsed'), { role: 'user', isPremium: true, tier: 'tier5', plan: 'pro_monthly', subscriptionStatus: 'canceled' });
      await setDoc(doc(db, 'reference_boards/lapsedPrivate'), { ownerId: 'lapsed', isPrivate: true, title: 'Old', clipCount: 0, followerCount: 0 });
      await setDoc(doc(db, 'reference_boards/alicePublic'), { ownerId: 'alice', isPrivate: false, title: 'A', clipCount: 0, followerCount: 0 });
      await setDoc(doc(db, 'reference_clips/privateClip'), { creatorId: 'pro1', isPrivate: true, title: 'NDA' });
      await setDoc(doc(db, 'reference_clips/publicClip'), { creatorId: 'pro1', isPrivate: false, title: 'Walk' });
    });
  });

  const board = (ownerId: string, isPrivate: boolean) => ({ ownerId, isPrivate, title: 'T', clipCount: 0, followerCount: 0 });

  it('free users can create public boards but not private ones', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'reference_boards/n1'), board('alice', false)));
    await assertFails(setDoc(doc(alice(), 'reference_boards/n2'), board('alice', true)));
  });

  it('free users cannot flip a public board to private', async () => {
    await assertFails(updateDoc(doc(alice(), 'reference_boards/alicePublic'), { isPrivate: true }));
  });

  it('Pro and SJSU users can create private boards', async () => {
    const pro = env.authenticatedContext('pro1').firestore();
    const sam = env.authenticatedContext('sam').firestore();
    await assertSucceeds(setDoc(doc(pro, 'reference_boards/p1'), board('pro1', true)));
    await assertSucceeds(setDoc(doc(sam, 'reference_boards/s1'), board('sam', true)));
  });

  it('a canceled subscription is not Pro, but existing private boards stay editable', async () => {
    const lapsed = env.authenticatedContext('lapsed').firestore();
    await assertFails(setDoc(doc(lapsed, 'reference_boards/l2'), board('lapsed', true)));
    await assertSucceeds(updateDoc(doc(lapsed, 'reference_boards/lapsedPrivate'), { title: 'Renamed' }));
  });

  it('boards cannot be created for someone else', async () => {
    await assertFails(setDoc(doc(alice(), 'reference_boards/n3'), board('sam', false)));
  });

  it('free users cannot create private clips; Pro users can', async () => {
    const pro = env.authenticatedContext('pro1').firestore();
    await assertFails(setDoc(doc(alice(), 'reference_clips/c1'), { creatorId: 'alice', isPrivate: true, title: 'x' }));
    await assertSucceeds(setDoc(doc(alice(), 'reference_clips/c2'), { creatorId: 'alice', isPrivate: false, title: 'x' }));
    await assertSucceeds(setDoc(doc(pro, 'reference_clips/c3'), { creatorId: 'pro1', isPrivate: true, title: 'x' }));
  });

  it('private clips are readable only by their creator', async () => {
    const pro = env.authenticatedContext('pro1').firestore();
    const anon = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(pro, 'reference_clips/privateClip')));
    await assertFails(getDoc(doc(alice(), 'reference_clips/privateClip')));
    await assertFails(getDoc(doc(anon, 'reference_clips/privateClip')));
    await assertSucceeds(getDoc(doc(anon, 'reference_clips/publicClip')));
  });

  it('clip list queries work when filtered the way the app filters them', async () => {
    const anon = env.unauthenticatedContext().firestore();
    const pro = env.authenticatedContext('pro1').firestore();
    // getPublicReferenceClips
    await assertSucceeds(getDocs(query(collection(anon, 'reference_clips'), where('isPrivate', '==', false), limit(10))));
    // getUserReferenceClips(creatorId) as a visitor, and with private as the owner
    await assertSucceeds(getDocs(query(collection(alice(), 'reference_clips'), where('creatorId', '==', 'pro1'), where('isPrivate', '==', false))));
    await assertSucceeds(getDocs(query(collection(pro, 'reference_clips'), where('creatorId', '==', 'pro1'))));
    // An unfiltered list could expose private clips, so it is refused.
    await assertFails(getDocs(query(collection(anon, 'reference_clips'), limit(10))));
  });
});

describe('counters and social writes', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'videos/v1'), { title: 'Walk', uploaderId: 'sam', likeCount: 3, viewCount: 10 });
      await setDoc(doc(db, 'reference_boards/samBoard'), { ownerId: 'sam', isPrivate: false, title: 'S', clipCount: 0, followerCount: 2 });
    });
  });

  it('a like moves likeCount by exactly one and touches nothing else', async () => {
    await assertSucceeds(updateDoc(doc(alice(), 'videos/v1'), { likeCount: 4 }));
    await assertFails(updateDoc(doc(alice(), 'videos/v1'), { likeCount: 50 }));
    await assertFails(updateDoc(doc(alice(), 'videos/v1'), { likeCount: 4, title: 'hacked' }));
  });

  it('anyone may bump the view counter by one', async () => {
    const anon = env.unauthenticatedContext().firestore();
    await assertSucceeds(updateDoc(doc(anon, 'videos/v1'), { viewCount: 11 }));
    await assertFails(updateDoc(doc(anon, 'videos/v1'), { viewCount: 99 }));
  });

  it('non-owners cannot take over a board via a counter field', async () => {
    await assertFails(updateDoc(doc(alice(), 'reference_boards/samBoard'), { ownerId: 'alice', updatedAt: 1 }));
    await assertFails(updateDoc(doc(alice(), 'reference_boards/samBoard'), { followerCount: 3 }));
  });

  it('follows: own follow doc plus a +1 counter in one batch', async () => {
    const db = alice();
    const batch = writeBatch(db);
    batch.set(doc(db, 'reference_board_follows/samBoard_alice'), { boardId: 'samBoard', userId: 'alice' });
    batch.update(doc(db, 'reference_boards/samBoard'), { followerCount: 3 });
    await assertSucceeds(batch.commit());
    await assertFails(setDoc(doc(db, 'reference_board_follows/samBoard_sam'), { boardId: 'samBoard', userId: 'sam' }));
  });

  it('only the board owner can add clips to it', async () => {
    await assertFails(setDoc(doc(alice(), 'reference_board_saves/samBoard_c1'), { boardId: 'samBoard', clipId: 'c1', ownerId: 'alice' }));
    const sam = env.authenticatedContext('sam').firestore();
    await assertSucceeds(setDoc(doc(sam, 'reference_board_saves/samBoard_c1'), { boardId: 'samBoard', clipId: 'c1', ownerId: 'sam' }));
  });
});
