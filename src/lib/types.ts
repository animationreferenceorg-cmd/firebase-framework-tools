

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
  likeCount?: number;
  viewCount?: number;
  isPortfolio?: boolean;
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
  savedVideoIds?: string[];
  recentlyViewedShortIds?: string[];
  isPremium?: boolean;
  tier?: 'free' | 'tier1' | 'tier2' | 'tier5' | 'admin' | 'student_unlimited'; // Added tier
  isStudent?: boolean;
  isVIP?: boolean;
  unlimitedAccess?: boolean;
  school?: string;
  studentEmail?: string;
  grantedAt?: string;
  stripeCustomerId?: string;
  headline?: string;
  username?: string;
  bio?: string;
  bannerUrl?: string;
  profilePattern?: string;
  profileBgColor?: string;
  profileCardTint?: string;
  profileCardBgUrl?: string;
  avatarGlow?: string;
  websiteUrl?: string;
  artstationUrl?: string;
  youtubeUrl?: string;
  vimeoUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  customPortfolioCategories?: string[];
}

export type ClipSourcePlatform = 'youtube' | 'vimeo' | 'x' | 'tiktok' | 'instagram' | 'web' | 'upload' | 'library';

export interface ReferenceClip {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorUsername?: string;
  creatorAvatar?: string;
  sourceUrl: string;
  sourcePlatform: ClipSourcePlatform;
  sourceVideoId?: string;
  sourceAuthorName?: string;
  sourceAuthorUrl?: string;
  sourceAuthorAvatar?: string;
  sourceDescription?: string;
  uploadedMediaUrl?: string;
  storagePath?: string;
  mediaType?: 'video' | 'image' | 'gif';
  mimeType?: string;
  thumbnailUrl?: string;
  captureStatus?: 'queued' | 'processing' | 'ready' | 'failed';
  captureStage?: string;
  captureProgress?: number;
  syncError?: string;
  bunnySyncStatus?: 'pending' | 'ready' | 'failed';
  externalBunnyId?: string;
  startTime: number;
  endTime: number;
  title: string;
  category: string;
  tags: string[];
  visualTags?: string[];
  palette?: string[];
  paletteBuckets?: string[];
  isPrivate: boolean;
  /** Explicit opt-in for the Community feed. Personal captures default to false. */
  communityVisible?: boolean;
  /** Set when a creator removes a clip from their library; the record is retained. */
  removedFromCreatorAt?: any;
  primaryBoardId?: string;
  saveCount: number;
  createdAt: any;
  updatedAt: any;
}

export interface ReferenceBoard {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerUsername?: string;
  ownerAvatar?: string;
  title: string;
  slug: string;
  description?: string;
  coverUrl?: string;
  isPrivate: boolean;
  clipCount: number;
  followerCount: number;
  duplicatedFromId?: string;
  createdAt: any;
  updatedAt: any;
}

export interface BoardSave {
  id: string;
  boardId: string;
  clipId: string;
  ownerId: string;
  createdAt: any;
}

export interface BoardFollow {
  id: string;
  boardId: string;
  userId: string;
  createdAt: any;
}

export interface ShotBreakdown {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerUsername?: string;
  ownerAvatar?: string;
  slug: string;
  title: string;
  description?: string;
  referenceClipId: string;
  finishedMediaUrl: string;
  finishedMediaType: 'video' | 'image';
  notes: string;
  isPublic: boolean;
  createdAt: any;
  updatedAt: any;
}

export type WipStage = 'concept' | 'blocking' | 'splining' | 'polish' | 'cleanup' | 'completed';

export interface PortfolioItem {
  id: string;
  userId: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  description?: string;
  type: 'portfolio' | 'wip';
  category?: string;
  wipStage?: WipStage;
  mediaType: 'video_file' | 'video_url' | 'image' | 'gif';
  mediaUrl: string;
  thumbnailUrl?: string;
  tags: string[];
  software: string[];
  likesCount?: number;
  viewsCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  likedBy?: string[];
  sortIndex?: number;
  isFeatured?: boolean;
  createdAt: any;
  updatedAt: any;
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
  description?: string;
  itemCount?: number;
  isPrivate?: boolean;
  createdAt?: any;
  updatedAt: any;
}

export type ProjectPhase = 'development' | 'pre_production' | 'in_production' | 'post_production' | 'completed';
export type ShotStatus = 'concept' | 'storyboard' | 'layout' | 'blocking' | 'splining' | 'polish' | 'rendered' | 'approved';

// Curated film + game industry role taxonomy — used as suggestions (not
// enforced) for open-role titles and crew member roles, so a project's
// roster reads like a real production rather than freeform text.
export const PRODUCTION_ROLES = [
  'Director', 'Producer', 'Writer', 'Storyboard Artist', '2D Animator', '3D Animator',
  'Character Rigger', 'Modeler', 'Texture Artist', 'Lighting Artist', 'Compositor',
  'VFX Artist', 'Editor', 'Sound Designer', 'Composer', 'Voice Actor',
  'Game Designer', 'Level Designer', 'Gameplay Programmer', 'Tools Programmer',
  'Technical Artist', 'UI/UX Artist', 'Concept Artist', 'QA Tester', 'Community Manager', 'Other',
] as const;

export const DEFAULT_ONBOARDING_STEPS = [
  'Read the project brief',
  'Review the style/reference guide',
  'Join the crew chat',
  'Set up your pipeline software',
];

export interface AnimationProject {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  title: string;
  slug: string;
  logline: string;
  description?: string;
  genre: string[];
  format: 'short_film' | 'series' | 'game_cinematic' | 'commercial' | 'game' | 'demo_reel';
  phase: ProjectPhase;
  coverImageUrl?: string;
  bannerUrl?: string;
  fps: number;
  isPublic: boolean; // visible on /productions and to non-crew viewers at all
  isRecruiting: boolean; // shows on the public showcase with open roles
  openRoles: Array<{ id: string; title: string; description?: string; filled: boolean }>;
  teamMemberIds: string[]; // flattened uids for `array-contains` "my crew projects" queries
  onboardingSteps: Array<{ id: string; text: string }>; // owner-defined checklist template
  departments: Department[];
  createdAt: any;
  updatedAt: any;
}

export interface Department {
  id: string;
  name: string;
  color: string; // hex, used for the tag on task cards/rows and crew roster
}

/** Sensible starting departments by production format — editable afterward,
 * this just saves a blank-page problem when setting up a new production. */
export const DEFAULT_DEPARTMENTS: Record<'film' | 'game', Omit<Department, 'id'>[]> = {
  film: [
    { name: 'Story', color: '#f472b6' },
    { name: 'Art & Design', color: '#fb923c' },
    { name: 'Animation', color: '#a855f7' },
    { name: 'Lighting & Render', color: '#38bdf8' },
    { name: 'Sound', color: '#4ade80' },
    { name: 'Production', color: '#facc15' },
  ],
  game: [
    { name: 'Design', color: '#f472b6' },
    { name: 'Art', color: '#fb923c' },
    { name: 'Programming', color: '#a855f7' },
    { name: 'Sound', color: '#4ade80' },
    { name: 'QA', color: '#38bdf8' },
    { name: 'Production', color: '#facc15' },
  ],
};

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskReviewStatus = 'in_progress' | 'submitted' | 'approved' | 'changes_requested';

export const SHOT_STATUS_ORDER: ShotStatus[] = ['concept', 'storyboard', 'layout', 'blocking', 'splining', 'polish', 'rendered', 'approved'];

export interface ProductionTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: ShotStatus;
  priority: TaskPriority;
  reviewStatus: TaskReviewStatus;
  departmentId?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  dueDate?: string;
  submissionNote?: string;
  createdAt: any;
  updatedAt: any;
}

export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: any;
}

export interface CrewMember {
  userId: string;
  name: string;
  avatar?: string;
  role: string;
  departmentId?: string;
  joinedAt: any;
  completedSteps: string[];
  status: 'active' | 'removed';
}

export interface CrewApplication {
  id: string;
  projectId: string;
  projectTitle: string;
  projectCoverImageUrl?: string;
  applicantId: string;
  applicantName: string;
  applicantAvatar?: string;
  roleId?: string;
  roleTitle?: string;
  message: string;
  portfolioUrl?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
  respondedAt?: any;
}

export const MESSAGE_REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '👀', '🤔'];

export interface ProjectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  createdAt: any;
  parentMessageId?: string; // set when this message is a threaded reply
  reactions?: Record<string, string[]>; // emoji -> userIds who reacted
  linkedTaskId?: string; // set when "Create Task" was used on this message
  linkedTaskTitle?: string;
  resolved?: boolean; // top-level messages only — marks a thread/discussion settled
  resolvedByName?: string;
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
