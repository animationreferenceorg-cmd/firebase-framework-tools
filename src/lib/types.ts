

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
  uploader?: string;
  originalUrl?: string;
  fps?: number;
  duration?: number;
  width?: number;
  height?: number;
  createdAt?: any;
  updatedAt?: any;
  author_name?: string;
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
  longDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'user';
  likedVideoIds?: string[];
  likedCategoryTitles?: string[];
  likedCategoryIds?: string[];
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
  type: 'video' | 'image' | 'note' | 'text' | 'shape' | 'drawing' | 'connection';
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
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'arrow-right';
  borderColor?: string;
  borderWidth?: number;
  fontSize?: number;
  textColor?: string;
  points?: Array<{ x: number; y: number }>;
  fromItem?: string;
  toItem?: string;
}

export interface Moodboard {
  id: string;
  userId: string;
  name: string;
  items: MoodboardItem[];
  thumbnailUrl?: string; // Cover image for the moodboard
  updatedAt: any;
}

export interface PortfolioProject {
  id: string;
  type: 'video' | 'image';
  title: string;
  description?: string;
  url: string;           // uploaded video file or image URL
  poster?: string;       // poster frame for videos
  videoDocId?: string;   // matching doc in the videos collection
}

export interface Portfolio {
  id: string;            // == ownerId (one portfolio per user)
  ownerId: string;
  username: string;      // unique URL slug, e.g. /p/username
  displayName: string;
  headline?: string;     // e.g. "Gameplay Animator — Combat & Locomotion"
  bio?: string;
  location?: string;
  email?: string;        // public contact email (optional)
  availableForWork?: boolean;
  avatarUrl?: string;
  coverUrl?: string;     // banner image
  accent?: string;       // hex accent color
  skills?: string[];     // e.g. ["Maya", "Combat Animation", "Motion Matching"]
  socialLinks?: { platform: string; url: string }[];
  reel?: { url: string; poster?: string; title?: string; videoDocId?: string };
  projects: PortfolioProject[];
  published: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  status: 'draft' | 'published';
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
  videoIds?: string[];
  createdAt: any;
  updatedAt: any;
  author?: string;
}
