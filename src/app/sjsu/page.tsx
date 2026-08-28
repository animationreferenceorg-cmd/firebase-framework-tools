"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  type User 
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Mail, 
  Lock as LockIcon, 
  CheckCircle2, 
  Award,
  BookOpen,
  Palette,
  Film,
  Shuffle
} from 'lucide-react';
import { createUserProfile, grantSjsuStudentAccess } from '@/lib/firestore';
import Link from 'next/link';

// Expanded Default Animation Reference Video Pool
const DEFAULT_ANIMATION_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnTheGrid.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
];

// Use the current site mark instead of the legacy embedded logo data.
function AnimationRefLogo({ className = "w-full h-full object-contain", dynamicUrl }: { className?: string; dynamicUrl?: string }) {
  const [srcIndex, setSrcIndex] = useState(0);
  const sources = [
    ...(dynamicUrl ? [dynamicUrl] : []),
    'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/site-assets%2Fsjsu%2Fanimation-reference-logo-no-white.png?alt=media&token=24f351c6-b9c2-447f-bcf8-c3e512639445',
    '/site_icon_transparent.png',
    '/logo_transparent.png',
    '/site-icon.png',
    '/logo.png',
  ];

  if (srcIndex >= sources.length) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl text-white shadow-inner">
        <Sparkles className="w-3/5 h-3/5 text-purple-100 animate-pulse" />
      </div>
    );
  }

  return (
    <img
      src={sources[srcIndex]}
      alt="Animation Reference Logo"
      className={className}
      onError={() => setSrcIndex((prev) => prev + 1)}
    />
  );
}

// Use SJSU's official university primary mark for this academic partnership.
function SjsuPrimaryLogo({ className = "w-full h-full object-contain", dynamicUrl }: { className?: string; dynamicUrl?: string }) {
  const [srcIndex, setSrcIndex] = useState(0);
  const sources = [
    ...(dynamicUrl ? [dynamicUrl] : []),
    'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/site-assets%2Fsjsu%2Fsjsu-primary-mark.png?alt=media&token=68963aaf-7e45-4f9c-8def-11659407d68d',
    '/sjsu_primary_mark.png',
  ];

  if (srcIndex >= sources.length) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0055A2] rounded-xl text-[#E5A823] font-black border border-[#E5A823]/60 shadow-inner p-1">
        <GraduationCap className="w-3/5 h-3/5 text-[#E5A823]" />
        <span className="text-[9px] tracking-tighter leading-none mt-0.5 font-mono text-[#E5A823]">SJSU</span>
      </div>
    );
  }

  return (
    <img
      src={sources[srcIndex]}
      alt="San José State University"
      className={className}
      onError={() => setSrcIndex((prev) => prev + 1)}
    />
  );
}

// Helper to select a random video index guaranteed to differ from previous session
function getRandomDifferentIndex(length: number): number {
  if (length <= 1) return 0;
  let lastIdx: number | null = null;
  try {
    const stored = sessionStorage.getItem('sjsu_last_video_idx');
    if (stored !== null) {
      lastIdx = parseInt(stored, 10);
    }
  } catch (e) {
    // Ignore SSR/Storage errors
  }

  let newIdx = Math.floor(Math.random() * length);
  if (lastIdx !== null && !isNaN(lastIdx) && newIdx === lastIdx) {
    newIdx = (newIdx + 1) % length;
  }

  try {
    sessionStorage.setItem('sjsu_last_video_idx', newIdx.toString());
  } catch (e) {
    // Ignore SSR/Storage errors
  }

  return newIdx;
}

export default function SjsuStudentPage() {
  const [sjsuEmail, setSjsuEmail] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [verifiedDetails, setVerifiedDetails] = useState<{ sjsuEmail: string; accountEmail: string } | null>(null);

  // Real Database Animation Reference Videos State
  const [bgVideos, setBgVideos] = useState<string[]>(DEFAULT_ANIMATION_VIDEOS);
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { auth } = useFirebase();

  // Load Real Animation Reference Videos from Database & Ensure Random Selection on Load
  useEffect(() => {
    // Select initial random video on page load guaranteed to differ from previous load
    const initialIdx = getRandomDifferentIndex(DEFAULT_ANIMATION_VIDEOS.length);
    setCurrentVideoIdx(initialIdx);

    async function loadDatabaseVideos() {
      try {
        const q = query(collection(db, 'videos'), limit(25));
        const snap = await getDocs(q);
        const fetchedUrls: string[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.videoUrl && typeof data.videoUrl === 'string' && data.videoUrl.startsWith('http')) {
            fetchedUrls.push(data.videoUrl);
          }
        });
        if (fetchedUrls.length > 0) {
          // Shuffle videos array for unpredictability
          const shuffled = [...fetchedUrls].sort(() => Math.random() - 0.5);
          setBgVideos(shuffled);
          const randIdx = getRandomDifferentIndex(shuffled.length);
          setCurrentVideoIdx(randIdx);
        }
      } catch (err) {
        console.warn('[SJSU] Using default reference videos:', err);
      }
    }

    loadDatabaseVideos();
  }, []);

  // Ensure Video Autoplay & Pointer Interaction Play Trigger
  useEffect(() => {
    const tryPlayVideo = () => {
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    };

    tryPlayVideo();
    window.addEventListener('pointerdown', tryPlayVideo);
    return () => {
      window.removeEventListener('pointerdown', tryPlayVideo);
    };
  }, [currentVideoIdx]);

  const handleNextVideo = () => {
    setCurrentVideoIdx((prev) => getRandomDifferentIndex(bgVideos.length));
  };

  const handleSjsuQualification = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanSjsuEmail = sjsuEmail.trim().toLowerCase();
    const cleanAccountEmail = accountEmail.trim().toLowerCase();

    // 1. Validate SJSU Email
    if (!cleanSjsuEmail || (!cleanSjsuEmail.endsWith('@sjsu.edu') && !cleanSjsuEmail.includes('.sjsu.edu'))) {
      toast({
        variant: "destructive",
        title: "Invalid SJSU Email Address",
        description: "Please enter a valid San José State University email ending in @sjsu.edu",
      });
      return;
    }

    // 2. Validate Account Email & Password
    if (!cleanAccountEmail || !cleanAccountEmail.includes('@')) {
      toast({
        variant: "destructive",
        title: "Invalid Account Email",
        description: "Please enter a valid email address for your account.",
      });
      return;
    }

    if (!password || password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    if (!auth) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "Firebase authentication service is not ready.",
      });
      return;
    }

    setLoading(true);
    try {
      let user: User | null = auth.currentUser;

      // Attempt to sign in or create account
      try {
        const userCred = await signInWithEmailAndPassword(auth, cleanAccountEmail, password);
        user = userCred.user;
      } catch (signInErr: any) {
        if (
          signInErr.code === 'auth/user-not-found' ||
          signInErr.code === 'auth/invalid-credential'
        ) {
          // Create new account if user doesn't exist
          const createCred = await createUserWithEmailAndPassword(auth, cleanAccountEmail, password);
          user = createCred.user;
        } else {
          throw signInErr;
        }
      }

      if (!user) {
        throw new Error("Could not authenticate user account.");
      }

      // Ensure profile exists in Firestore
      await createUserProfile(user);

      // Grant SJSU Student Unlimited Access
      await grantSjsuStudentAccess(user.uid, cleanSjsuEmail, cleanAccountEmail);

      setVerifiedDetails({
        sjsuEmail: cleanSjsuEmail,
        accountEmail: cleanAccountEmail,
      });
      setIsSuccess(true);

      toast({
        title: "🎓 SJSU Student Access Activated!",
        description: `Welcome Spartan! Unlimited free access granted for ${cleanSjsuEmail}.`,
      });

    } catch (err: any) {
      console.error("[SJSU Signup Error]", err);
      toast({
        variant: "destructive",
        title: "Qualification Error",
        description: err.message || "Failed to process SJSU student qualification.",
      });
    } finally {
      setLoading(false);
    }
  };

  const activeVideoUrl = bgVideos[currentVideoIdx % bgVideos.length];

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center bg-[#050811] text-white overflow-hidden select-none m-0 p-0 z-50">
      
      {/* ──────────────── DYNAMIC ANIMATION REFERENCE BACKGROUND VIDEO ──────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <video
          ref={videoRef}
          key={activeVideoUrl}
          src={activeVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          onEnded={handleNextVideo}
          className="w-full h-full object-cover opacity-75 filter brightness-110 contrast-105 scale-105 transition-opacity duration-700"
        />
        {/* Soft Vignette Overlay for High Contrast & Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050811]/60 via-[#050811]/40 to-[#050811]/70 backdrop-blur-[1px]" />
      </div>

      {/* ──────────────── TOP BRAND NAVIGATION HEADER BAR ──────────────── */}
      <div className="fixed top-0 left-0 right-0 z-30 px-6 py-4 flex items-center justify-between bg-[#050811]/75 backdrop-blur-xl border-b border-white/10">
        <Link href="/home" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-950 to-[#18132e] border border-purple-400/50 p-1 flex items-center justify-center shadow-lg shadow-purple-600/40">
            <AnimationRefLogo className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(168,85,247,0.5)]" />
          </div>
          <span className="text-sm font-black text-white tracking-wider group-hover:text-purple-300 transition-colors">
            ANIMATION REFERENCE
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handleNextVideo}
            title="Switch background animation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer shadow-md"
          >
            <Shuffle className="h-3.5 w-3.5 text-purple-400" />
            <span className="hidden sm:inline">Shuffle Animation</span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0055A2]/60 border border-[#E5A823]/60 text-xs font-mono font-bold text-[#E5A823] shadow-lg">
            <GraduationCap className="h-4 w-4 text-[#E5A823]" />
            <span>SJSU Partner Access</span>
          </div>
        </div>
      </div>

      {/* Ambient SJSU Blue & Gold Glow Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] bg-[#0055A2]/25 blur-[160px] rounded-full pointer-events-none z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] bg-[#E5A823]/15 blur-[160px] rounded-full pointer-events-none z-10" />

      {/* ──────────────── MAIN SJSU PORTAL CARD ──────────────── */}
      <div className="relative z-20 w-full max-w-lg space-y-6 my-auto px-4 pt-20 pb-10">
        
        {/* Unlisted Portal Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          
          {/* Partner Access Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5A823]/20 border border-[#E5A823]/60 text-[#E5A823] text-[11px] font-mono font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(229,168,35,0.4)]">
            <Sparkles className="h-3.5 w-3.5 text-[#E5A823]" />
            <span>Unlisted SJSU Partner Pass</span>
          </div>

          {/* Prominent dual-brand partnership lockup */}
          <div className="flex items-center gap-3 p-3.5 px-4 rounded-3xl bg-[#0c1424]/95 border border-[#E5A823]/50 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
            {/* 1. Animation Reference Logo */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-950/90 to-[#18132e] border border-purple-500/50 p-2 flex items-center justify-center shadow-lg shadow-purple-600/40 shrink-0 overflow-hidden">
              <AnimationRefLogo className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(168,85,247,0.5)]" />
            </div>

            <span className="text-amber-400/80 font-black text-base px-1">✕</span>

            {/* 2. Official SJSU university primary mark */}
            <div className="w-32 h-14 rounded-xl bg-white border border-white/80 px-2 py-1.5 flex items-center justify-center shrink-0 overflow-hidden">
              <SjsuPrimaryLogo className="w-full h-full object-contain" />
            </div>

            <div className="text-left ml-1">
              <span className="text-lg font-black text-white tracking-wider block leading-tight">
                Animation Reference
              </span>
              <span className="text-xs text-amber-300 font-bold">SJSU Student Unlimited Pass</span>
            </div>
          </div>

          <p className="text-xs text-zinc-300 max-w-sm leading-relaxed font-medium">
            Get 100% free unlimited access to Animation Reference, Paint Studio, timeline tools, and reference library.
          </p>
        </div>

        {/* ──────────────── SUCCESS CONFIRMATION STATE ──────────────── */}
        {isSuccess && verifiedDetails ? (
          <div className="p-6 sm:p-8 rounded-[32px] bg-[#0c1424]/95 border border-[#E5A823]/60 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              <CheckCircle2 className="h-9 w-9 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Access Granted, Spartan! 🎉</h2>
              <p className="text-xs text-zinc-300">
                Your SJSU student qualification has been verified and applied to your account.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs font-mono space-y-2 text-zinc-300">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-zinc-500 font-semibold">Verified SJSU Email:</span>
                <span className="text-amber-300 font-bold">{verifiedDetails.sjsuEmail}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-zinc-500 font-semibold">Account Email:</span>
                <span className="text-white font-bold">{verifiedDetails.accountEmail}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-semibold">Access Plan:</span>
                <span className="text-emerald-400 font-bold uppercase">Unlimited Student VIP Pass ($0.00)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Link href="/paint" className="w-full">
                <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs gap-2 shadow-lg shadow-purple-600/30 cursor-pointer">
                  <Palette className="h-4 w-4" />
                  <span>Launch Paint Studio</span>
                </Button>
              </Link>
              <Link href="/home" className="w-full">
                <Button variant="outline" className="w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 border-white/15 text-white font-bold text-xs gap-2 cursor-pointer">
                  <BookOpen className="h-4 w-4" />
                  <span>Browse Vault</span>
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* ──────────────── FORM STATE ──────────────── */
          <div className="p-6 sm:p-8 rounded-[32px] bg-[#0c1424]/95 border border-blue-500/50 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-6 relative overflow-hidden">
            
            {/* Top Gold Gloss Bar */}
            <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#E5A823] to-transparent pointer-events-none" />

            <div className="space-y-1 text-left border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-[#E5A823] text-xs font-bold font-mono">
                <Award className="h-4 w-4" />
                <span>SJSU STUDENT QUALIFICATION</span>
              </div>
              <p className="text-xs text-zinc-300">
                Type your SJSU student email along with your account credentials below to activate your free unlimited pass.
              </p>
            </div>

            <form onSubmit={handleSjsuQualification} className="space-y-4 text-left">
              
              {/* 1. SJSU Student Email */}
              <div className="space-y-1.5">
                <Label htmlFor="sjsu-email" className="text-xs font-bold text-amber-300 flex items-center justify-between">
                  <span>1. SJSU Student Email</span>
                  <span className="text-[10px] font-mono text-amber-400/80 font-normal">Must end with @sjsu.edu</span>
                </Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400 shrink-0" />
                  <Input 
                    id="sjsu-email" 
                    type="email" 
                    required
                    placeholder="spartan.name@sjsu.edu" 
                    value={sjsuEmail} 
                    onChange={(e) => setSjsuEmail(e.target.value)} 
                    className="pl-10 h-11 rounded-xl bg-white/5 border-amber-500/40 text-white placeholder:text-zinc-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30 text-xs font-mono font-medium"
                  />
                </div>
              </div>

              {/* 2. Account Email */}
              <div className="space-y-1.5">
                <Label htmlFor="account-email" className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>2. Account Email Address</span>
                  <span className="text-[10px] font-mono text-zinc-400 font-normal">Your login email</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 shrink-0" />
                  <Input 
                    id="account-email" 
                    type="email" 
                    required
                    placeholder="you@gmail.com or name@sjsu.edu" 
                    value={accountEmail} 
                    onChange={(e) => setAccountEmail(e.target.value)} 
                    className="pl-10 h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 text-xs font-medium"
                  />
                </div>
              </div>

              {/* 3. Account Password */}
              <div className="space-y-1.5">
                <Label htmlFor="account-password" className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>3. Account Password</span>
                  <span className="text-[10px] font-mono text-zinc-400 font-normal">Min 6 characters</span>
                </Label>
                <div className="relative">
                  <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 shrink-0" />
                  <Input 
                    id="account-password" 
                    type="password" 
                    required
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="pl-10 h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Submit Activation Button */}
              <Button 
                type="submit"
                disabled={loading || !auth} 
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0055A2] via-blue-600 to-[#E5A823] hover:from-blue-600 hover:to-amber-400 text-white font-extrabold text-sm shadow-xl shadow-blue-900/50 cursor-pointer gap-2 mt-2"
              >
                {loading ? 'Verifying SJSU Credentials...' : 'Activate SJSU Free Unlimited Pass'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            {/* Guarantee Badges */}
            <div className="pt-2 flex items-center justify-center gap-4 text-[10px] font-semibold text-zinc-400 border-t border-white/10">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> Verified SJSU Pass
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" /> 100% Free Unlimited
              </span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
