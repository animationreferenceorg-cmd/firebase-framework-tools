'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Play, 
  Film, 
  Upload, 
  Bookmark, 
  Heart, 
  Sparkles, 
  Flame,
  Layers,
  Filter,
  PlayCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSnapshotVideos } from '@/lib/videoSnapshot';
import { useUser } from '@/hooks/use-user';
import { VideoCard } from '@/components/VideoCard';
import type { Video } from '@/lib/types';

export interface ReferenceVideoItem {
  id: string;
  title: string;
  category?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  isLiked?: boolean;
  isSaved?: boolean;
}

const CURATED_REFERENCES: ReferenceVideoItem[] = [
  {
    id: 'ref-1',
    title: 'Character Walk & Weight Locomotion',
    category: 'LOCOMOTION',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    isLiked: true,
  },
  {
    id: 'ref-2',
    title: 'Sword Attack & Combat Reaction',
    category: 'COMBAT',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80',
    isLiked: true,
  },
  {
    id: 'ref-3',
    title: 'Dynamic Acrobat Jump & Arc',
    category: 'ACTING',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    isLiked: true,
  },
  {
    id: 'ref-4',
    title: 'Creature Quadruped Run Cycle',
    category: 'CREATURE',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyflights.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
    isLiked: true,
  },
];

interface ReferenceVideoModalProps {
  onSelectVideo: (video: ReferenceVideoItem) => void;
  onClose: () => void;
}

export function ReferenceVideoModal({ onSelectVideo, onClose }: ReferenceVideoModalProps) {
  const { userProfile } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<ReferenceVideoItem[]>(CURATED_REFERENCES);
  const [activeTab, setActiveTab] = useState<string>('LIKED');

  useEffect(() => {
    getSnapshotVideos().then((snapVideos) => {
      if (snapVideos && snapVideos.length > 0) {
        const likedIds = new Set<string>([
          ...(userProfile?.likedVideoIds || []),
          ...JSON.parse(localStorage.getItem('anim_liked_videos') || '[]'),
        ]);

        const savedIds = new Set<string>([
          ...(userProfile?.savedVideoIds || []),
          ...JSON.parse(localStorage.getItem('anim_bookmarks') || '[]'),
        ]);

        const formattedSnap: ReferenceVideoItem[] = snapVideos.map((v: any) => ({
          id: v.id,
          title: v.title || 'Animation Reference',
          category: (v.category || 'COMMUNITY').toUpperCase(),
          videoUrl: v.videoUrl || v.video_url || '',
          thumbnailUrl: v.thumbnailUrl || v.thumbnail_url || '',
          isLiked: likedIds.has(v.id),
          isSaved: savedIds.has(v.id),
        })).filter(v => !!v.videoUrl);

        const combined = [...CURATED_REFERENCES, ...formattedSnap];
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        setVideos(unique);
      }
    });
  }, [userProfile?.likedVideoIds, userProfile?.savedVideoIds]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const customRef: ReferenceVideoItem = {
      id: `local-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      category: 'LOCAL IMPORT',
      videoUrl: url,
      isLiked: true,
    };
    onSelectVideo(customRef);
    onClose();
  };

  const tabs = [
    { id: 'LIKED', label: 'Liked References', icon: Heart },
    { id: 'SAVED', label: 'Saved Bookmarks', icon: Bookmark },
    { id: 'ALL', label: 'All References', icon: Film },
    { id: 'LOCOMOTION', label: 'Locomotion', icon: Sparkles },
    { id: 'COMBAT', label: 'Combat', icon: Flame },
    { id: 'LOCAL IMPORT', label: 'Local Files', icon: Upload },
  ];

  const filteredVideos = videos.filter((v) => {
    const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.category && v.category.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'LIKED') return v.isLiked || v.id.startsWith('ref-');
    if (activeTab === 'SAVED') return v.isSaved || v.isLiked;
    if (activeTab === 'ALL') return true;
    return v.category?.includes(activeTab);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 sm:p-8 animate-in fade-in duration-150">
      
      <div className="w-full max-w-6xl bg-[#12121a]/95 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.95)] flex flex-col gap-6 max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-xl shadow-purple-600/40 border border-purple-400/30">
              <Heart className="h-6 w-6 text-white fill-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-wide">Your Liked Animation References</h2>
              <p className="text-xs text-zinc-400">Select any of your saved reference videos to import into your canvas tracing player</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Controls & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
          
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search your liked reference library by title or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500 transition-all shadow-inner"
            />
          </div>

          {/* Local File Upload Button */}
          <label className="h-11 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-lg shadow-purple-600/30 transition-all cursor-pointer shrink-0 w-full sm:w-auto border border-purple-400/30">
            <Upload className="h-4 w-4" />
            <span>Upload MP4 / WebM</span>
            <input type="file" accept="video/mp4,video/webm" onChange={handleFileUpload} className="hidden" />
          </label>

        </div>

        {/* Category & Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 shrink-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 border flex items-center gap-2",
                activeTab === id 
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/40 border-purple-400/50 scale-105" 
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border-white/5"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", id === 'LIKED' && activeTab === 'LIKED' && "fill-white")} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Home-Screen Style Video Cards Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 scrollbar-none">
          {filteredVideos.map((video) => {
            const videoObj: Video = {
              id: video.id,
              title: video.title,
              description: '',
              videoUrl: video.videoUrl,
              thumbnailUrl: video.thumbnailUrl || '',
              posterUrl: video.thumbnailUrl || '',
              tags: [],
              likeCount: video.isLiked ? 1 : 0,
              type: 'video',
            };

            return (
              <div
                key={video.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectVideo(video);
                  onClose();
                }}
                className="cursor-pointer group hover:scale-[1.02] transition-transform duration-200"
              >
                <VideoCard 
                  video={videoObj} 
                  onSelect={() => {
                    onSelectVideo(video);
                    onClose();
                  }}
                />
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
