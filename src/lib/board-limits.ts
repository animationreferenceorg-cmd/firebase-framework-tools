import { getEntitlements, type EntitlementProfile } from './plans';

/**
 * Plan rules for creating a board. A user's boards live in two places that
 * share ids (reference_boards and users/{uid}/moodboards), so the count is the
 * union of both, not either list alone.
 */

export type BoardCreationBlock = 'board_limit' | 'private_requires_pro';

export interface BoardCreationDecision {
  allowed: boolean;
  block?: BoardCreationBlock;
  limit: number;
}

export function evaluateBoardCreation(
  profile: EntitlementProfile | null | undefined,
  existingBoardIds: Iterable<string>,
  wantsPrivate: boolean,
): BoardCreationDecision {
  const { isPro, limits } = getEntitlements(profile);
  const count = new Set(existingBoardIds).size;
  if (count >= limits.maxBoards) return { allowed: false, block: 'board_limit', limit: limits.maxBoards };
  if (wantsPrivate && !isPro) return { allowed: false, block: 'private_requires_pro', limit: limits.maxBoards };
  return { allowed: true, limit: limits.maxBoards };
}

/** Thrown by assertCanCreateBoard; callers show the matching upgrade prompt. */
export class BoardCreationBlockedError extends Error {
  constructor(public block: BoardCreationBlock) {
    super(block === 'board_limit' ? 'You’ve reached your plan’s board limit.' : 'Private boards are a Pro feature.');
    this.name = 'BoardCreationBlockedError';
  }
}

/** Loads the user's boards from both stores and throws BoardCreationBlockedError if creation isn't allowed. */
export async function assertCanCreateBoard(
  profile: (EntitlementProfile & { uid: string }) | null | undefined,
  wantsPrivate: boolean,
): Promise<void> {
  if (!profile?.uid) return;
  // Imported lazily so the pure rules above stay usable (and testable) without Firebase.
  const [{ getUserReferenceBoards }, { MoodboardService }] = await Promise.all([
    import('./reference-service'),
    import('./moodboard-service'),
  ]);
  const [referenceBoards, moodboards] = await Promise.all([
    getUserReferenceBoards(profile.uid, true),
    MoodboardService.getMoodboards(profile.uid),
  ]);
  const decision = evaluateBoardCreation(profile, [...referenceBoards.map((b) => b.id), ...moodboards.map((m) => m.id)], wantsPrivate);
  if (!decision.allowed && decision.block) throw new BoardCreationBlockedError(decision.block);
}
