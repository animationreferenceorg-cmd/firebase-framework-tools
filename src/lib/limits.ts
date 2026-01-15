import { UserProfile } from "./types";

export type UserTier = 'free' | 'tier1' | 'tier2' | 'tier5' | 'admin';

export interface TierLimits {
    maxMoodboards: number;
    maxLikes: number;
}

export const TIER_LIMITS: Record<UserTier, TierLimits> = {
    'free': {
        maxMoodboards: 1,
        maxLikes: 5
    },
    'tier1': { // $1 Supporter
        maxMoodboards: 3,
        maxLikes: 10
    },
    'tier2': { // $2 Super Fan
        maxMoodboards: 6,
        maxLikes: 20
    },
    'tier5': { // $5 Pro
        maxMoodboards: Infinity,
        maxLikes: Infinity
    },
    'admin': {
        maxMoodboards: Infinity,
        maxLikes: Infinity
    }
};

export function getUserTier(user: UserProfile | null): UserTier {
    if (!user) return 'free';
    if (user.role === 'admin') return 'admin';
    return user.tier || ('free' as UserTier); // Default to free if undefined
}

export function checkLimit(user: UserProfile | null, type: 'moodboards' | 'likes', currentCount: number): { allowed: boolean, limit: number, nextTier?: UserTier } {
    const tier = getUserTier(user);
    const limits = TIER_LIMITS[tier];

    let limit = 0;
    if (type === 'moodboards') limit = limits.maxMoodboards;
    if (type === 'likes') limit = limits.maxLikes;

    return {
        allowed: currentCount < limit,
        limit,
        nextTier: getNextTier(tier)
    };
}

function getNextTier(current: UserTier): UserTier | undefined {
    if (current === 'free') return 'tier1';
    if (current === 'tier1') return 'tier2';
    if (current === 'tier2') return 'tier5';
    return undefined;
}
