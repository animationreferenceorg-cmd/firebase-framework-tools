import { UserProfile } from "./types";
import { getEntitlements, resolveAccessLevel, type AccessLevel } from "./plans";

// Limits and tier rules live in src/lib/plans.ts; this keeps the older
// checkLimit() call sites working.

export type UserTier = AccessLevel;

export function getUserTier(user: UserProfile | null): UserTier {
    return resolveAccessLevel(user);
}

export function checkLimit(user: UserProfile | null, type: 'moodboards' | 'likes', currentCount: number): { allowed: boolean, limit: number, nextTier?: UserTier } {
    const { access, limits } = getEntitlements(user);
    const limit = type === 'moodboards' ? limits.maxBoards : limits.maxSavedReferences;

    return {
        allowed: currentCount < limit,
        limit,
        // Every upgrade path now leads to Pro; legacy tiers are not sold.
        nextTier: limit === Infinity ? undefined : access === 'free' || access === 'tier1' || access === 'tier2' ? 'pro' : undefined,
    };
}
