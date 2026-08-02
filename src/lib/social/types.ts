export type SocialPlatform = 'instagram' | 'twitter' | 'linkedin' | 'facebook';

export interface PlatformCaptionOptions {
  title: string;
  description?: string;
  authorName?: string;
  tags?: string[];
  videoUrl?: string;
  pageUrl?: string;
}

export interface PostRequest {
  videoId: string;
  platforms: SocialPlatform[];
  customCaptions?: Partial<Record<SocialPlatform, string>>;
}

export interface PostResult {
  platform: SocialPlatform;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export interface SocialPostLog {
  id?: string;
  videoId: string;
  videoTitle: string;
  postedAt: any;
  platforms: SocialPlatform[];
  results: PostResult[];
  triggeredBy: 'manual' | 'bot';
}

export interface SocialPlatformConfig {
  instagram: {
    enabled: boolean;
    hasCredentials: boolean;
    accountId?: string;
  };
  twitter: {
    enabled: boolean;
    hasCredentials: boolean;
  };
  linkedin: {
    enabled: boolean;
    hasCredentials: boolean;
  };
}

export interface BotScheduleConfig {
  enabled: boolean;
  postsPerDay: number;
  timeSlots: string[]; // e.g. ["10:00", "16:00"]
  lastRunAt?: string;
}
