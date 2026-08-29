"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Upload, Link as LinkIcon, Plus, X, Layers, Sparkles, Film, Image as ImageIcon, Hash, ArrowRight, ArrowLeft, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import type { PortfolioItem, WipStage } from '@/lib/types';
import { createPortfolioItem, generateAutoThumbnail } from '@/lib/portfolio-service';

interface UploadPortfolioItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  authorName: string;
  authorAvatar?: string;
  onItemCreated: (newItem: PortfolioItem) => void;
}

const ALL_TAG_SUGGESTIONS = [
  'Body Mechanics', 'Acting', 'Facial', 'Lip Sync', 'Creature', 
  'Walk Cycle', 'Run Cycle', 'Combat / Action', 'Physics & Weight', 'Biped', 'Quadruped',
  'Locomotion', 'Parkour', 'Stagger / Fall', 'Martial Arts', 'Sword Fight',
  'Push & Pull', 'Heavy Lifting', 'Monster', 'Dragon', 'Bird Flight',
  '2D Animation', '3D Animation', 'Stop Motion', 'Rigging', 'Modeling',
  'VFX', 'Lighting', 'LookDev', 'Concept Art', 'Character Design', 'Storyboard',
  'Stylized', 'Realistic', 'Game Animation', 'Cinematic', 'Keyframe'
];

const PRESET_SOFTWARE = [
  'Maya', 'Blender', 'Unreal Engine', 'ToonBoom', 'TVPaint', 'ZBrush', 'Cinema 4D', 'Houdini'
];

interface HashtagAutoLookupProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

const HashtagAutoLookup: React.FC<HashtagAutoLookupProps> = ({
  selectedTags,
  onChange,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const query = inputValue.replace(/^#/, '').trim().toLowerCase();
  const suggestions = query
    ? ALL_TAG_SUGGESTIONS.filter(
        (t) =>
          t.toLowerCase().includes(query) &&
          !selectedTags.some((st) => st.toLowerCase() === t.toLowerCase())
      )
    : [];

  const addTag = (tagToAdd: string) => {
    const cleaned = tagToAdd.replace(/^#/, '').trim();
    if (!cleaned) return;
    if (!selectedTags.some((t) => t.toLowerCase() === cleaned.toLowerCase())) {
      onChange([...selectedTags, cleaned]);
    }
    setInputValue('');
    setIsOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(selectedTags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      if (suggestions.length > 0) {
        addTag(suggestions[0]);
      } else {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      {/* Selected Hashtag Badges */}
      <div className="flex flex-wrap gap-1 min-h-[26px]">
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-primary/20 text-primary border border-primary/40 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm"
          >
            <Hash className="h-2.5 w-2.5 opacity-70" />
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 hover:bg-primary/30 rounded-full p-0.5 transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>

      {/* Auto Lookup Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500">
          <Hash className="h-3.5 w-3.5" />
        </div>
        <Input
          type="text"
          placeholder="Type to search or add hashtag (e.g. Acting, Lip Sync)..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-8 bg-zinc-900 border-white/10 text-white text-xs h-8 focus:border-primary focus:ring-1 focus:ring-primary"
        />

        {/* Auto Lookup Dropdown Menu */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/15 rounded-xl shadow-2xl z-50 max-h-44 overflow-y-auto divide-y divide-white/5">
            <div className="px-2.5 py-1 text-[9px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/80">
              Matching Hashtags
            </div>
            {suggestions.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => addTag(sug)}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-200 hover:bg-primary/20 hover:text-white flex items-center justify-between transition-colors group"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Hash className="h-3 w-3 text-primary group-hover:scale-110 transition-transform" />
                  {sug}
                </span>
                <span className="text-[10px] text-zinc-400 group-hover:text-white">+ Add</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Suggestion Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pt-0.5 scrollbar-none">
        <span className="text-[10px] text-zinc-500 shrink-0 font-medium mr-0.5">Quick:</span>
        {ALL_TAG_SUGGESTIONS.slice(0, 6).map((tag) => {
          const isSelected = selectedTags.some((t) => t.toLowerCase() === tag.toLowerCase());
          return (
            <button
              key={tag}
              type="button"
              onClick={() => (isSelected ? removeTag(tag) : addTag(tag))}
              className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-all shrink-0 ${
                isSelected
                  ? 'bg-primary text-white border-primary font-semibold'
                  : 'bg-zinc-900/80 text-zinc-400 border-white/10 hover:border-white/25 hover:text-zinc-200'
              }`}
            >
              #{tag}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface VideoFrameScrubberProps {
  file: File;
  onFrameSelected: (frameFile: File, dataUrl: string) => void;
}

const VideoFrameScrubber: React.FC<VideoFrameScrubberProps> = ({ file, onFrameSelected }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);

  React.useEffect(() => {
    if (!file || !file.type.startsWith('video/')) return;
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const captureFrame = React.useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        canvas.toBlob((blob) => {
          if (blob) {
            const thumbFile = new File([blob], `thumb_${file.name.replace(/\.[^/.]+$/, "")}.jpg`, {
              type: 'image/jpeg'
            });
            onFrameSelected(thumbFile, dataUrl);
          }
        }, 'image/jpeg', 0.85);
      }
    } catch (e) {
      console.warn("Error capturing video frame:", e);
    }
  }, [file, onFrameSelected]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const dur = video.duration || 0;
    setDuration(dur);
    const initialTime = Math.min(0.5, dur * 0.1);
    video.currentTime = initialTime;
    setCurrentTime(initialTime);
  };

  const handleSeeked = () => {
    if (videoRef.current) {
      captureFrame(videoRef.current.currentTime);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const jumpToPercent = (pct: number) => {
    if (!duration) return;
    const target = duration * pct;
    setCurrentTime(target);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins.toString().padStart(2, '0')}:${secs.padStart(5, '0')}s`;
  };

  if (!file || !file.type.startsWith('video/')) return null;

  return (
    <div className="p-4 rounded-2xl bg-zinc-900/90 border border-purple-500/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-purple-400" />
          <span className="text-xs font-semibold text-purple-300">Slide to Choose Cover Keyframe</span>
        </div>
        <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30 text-[11px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </Badge>
      </div>

      {/* Video Preview Canvas Frame */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onSeeked={handleSeeked}
            muted
            playsInline
            className="w-full h-full object-contain pointer-events-none"
          />
        ) : (
          <div className="text-xs text-zinc-500">Loading video preview...</div>
        )}
      </div>

      {/* Slider Frame Scrubber */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Drag slider to pick keyframe</span>
          <span>{duration > 0 ? `${Math.round((currentTime / duration) * 100)}%` : '0%'}</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.02}
          value={currentTime}
          onChange={handleSliderChange}
          className="w-full accent-purple-500 bg-zinc-800 h-2 rounded-lg cursor-pointer"
        />
      </div>

      {/* Quick Jump Buttons */}
      <div className="flex items-center justify-between gap-2 text-xs pt-1">
        <span className="text-zinc-500 text-[11px]">Quick Jump:</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => jumpToPercent(0)}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition-colors"
          >
            Start
          </button>
          <button
            type="button"
            onClick={() => jumpToPercent(0.25)}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition-colors"
          >
            25%
          </button>
          <button
            type="button"
            onClick={() => jumpToPercent(0.5)}
            className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-medium transition-colors border border-purple-500/30"
          >
            50% Mid
          </button>
          <button
            type="button"
            onClick={() => jumpToPercent(0.75)}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition-colors"
          >
            75%
          </button>
        </div>
      </div>
    </div>
  );
};

export const UploadPortfolioItemModal: React.FC<UploadPortfolioItemModalProps> = ({
  open,
  onOpenChange,
  userId,
  authorName,
  authorAvatar,
  onItemCreated,
}) => {
  const { toast } = useToast();
  const { userProfile } = useUser();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [type, setType] = useState<'portfolio' | 'wip'>('portfolio');
  const [isFeatured, setIsFeatured] = useState<boolean>(true);
  const [wipStage, setWipStage] = useState<WipStage>('blocking');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (activeTab === 'upload' && !mediaFile) {
        toast({ title: 'File required', description: 'Please select a video, GIF, or image file to proceed.', variant: 'destructive' });
        return;
      }
      if (activeTab === 'url' && !videoUrlInput.trim()) {
        toast({ title: 'URL required', description: 'Please enter a video or image URL to proceed.', variant: 'destructive' });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!title.trim()) {
        toast({ title: 'Title required', description: 'Please enter a title for your work before proceeding.', variant: 'destructive' });
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Media files & URLs
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [autoThumbPreview, setAutoThumbPreview] = useState<string | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState('');

  // Tags & Software
  const [selectedTags, setSelectedTags] = useState<string[]>(['Body Mechanics']);
  const [customTagInput, setCustomTagInput] = useState('');
  
  const [selectedSoftware, setSelectedSoftware] = useState<string[]>(['Maya']);
  const [customSoftwareInput, setCustomSoftwareInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('Preparing animation...');

  // Auto Thumbnail Generation Effect
  React.useEffect(() => {
    let active = true;
    async function updateAutoThumb() {
      if (activeTab === 'upload' && mediaFile) {
        const thumb = await generateAutoThumbnail(mediaFile);
        if (!active) return;
        if (thumb instanceof File) {
          const url = URL.createObjectURL(thumb);
          setAutoThumbPreview(url);
        } else if (typeof thumb === 'string') {
          setAutoThumbPreview(thumb);
        } else {
          setAutoThumbPreview(null);
        }
      } else if (activeTab === 'url' && videoUrlInput.trim()) {
        const thumb = await generateAutoThumbnail(videoUrlInput);
        if (!active) return;
        if (typeof thumb === 'string') {
          setAutoThumbPreview(thumb);
        } else {
          setAutoThumbPreview(null);
        }
      } else {
        setAutoThumbPreview(null);
      }
    }
    updateAutoThumb();
    return () => {
      active = false;
    };
  }, [mediaFile, videoUrlInput, activeTab]);

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
      setCustomTagInput('');
    }
  };

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomSoftware = () => {
    const trimmed = customSoftwareInput.trim();
    if (trimmed && !selectedSoftware.includes(trimmed)) {
      setSelectedSoftware([...selectedSoftware, trimmed]);
      setCustomSoftwareInput('');
    }
  };

  const handleToggleSoftware = (sw: string) => {
    if (selectedSoftware.includes(sw)) {
      setSelectedSoftware(selectedSoftware.filter((s) => s !== sw));
    } else {
      setSelectedSoftware([...selectedSoftware, sw]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== 3) {
      handleNextStep();
      return;
    }
    if (!title.trim()) {
      toast({ title: 'Title required', description: 'Please enter a title for your work.', variant: 'destructive' });
      return;
    }

    if (activeTab === 'upload' && !mediaFile) {
      toast({ title: 'File required', description: 'Please select a video, GIF, or image file to upload.', variant: 'destructive' });
      return;
    }

    if (activeTab === 'url' && !videoUrlInput.trim()) {
      toast({ title: 'URL required', description: 'Please enter a video or image URL.', variant: 'destructive' });
      return;
    }

    const hasUnlimitedPortfolioPosts = userProfile?.role === 'admin' ||
      (userProfile?.isPremium === true && userProfile.tier === 'tier5');
    if (!hasUnlimitedPortfolioPosts) {
      try {
        const q = query(collection(db, 'portfolio_items'), where('userId', '==', userId));
        const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Limit check timeout")), 1800));
        const existingPosts = await Promise.race([getDocs(q), timeoutPromise]);
        if (existingPosts && existingPosts.size >= 3) {
          toast({
            title: 'Free portfolio limit reached',
            description: 'Free members can publish 3 portfolio posts. Upgrade to Pro for unlimited posts, private projects, and recruiter analytics.',
            variant: 'destructive',
          });
          return;
        }
      } catch {
        // Proceed gracefully if check times out or network is slow
      }
    }

    setIsSubmitting(true);
    setUploadProgress(15);
    setUploadStatusMsg('Preparing media & cover frame...');

    // Smooth continuous progress ticker
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev < 40) {
          setUploadStatusMsg('Optimizing media & generating cover thumbnail...');
          return prev + 4;
        } else if (prev < 75) {
          setUploadStatusMsg('Saving to portfolio storage...');
          return prev + 3;
        } else if (prev < 92) {
          setUploadStatusMsg('Syncing to local cache & profile link...');
          return prev + 1;
        }
        return prev;
      });
    }, 150);

    try {
      let mediaType: PortfolioItem['mediaType'] = 'video_file';
      const mediaUrl = videoUrlInput.trim();

      if (activeTab === 'upload' && mediaFile) {
        const isImage = mediaFile.type.startsWith('image/');
        const isGif = mediaFile.type === 'image/gif';
        mediaType = isGif ? 'gif' : isImage ? 'image' : 'video_file';
      } else {
        mediaType = 'video_url';
      }

      const newItem = await createPortfolioItem(
        {
          userId,
          authorName,
          authorAvatar,
          title: title.trim(),
          description: description.trim(),
          type,
          wipStage: type === 'wip' ? wipStage : 'completed',
          mediaType,
          mediaUrl,
          tags: selectedTags,
          software: selectedSoftware,
          isFeatured,
        },
        activeTab === 'upload' ? mediaFile : null,
        thumbnailFile
      );

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatusMsg('Published successfully!');
      
      // Short delay so user sees 100% completion glow before modal closes
      await new Promise((r) => setTimeout(r, 450));

      toast({ title: 'Success!', description: 'Your work has been published to your portfolio.' });

      // Reset form
      setTitle('');
      setDescription('');
      setMediaFile(null);
      setThumbnailFile(null);
      setVideoUrlInput('');
      setCurrentStep(1);

      onItemCreated(newItem);
      onOpenChange(false);
    } catch (error: any) {
      clearInterval(progressInterval);
      toast({
        title: 'Upload failed',
        description: error.message || 'An error occurred while uploading.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950/90 p-4 text-white shadow-[0_30px_90px_rgba(0,0,0,0.85)] ring-1 ring-purple-500/20 backdrop-blur-2xl sm:max-h-[92vh] sm:w-[94vw] sm:rounded-3xl sm:p-6 md:rounded-[32px]">
        
        {/* Instagram-style Top Story Segmented Progress Bar */}
        <div className="space-y-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => {
              const isCompleted = currentStep > step;
              const isCurrent = currentStep === step;
              return (
                <div
                  key={step}
                  onClick={() => {
                    if (step < currentStep) setCurrentStep(step);
                  }}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    step < currentStep ? 'cursor-pointer' : ''
                  } ${
                    isCompleted
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                      : isCurrent
                      ? 'bg-primary shadow-[0_0_10px_rgba(168,85,247,0.6)]'
                      : 'bg-zinc-800'
                  }`}
                />
              );
            })}
          </div>

          <DialogHeader className="p-0">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="flex min-w-0 items-start gap-2 pr-1 text-base font-bold leading-tight sm:items-center sm:text-xl">
                <Sparkles className="h-5 w-5 shrink-0 text-primary" />
                {currentStep === 1 && 'Step 1: Media & Cover Frame'}
                {currentStep === 2 && 'Step 2: Placement & Details'}
                {currentStep === 3 && 'Step 3: Hashtags & Software'}
              </DialogTitle>
              <Badge variant="outline" className="shrink-0 border-white/15 bg-zinc-900 text-[11px] font-mono text-zinc-300">
                {currentStep} of 3
              </Badge>
            </div>
            <DialogDescription className="text-xs text-zinc-400">
              {currentStep === 1 && 'Upload your animation file or video link & pick your keyframe thumbnail.'}
              {currentStep === 2 && 'Choose profile placement (Main Portfolio vs Works Grid) & enter details.'}
              {currentStep === 3 && 'Add auto-lookup hashtags and software tools used.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="py-2 space-y-4">
          
          {/* STEP 1 CARD: Media & Frame Scrubber */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-250">
              {/* Media Input Tabs */}
              <div className="space-y-2">
                <Label className="text-xs text-zinc-300 font-medium">Animation Media Source *</Label>
                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
                  <TabsList className="grid h-11 grid-cols-2 border border-white/10 bg-zinc-900">
                    <TabsTrigger value="upload" className="text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-white">
                      <Upload className="mr-1.5 h-4 w-4 sm:mr-2" />
                      <span className="sm:hidden">Upload File</span><span className="hidden sm:inline">File Upload (Video/GIF/Image)</span>
                    </TabsTrigger>
                    <TabsTrigger value="url" className="text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-white">
                      <LinkIcon className="mr-1.5 h-4 w-4 sm:mr-2" />
                      <span className="sm:hidden">Paste Link</span><span className="hidden sm:inline">Embed Link / Direct URL</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="pt-3">
                    <div className="rounded-2xl border-2 border-dashed border-white/15 bg-zinc-900/50 p-4 text-center transition-colors hover:border-primary/50 sm:p-6">
                      <input
                        type="file"
                        id="media-upload"
                        accept="video/mp4,video/webm,image/gif,image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setMediaFile(e.target.files[0]);
                          }
                        }}
                      />
                      <label htmlFor="media-upload" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <Film className="h-6 w-6" />
                        </div>
                        {mediaFile ? (
                          <div>
                            <p className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-[280px] md:max-w-[340px]">{mediaFile.name}</p>
                            <p className="text-xs text-zinc-400">{(mediaFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-white">Click to select MP4, WebM, GIF, or Image</p>
                            <p className="text-xs text-zinc-500">Maximum file size 100MB</p>
                          </>
                        )}
                      </label>
                    </div>
                  </TabsContent>

                  <TabsContent value="url" className="pt-3 space-y-2">
                    <Input
                      placeholder="https://youtube.com/watch?v=... or https://vimeo.com/... or MP4 link"
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      className="bg-zinc-900 border-white/10 text-white h-10 text-xs"
                    />
                    <p className="text-xs text-zinc-400">Paste YouTube, Vimeo, or direct video file link.</p>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Video Frame Scrubber for Video Uploads */}
              {activeTab === 'upload' && mediaFile && mediaFile.type.startsWith('video/') && (
                <VideoFrameScrubber
                  file={mediaFile}
                  onFrameSelected={(frameFile, dataUrl) => {
                    setThumbnailFile(frameFile);
                    setAutoThumbPreview(dataUrl);
                  }}
                />
              )}

              {/* Custom Thumbnail Upload & Auto Preview */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="thumbnail-upload" className="text-xs text-zinc-300 font-medium">Cover Thumbnail Keyframe</Label>
                  {autoThumbPreview && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs py-0.5">
                      ✨ Keyframe Selected
                    </Badge>
                  )}
                </div>

                {autoThumbPreview && (
                  <div className="flex items-center gap-4 p-3 rounded-2xl bg-zinc-900/80 border border-primary/20">
                    <img
                      src={autoThumbPreview}
                      alt="Thumbnail Preview"
                      className="w-24 h-14 object-cover rounded-xl border border-white/10 shadow-md"
                    />
                    <div className="text-xs space-y-0.5">
                      <p className="font-semibold text-white">Selected Cover Frame</p>
                      <p className="text-zinc-400 text-xs">Used as your post cover card across your profile.</p>
                    </div>
                  </div>
                )}

                <Input
                  id="thumbnail-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setThumbnailFile(e.target.files[0]);
                  }}
                  className="bg-zinc-900 border-white/10 text-white text-xs h-9 file:bg-zinc-800 file:text-white file:border-0 file:rounded-md file:text-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 2 CARD: Placement & Details */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-250">
              {/* Profile Placement Selection */}
              <div className="space-y-2">
                <Label className="text-xs text-zinc-300 font-medium">Profile Destination & Placement *</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setType('portfolio');
                      setIsFeatured(true);
                    }}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                      type === 'portfolio' && isFeatured
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold ring-1 ring-emerald-500/40'
                        : 'border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    <Sparkles className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-bold text-white">Main Portfolio</div>
                      <div className="text-xs opacity-75 mt-0.5 leading-snug">Feature in top main showcase banner & highlight reel.</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setType('wip');
                      setIsFeatured(false);
                    }}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                      type === 'wip' || !isFeatured
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-semibold ring-1 ring-amber-500/40'
                        : 'border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    <Layers className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-bold text-white">Works Grid Only</div>
                      <div className="text-xs opacity-75 mt-0.5 leading-snug">Add to general works & WIP grid without pinning to top banner.</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* WIP Stage Dropdown */}
              {type === 'wip' && (
                <div className="space-y-1.5">
                  <Label htmlFor="wip-stage" className="text-xs text-zinc-300 font-medium">WIP Stage</Label>
                  <Select value={wipStage} onValueChange={(val: WipStage) => setWipStage(val)}>
                    <SelectTrigger id="wip-stage" className="bg-zinc-900 border-white/10 text-white h-9 text-xs">
                      <SelectValue placeholder="Select Stage" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white text-xs">
                      <SelectItem value="concept">Concept / Design / Storyboard</SelectItem>
                      <SelectItem value="blocking">Rough Pass / Blocking / Clay Render</SelectItem>
                      <SelectItem value="splining">Splining / Pass 2 / Refinement</SelectItem>
                      <SelectItem value="polish">Polish / Texture / FX Pass</SelectItem>
                      <SelectItem value="cleanup">Cleanup / Lighting / Render Pass</SelectItem>
                      <SelectItem value="completed">Completed / Final Piece</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Title & Description */}
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs text-zinc-300 font-medium">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Acrobat Jump & Roll - Blocking Pass"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-zinc-900 border-white/10 text-white h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs text-zinc-300 font-medium">Notes & Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your focus points (weight transfer, arcs, timing, software used)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="bg-zinc-900 border-white/10 text-white text-xs py-2"
                />
              </div>
            </div>
          )}

          {/* STEP 3 CARD: Hashtags & Software */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-250">
              {/* Hashtags Section */}
              <div className="space-y-2">
                <Label className="text-xs text-zinc-300 font-medium flex items-center justify-between">
                  <span>Animation Hashtags</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Type-ahead auto-lookup enabled</span>
                </Label>
                <HashtagAutoLookup selectedTags={selectedTags} onChange={setSelectedTags} />
              </div>

              {/* Software Section */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <Label className="text-xs text-zinc-300 font-medium">Software & Tools Used</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_SOFTWARE.map((sw) => {
                    const isSelected = selectedSoftware.includes(sw);
                    return (
                      <Badge
                        key={sw}
                        variant="outline"
                        onClick={() => handleToggleSoftware(sw)}
                        className={`cursor-pointer text-xs py-1 px-2.5 rounded-full transition-colors ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-500 font-semibold shadow'
                            : 'bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/30'
                        }`}
                      >
                        {sw}
                      </Badge>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom tool (e.g. TVPaint, Blender)..."
                    value={customSoftwareInput}
                    onChange={(e) => setCustomSoftwareInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSoftware();
                      }
                    }}
                    className="bg-zinc-900 border-white/10 text-white text-xs h-8"
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={handleAddCustomSoftware} className="h-8 px-3 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add Software
                  </Button>
                </div>
              </div>

              {/* Summary Card Preview */}
              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-white truncate max-w-[150px] sm:max-w-[200px] md:max-w-[280px]">{title || 'Untitled Post'}</p>
                  <p className="text-zinc-400 text-[11px]">
                    {type === 'portfolio' ? '🌟 Featured Portfolio Showcase' : `📂 Works Grid (${wipStage})`}
                  </p>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                  {selectedTags.length} Hashtags
                </Badge>
              </div>

              {/* Publishing Progress Card */}
              {isSubmitting && (
                <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-2.5 shadow-xl animate-in fade-in duration-300">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-purple-300 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-400 animate-spin" />
                      {uploadStatusMsg}
                    </span>
                    <span className="font-mono font-bold text-purple-200 text-xs">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden p-0.5 border border-white/10">
                    <div
                      className="bg-gradient-to-r from-purple-600 via-pink-500 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dialog Footer Navigation Buttons */}
          <DialogFooter className="pt-3 border-t border-white/10 flex items-center justify-between sm:justify-between w-full">
            <div>
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={isSubmitting}
                  className="border-white/15 text-zinc-300 hover:bg-zinc-900 h-9 text-xs px-4"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                  Back
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="text-zinc-400 hover:text-white h-9 text-xs"
                >
                  Cancel
                </Button>
              )}
            </div>

            <div>
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-primary hover:bg-primary/90 text-white font-semibold h-9 text-xs px-5 shadow-lg"
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 text-xs px-6 shadow-xl"
                >
                  {isSubmitting ? 'Publishing...' : '✨ Publish to Portfolio'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
