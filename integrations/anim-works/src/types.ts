/**
 * Animation Reference Partner API - response types.
 * Mirrors the server exactly. No dependencies.
 */

export interface ArefTag {
  name: string;
  slug: string;
  /** Canonical page for this tag on animationreference.org. */
  url: string;
}

export interface ArefVideo {
  id: string;
  title: string;
  description: string;
  /** Canonical page on animationreference.org. Link here for attribution. */
  url: string;
  thumbnailUrl: string;
  posterUrl: string;
  tags: ArefTag[];
  categoryIds: string[];
  durationSeconds?: number;
  fps?: number;
  width?: number;
  height?: number;
  credit: {
    /** Original creator, when known. Display this wherever the video appears. */
    name: string | null;
    /** The creator's own post, when known. Link it if your layout allows. */
    sourceUrl: string | null;
  };
  publishedAt: string | null;
  /**
   * Direct media file. Present only for keys holding the `media:stream` scope.
   * Treat as short-lived: resolve it when you need it, never store it.
   */
  streamUrl?: string;
}

export interface ArefCategory {
  id: string;
  slug: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  videoCount: number;
}

export interface ArefTagSummary {
  name: string;
  slug: string;
  videoCount: number;
  url: string;
}

export interface ArefPagination {
  limit: number;
  total: number;
  /** Pass back as `cursor`. Opaque - never parse or construct one. */
  nextCursor: string | null;
}

export interface ArefPage<T> {
  data: T[];
  pagination: ArefPagination;
}

export interface ArefVideoDetail {
  data: ArefVideo;
  related: ArefVideo[];
}

export interface ArefStatus {
  apiVersion: string;
  partner: string;
  keyId: string;
  scopes: string[];
  rateLimit: { limit: number; remaining: number; resetAt: string };
  library: { videoCount: number };
}

/** A reference a user pushed to you from animationreference.org. */
export interface ArefHandoff {
  video: ArefVideo;
  user: {
    /**
     * Stable pseudonym for this user, scoped to your key. The same person
     * always yields the same id, but it reveals nothing about their identity.
     * Use it to group repeat handoffs; it is not an email or a name.
     */
    id: string;
  };
  createdAt: string | null;
}

export interface ArefVideoQuery {
  /** Free text over title, description and tags. */
  q?: string;
  /** Tag name or slug, e.g. "body-mechanics". */
  tag?: string;
  /** Category id or slug. */
  category?: string;
  minDuration?: number;
  maxDuration?: number;
  sort?: 'newest' | 'oldest' | 'relevance';
  /** 1-100, default 24. */
  limit?: number;
  cursor?: string | null;
}

export type ArefErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'REVOKED_API_KEY'
  | 'EXPIRED_API_KEY'
  | 'SCOPE_REQUIRED'
  | 'RATE_LIMITED'
  | 'INVALID_CURSOR'
  | 'VIDEO_NOT_FOUND'
  | 'CATEGORY_NOT_FOUND'
  | 'INVALID_TOKEN'
  | 'TOKEN_NOT_FOUND'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_ALREADY_USED'
  | 'VIDEO_UNAVAILABLE'
  | 'INTERNAL_ERROR';
