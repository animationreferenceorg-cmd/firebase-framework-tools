

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string; // For landscape hero/background images
  posterUrl: string; // For vertical card posters
  videoUrl: string;
  dataAiHint?: string;
  tags: string[];
  categoryIds?: string[]; // For main videos
  categories?: string[]; // For short films
  isShort?: boolean;
}

export interface Category {
  id: string;
  title: string;
  description: string;
  tags: string[];
  href: string;
  status: 'draft' | 'published';
  imageUrl: string;
  videoUrl?: string;
  featuredVideoId?: string;
  hint?: string;
  sortIndex?: number;
}

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: 'admin' | 'user';
    likedVideoIds?: string[];
    likedCategoryTitles?: string[];
    savedShortIds?: string[];
    recentlyViewedShortIds?: string[];
}

export interface Tag {
  id: string;
  name: string;
}
