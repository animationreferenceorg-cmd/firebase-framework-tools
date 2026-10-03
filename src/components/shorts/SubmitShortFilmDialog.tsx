'use client';

import React, { useState, useRef, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { generateAutoThumbnail } from '@/lib/portfolio-service';
import type { BehindTheScenesExtra, VideoSubmissionProof } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Film,
  Sparkles,
  ShieldCheck,
  Plus,
  Trash2,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Image as ImageIcon,
  FileText,
  Video as VideoIcon,
} from 'lucide-react';

interface LocalBtsItem {
  id: string;
  type: BehindTheScenesExtra['type'];
  title: string;
  description: string;
  file: File;
  previewUrl: string;
}

const CATEGORY_OPTIONS = [
  '3D Animation',
  '2D Animation',
  'Stop Motion',
  'Stylized',
  'Student Film',
  'Sci-Fi',
  'Fantasy',
  'Action',
  'Drama',
  'Comedy',
  'Creature & Character',
  'Experimental',
];

const BTS_TYPES: { type: BehindTheScenesExtra['type']; label: string; icon: React.ElementType; accept: string; description: string }[] = [
  { type: 'rig', label: 'Rig & Technical Pass', icon: Layers, accept: 'image/*,video/mp4', description: 'Maya/Blender viewport rig demo, skinning, or controls' },
  { type: 'concept_art', label: 'Concept Art & Color Script', icon: ImageIcon, accept: 'image/*', description: 'Visual development, character designs, or color keys' },
  { type: 'pitch_deck', label: 'Pitch Deck & Bible', icon: FileText, accept: 'application/pdf,image/*', description: 'Film pitch deck, story bible, or treatment (PDF/Image)' },
  { type: 'animatic', label: 'Storyboard / Animatic', icon: VideoIcon, accept: 'video/mp4,image/*', description: 'Rough blocking, 2D animatic, or beat board sequence' },
  { type: 'model_sheet', label: 'Model Sheets / Sculpt', icon: Layers, accept: 'image/*', description: 'Turnarounds, wireframes, or high-res sculpts' },
  { type: 'other', label: 'Other Behind-the-Scenes', icon: Film, accept: 'image/*,video/mp4,application/pdf', description: 'Team credits, production photos, or sound design breakdown' },
];

export function SubmitShortFilmDialog({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Film file & metadata
  const [filmFile, setFilmFile] = useState<File | null>(null);
  const [filmPreviewUrl, setFilmPreviewUrl] = useState<string>('');
  const [filmDuration, setFilmDuration] = useState<number>(0);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string>('');

  // Form details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['3D Animation']);
  const [tagsInput, setTagsInput] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [creatorRole, setCreatorRole] = useState('Director');
  const [creatorStatement, setCreatorStatement] = useState('');

  // Behind the Scenes proof items
  const [btsList, setBtsList] = useState<LocalBtsItem[]>([]);
  const [curBtsType, setCurBtsType] = useState<BehindTheScenesExtra['type']>('rig');
  const [curBtsTitle, setCurBtsTitle] = useState('');
  const [curBtsDesc, setCurBtsDesc] = useState('');
  const [curBtsFile, setCurBtsFile] = useState<File | null>(null);
  const [curBtsPreview, setCurBtsPreview] = useState('');

  // Copyright attestation
  const [agreedTerms, setAgreedTerms] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const btsFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill user info if logged in
  useEffect(() => {
    if (user) {
      if (user.displayName && !creatorName) setCreatorName(user.displayName);
      if (user.email && !creatorEmail) setCreatorEmail(user.email);
    }
  }, [user]);

  // Clean object URLs on unmount/change
  useEffect(() => {
    return () => {
      if (filmPreviewUrl) URL.revokeObjectURL(filmPreviewUrl);
      if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
      btsList.forEach((b) => URL.revokeObjectURL(b.previewUrl));
    };
  }, []);

  const handleSelectFilm = (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast({
        variant: 'destructive',
        title: 'MP4 Video Required',
        description: 'Please upload an actual animated short film file (.mp4, .mov, .m4v).',
      });
      return;
    }

    if (filmPreviewUrl) URL.revokeObjectURL(filmPreviewUrl);
    const url = URL.createObjectURL(file);
    setFilmFile(file);
    setFilmPreviewUrl(url);

    if (!title) {
      setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '));
    }

    // Inspect duration
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = url;
    v.onloadedmetadata = () => {
      if (Number.isFinite(v.duration)) {
        setFilmDuration(Math.round(v.duration));
      }
    };
  };

  const handleSelectPoster = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Image Required',
        description: 'Poster must be a valid image file (JPG, PNG, WEBP).',
      });
      return;
    }
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    setPosterFile(file);
    setPosterPreviewUrl(URL.createObjectURL(file));
  };

  const handleAddBtsItem = () => {
    if (!curBtsFile) {
      toast({
        variant: 'destructive',
        title: 'Proof Asset Required',
        description: 'Please select a file for this behind-the-scenes proof item.',
      });
      return;
    }

    const typeConfig = BTS_TYPES.find((t) => t.type === curBtsType);
    const itemTitle = curBtsTitle.trim() || typeConfig?.label || 'Behind-the-Scenes Asset';

    const newItem: LocalBtsItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: curBtsType,
      title: itemTitle,
      description: curBtsDesc.trim(),
      file: curBtsFile,
      previewUrl: curBtsPreview,
    };

    setBtsList((prev) => [...prev, newItem]);
    setCurBtsTitle('');
    setCurBtsDesc('');
    setCurBtsFile(null);
    setCurBtsPreview('');
    if (btsFileInputRef.current) btsFileInputRef.current.value = '';

    toast({
      title: 'Added Behind-The-Scenes Proof',
      description: `"${itemTitle}" added to your film verification & extras.`,
    });
  };

  const handleRemoveBtsItem = (id: string) => {
    const item = btsList.find((b) => b.id === id);
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    setBtsList((prev) => prev.filter((b) => b.id !== id));
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!filmFile) {
      toast({
        variant: 'destructive',
        title: 'Missing Film File',
        description: 'You must upload the actual short film MP4 file.',
      });
      return;
    }

    if (!title.trim() || !description.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Details',
        description: 'Please provide both a title and a description for your film.',
      });
      return;
    }

    if (!creatorName.trim() || !creatorEmail.trim()) {
      toast({
        variant: 'destructive',
        title: 'Creator Info Required',
        description: 'Please provide your name and contact email so we can verify and attribute your film.',
      });
      return;
    }

    if (btsList.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Production Proof Required',
        description:
          'Please attach at least 1 behind-the-scenes proof item (Rig demo, concept art, pitch deck, or animatic). This prevents stolen re-uploads and forms your public Extras showcase!',
      });
      return;
    }

    if (!agreedTerms) {
      toast({
        variant: 'destructive',
        title: 'Attestation Required',
        description: 'Please confirm the copyright ownership attestation before submitting.',
      });
      return;
    }

    setIsSubmitting(true);
    setUploadPercent(5);
    setUploadStage('Preparing upload…');

    try {
      const uid = user?.uid || 'guest_submitter';
      const timestamp = Date.now();
      const sanitizedName = filmFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');

      // 1. Upload Film MP4
      setUploadStage('Uploading film MP4…');
      const filmStorageRef = ref(storage, `shorts/${uid}/${timestamp}_${sanitizedName}`);
      const filmUploadTask = uploadBytesResumable(filmStorageRef, filmFile, {
        contentType: filmFile.type || 'video/mp4',
      });

      await new Promise<void>((resolve, reject) => {
        filmUploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0) {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 55);
              setUploadPercent(5 + progress);
            }
          },
          (err) => reject(err),
          () => resolve()
        );
      });

      const videoUrl = await getDownloadURL(filmStorageRef);

      // 2. Poster / Thumbnail
      setUploadStage('Processing cover & poster art…');
      setUploadPercent(65);
      let thumbnailUrl = '';
      let posterUrl = '';

      if (posterFile) {
        const posterRef = ref(storage, `shorts/${uid}/${timestamp}_poster.jpg`);
        const posterTask = uploadBytesResumable(posterRef, posterFile, { contentType: posterFile.type });
        await posterTask;
        posterUrl = await getDownloadURL(posterRef);
        thumbnailUrl = posterUrl;
      } else {
        try {
          const autoThumb = await generateAutoThumbnail(filmFile);
          if (autoThumb instanceof File) {
            const thumbRef = ref(storage, `shorts/${uid}/${timestamp}_thumb.jpg`);
            const thumbTask = uploadBytesResumable(thumbRef, autoThumb, { contentType: 'image/jpeg' });
            await thumbTask;
            thumbnailUrl = await getDownloadURL(thumbRef);
            posterUrl = thumbnailUrl;
          }
        } catch {
          // Best effort
        }
      }

      // 3. Upload Behind The Scenes Proof & Extras
      setUploadStage('Uploading behind-the-scenes proof & extras…');
      const uploadedBtsExtras: BehindTheScenesExtra[] = [];

      for (let i = 0; i < btsList.length; i++) {
        const item = btsList[i];
        const btsSanitized = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const btsRef = ref(storage, `shorts/${uid}/bts/${timestamp}_${i}_${btsSanitized}`);
        const btsTask = uploadBytesResumable(btsRef, item.file, { contentType: item.file.type || undefined });
        await btsTask;
        const btsDownloadUrl = await getDownloadURL(btsRef);

        const mediaType: 'image' | 'video' | 'pdf' = item.file.type.startsWith('video/')
          ? 'video'
          : item.file.type === 'application/pdf'
          ? 'pdf'
          : 'image';

        uploadedBtsExtras.push({
          id: item.id,
          type: item.type,
          title: item.title,
          description: item.description,
          mediaUrl: btsDownloadUrl,
          mediaType,
          thumbnailUrl: mediaType === 'image' ? btsDownloadUrl : undefined,
        });

        setUploadPercent(65 + Math.round(((i + 1) / btsList.length) * 25));
      }

      // 4. Save to Firestore `videos` collection with status 'pending_review'
      setUploadStage('Submitting to curation queue…');
      setUploadPercent(95);

      const cleanTags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const submissionProof: VideoSubmissionProof = {
        directorRole: creatorRole,
        contactEmail: creatorEmail.trim(),
        statement: creatorStatement.trim() || undefined,
        acceptedTerms: true,
        submittedAt: serverTimestamp(),
        submittedByUid: user?.uid,
        submittedByName: creatorName.trim(),
      };

      await addDoc(collection(db, 'videos'), {
        title: title.trim(),
        description: description.trim(),
        videoUrl,
        thumbnailUrl: thumbnailUrl || videoUrl,
        posterUrl: posterUrl || thumbnailUrl || videoUrl,
        isShort: true,
        status: 'pending_review',
        categories: selectedCategories.length > 0 ? selectedCategories : ['3D Animation'],
        tags: cleanTags,
        duration: filmDuration || 60,
        author_name: creatorName.trim(),
        uploader: user?.uid || 'creator_submission',
        behindTheScenes: uploadedBtsExtras,
        submissionProof,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setUploadPercent(100);
      setSubmittedSuccess(true);
      toast({
        title: 'Film Submitted Successfully!',
        description: 'Your short film and behind-the-scenes verification are now in the review queue.',
      });
    } catch (err: any) {
      console.error('Submission failed:', err);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: err?.message || 'Could not complete the submission. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsOpen(false);
    setSubmittedSuccess(false);
    setFilmFile(null);
    setFilmPreviewUrl('');
    setPosterFile(null);
    setPosterPreviewUrl('');
    setTitle('');
    setDescription('');
    setTagsInput('');
    setCreatorStatement('');
    setBtsList([]);
    setAgreedTerms(false);
    setUploadPercent(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="h-10 gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-105 hover:from-purple-500 hover:to-indigo-500">
            <Upload className="h-4 w-4" />
            Submit Your Short Film
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-white/10 bg-[#0c0d14] p-0 text-white shadow-2xl backdrop-blur-2xl">
        {submittedSuccess ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-black text-white">Film Submitted for Verification!</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-300">
              Thank you for sharing <span className="font-semibold text-white">"{title}"</span>. Our team will review your behind-the-scenes assets to verify original creation. Once approved, your film and its exclusive Extras will be published live to our curated Shorts collection.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                Proof of Work Attached ({btsList.length} items)
              </Badge>
              <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/30">
                Status: Pending Review
              </Badge>
            </div>
            <Button
              onClick={handleResetAndClose}
              className="mt-8 rounded-xl bg-purple-600 px-8 py-2.5 font-bold hover:bg-purple-500"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
            <DialogHeader className="border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                  <Film className="h-4 w-4" />
                </span>
                <DialogTitle className="text-xl font-black text-white">
                  Submit Animated Short Film
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-zinc-400">
                AnimationReference is a curated showcase for authentic animated short films. We require actual video files and behind-the-scenes proof of craftsmanship to protect creators against scraped web re-uploads.
              </DialogDescription>
            </DialogHeader>

            {/* SECTION 1: THE FILM (MP4) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Film className="h-4 w-4" />
                  1. Film Media (Actual MP4 Only)
                </h3>
                <span className="text-[11px] font-medium text-amber-400/90">
                  Direct video file required • No web links
                </span>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all ${
                  filmFile
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : 'border-white/15 bg-white/[0.02] hover:border-purple-500/50 hover:bg-white/[0.04]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-m4v"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSelectFilm(f);
                  }}
                />

                {filmFile ? (
                  <div className="flex flex-col items-center gap-2 p-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                      <FileCheck className="h-6 w-6" />
                    </div>
                    <div className="font-semibold text-white">{filmFile.name}</div>
                    <div className="text-xs text-zinc-400">
                      {(filmFile.size / 1024 / 1024).toFixed(1)} MB {filmDuration > 0 && `• ${Math.floor(filmDuration / 60)}m ${filmDuration % 60}s`}
                    </div>
                    <span className="text-[11px] text-emerald-400 underline">Click to choose a different file</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 p-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-semibold text-white">Click or drag your Animated Film (.MP4 / .MOV) here</div>
                    <div className="text-xs text-zinc-400">High quality master MP4 / QuickTime file</div>
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-300">Film Title *</label>
                  <Input
                    required
                    placeholder="e.g. The Mechanical Heart"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-300">Logline / Synopsis *</label>
                  <Textarea
                    required
                    rows={3}
                    placeholder="A brief summary of the story, theme, and artistic intent..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Categories / Style */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300">Animation Style & Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const active = selectedCategories.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`rounded-lg border px-3 py-1 text-xs font-medium transition-all ${
                          active
                            ? 'border-purple-500 bg-purple-600 text-white'
                            : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Poster Artwork */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">Cover Poster Art (Optional)</label>
                  <span className="text-[11px] text-zinc-500">Auto-extracted from video if left empty</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => posterInputRef.current?.click()}
                    className="border-white/10 bg-white/5 text-xs text-zinc-300 hover:bg-white/10"
                  >
                    <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                    {posterFile ? 'Change Poster Image' : 'Upload Vertical/Landscape Poster'}
                  </Button>
                  <input
                    ref={posterInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSelectPoster(f);
                    }}
                  />
                  {posterFile && (
                    <span className="text-xs text-emerald-400 font-medium truncate max-w-xs">
                      ✓ {posterFile.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: CREATOR IDENTIFICATION */}
            <div className="space-y-4 border-t border-white/10 pt-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                2. Creator & Director Attribution
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Creator / Director Name *</label>
                  <Input
                    required
                    placeholder="Your name or studio name"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Your Primary Role *</label>
                  <Input
                    required
                    placeholder="Director, Lead Animator, etc."
                    value={creatorRole}
                    onChange={(e) => setCreatorRole(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Contact Email *</label>
                  <Input
                    required
                    type="email"
                    placeholder="director@studio.com"
                    value={creatorEmail}
                    onChange={(e) => setCreatorEmail(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: BEHIND THE SCENES PROOF & EXTRAS */}
            <div className="space-y-4 border-t border-white/10 pt-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-4.5 w-4.5 text-amber-400" />
                    3. Proof of Work & Behind-the-Scenes Extras *
                  </h3>
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                    Mandatory for Verification
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-zinc-400">
                  Attach at least <strong className="text-white">one authentic production asset</strong> (Rig demonstration, Concept Art / Storyboards, Pitch Deck / Film Bible, or Animatic). Scrapers cannot forge production assets. Once approved, these will also be featured in the <strong className="text-purple-300">Extras</strong> tab of your film!
                </p>
              </div>

              {/* Added BTS Items List */}
              {btsList.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Attached Proof & Extras ({btsList.length})
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {btsList.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                            {item.type === 'rig' && <Layers className="h-4 w-4" />}
                            {item.type === 'concept_art' && <ImageIcon className="h-4 w-4" />}
                            {item.type === 'pitch_deck' && <FileText className="h-4 w-4" />}
                            {item.type === 'animatic' && <VideoIcon className="h-4 w-4" />}
                            {item.type === 'model_sheet' && <Layers className="h-4 w-4" />}
                            {item.type === 'other' && <Film className="h-4 w-4" />}
                          </span>
                          <div className="truncate">
                            <div className="font-semibold text-white truncate">{item.title}</div>
                            <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                              {item.type.replace('_', ' ')} • {(item.file.size / 1024 / 1024).toFixed(1)} MB
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveBtsItem(item.id)}
                          className="h-7 w-7 text-zinc-400 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add BTS Item Form */}
              <div className="rounded-2xl border border-purple-500/20 bg-purple-950/10 p-4 space-y-3">
                <div className="text-xs font-bold text-purple-300">Add a Behind-the-Scenes Asset:</div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BTS_TYPES.map((bt) => {
                    const active = curBtsType === bt.type;
                    const Icon = bt.icon;
                    return (
                      <button
                        type="button"
                        key={bt.type}
                        onClick={() => {
                          setCurBtsType(bt.type);
                          if (!curBtsTitle) setCurBtsTitle(bt.label);
                        }}
                        className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs transition-all ${
                          active
                            ? 'border-purple-500 bg-purple-600/30 text-white shadow-sm'
                            : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-purple-400" />
                        <span className="truncate font-medium">{bt.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Input
                    placeholder="Asset Title (e.g. Hero Rig Controls, Color Keys)"
                    value={curBtsTitle}
                    onChange={(e) => setCurBtsTitle(e.target.value)}
                    className="border-white/10 bg-white/5 text-xs text-white placeholder:text-zinc-600"
                  />

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => btsFileInputRef.current?.click()}
                      className="w-full border-dashed border-white/20 bg-white/5 text-xs text-zinc-300 hover:bg-white/10 truncate"
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      {curBtsFile ? curBtsFile.name : 'Choose File (Image, Video, or PDF)'}
                    </Button>
                    <input
                      ref={btsFileInputRef}
                      type="file"
                      accept="image/*,video/mp4,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setCurBtsFile(f);
                          setCurBtsPreview(URL.createObjectURL(f));
                        }
                      }}
                    />

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddBtsItem}
                      disabled={!curBtsFile}
                      className="shrink-0 rounded-xl bg-purple-600 px-3 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-40"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Asset
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: COPYRIGHT & ATTESTATION */}
            <div className="space-y-3 border-t border-white/10 pt-4">
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-zinc-300 hover:bg-white/[0.04]">
                <input
                  type="checkbox"
                  required
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/30 bg-zinc-900 text-purple-600 focus:ring-purple-500"
                />
                <span className="leading-relaxed">
                  <strong className="text-white">Copyright & Authenticity Attestation:</strong> I certify under penalty of permanent account termination that I am the sole copyright holder or designated lead director of this film. The attached behind-the-scenes assets are authentic materials from our production.
                </span>
              </label>
            </div>

            {/* SUBMIT BUTTON & PROGRESS */}
            {isSubmitting && (
              <div className="space-y-2 rounded-xl border border-purple-500/30 bg-purple-950/20 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-purple-300 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                    {uploadStage}
                  </span>
                  <span className="font-bold text-white">{uploadPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${uploadPercent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleResetAndClose}
                disabled={isSubmitting}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || !filmFile || btsList.length === 0 || !agreedTerms}
                className="h-11 gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-7 text-sm font-bold text-white shadow-xl shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Film…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Submit Film for Verification
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
