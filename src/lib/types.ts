

export interface Video {
  id: string;
  type?: 'video' | 'social'; // 'social' covers Instagram, TikTok, etc.
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
  status?: 'draft' | 'published';
  folderId?: string;
}

export interface Folder {
  id: string;
  name: string;
  createdAt?: any;
}

export interface Category {
  id: string;
  slug?: string;
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
  isPremium?: boolean;
  tier?: 'free' | 'tier1' | 'tier2' | 'tier5' | 'admin'; // Added tier
  stripeCustomerId?: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface LocalImage {
  id: string;
  blob: Blob; // Not stored in JSON, but useful for runtime
  url?: string; // Object URL for display
  width?: number;
  height?: number;
  createdAt: number;
}

export interface MoodboardItem {
  id: string;
  type: 'video' | 'image' | 'note'; // Added 'note'
  videoId?: string | null;
  imageUrl?: string | null;
  text?: string; // Content for notes
  videoData?: Video;
  x: number;
  y: number;
  width?: number; // Important for resizing notes
  height?: number;
  color?: string; // Optional: sticky note color
  rotation?: number;
  zIndex?: number;
}

export interface Moodboard {
  id: string;
  userId: string;
  name: string;
  items: MoodboardItem[];
  thumbnailUrl?: string; // Cover image for the moodboard
  updatedAt: any;
}


