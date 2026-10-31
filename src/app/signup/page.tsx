'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserProfile } from '@/lib/firestore';
import { updateUserProfileData } from '@/lib/portfolio-service';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  Film,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Upload,
  User,
  Eye,
  Layers,
  Zap,
  Globe,
  Loader2,
  Lock,
  Mail,
  FolderPlus,
} from 'lucide-react';
import { UploadPortfolioItemModal } from '@/components/portfolio/UploadPortfolioItemModal';
import { analytics } from '@heycatch/sdk';

export default function SignupPage() {
  const { user, loading: authLoading } = useAuth();
  const { userProfile, mutate } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [discipline, setDiscipline] = useState('3D Character Animation');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Portfolio Submission Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Auto-fill username as user types name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!username || username === name.toLowerCase().replace(/[^a-z0-9_]/g, '')) {
      setUsername(val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 20));
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Missing details', description: 'Please enter your email and password.', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }

      await createUserProfile(cred.user);

      if (cleanUsername || discipline) {
        await updateUserProfileData(cred.user.uid, {
          ...(cleanUsername ? { username: cleanUsername } : {}),
          ...(discipline ? { headline: `${discipline} Specialist` } : {}),
        });
      }

      analytics.trackEvent('signup_completed', { source: 'portfolio_signup' });
      mutate?.();

      toast({
        title: 'Account Created!',
        description: 'Welcome to Animation Reference. Now submit your first portfolio shot!',
      });
    } catch (err: any) {
      console.error('Signup error:', err);
      let msg = err.message || 'Could not create account.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please sign in instead.';
      }
      toast({ title: 'Sign-up failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      await createUserProfile(res.user);

      const generatedUsername = (res.user.displayName || res.user.email?.split('@')[0] || 'animator')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 20);

      await updateUserProfileData(res.user.uid, {
        username: generatedUsername,
        headline: 'Character Animator',
      });

      analytics.trackEvent('signup_completed', { source: 'google_portfolio_signup' });
      mutate?.();

      toast({
        title: 'Welcome to Animation Reference!',
        description: 'Your animator profile is ready. Submit your first reel below.',
      });
    } catch (err: any) {
      console.error('Google sign-up error:', err);
      toast({
        title: 'Google Sign-up Failed',
        description: err.message || 'Could not complete Google sign-in.',
        variant: 'destructive',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07060b] text-white selection:bg-purple-500/30 relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      {/* Ambient Lighting */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[450px] h-[450px] bg-pink-600/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-5xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Animator Pitch & Recruiter Highlights */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <Link href="/home" className="inline-flex items-center gap-2 group mb-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 group-hover:scale-105 transition-transform">
              <Film className="h-5 w-5" />
            </span>
            <span className="text-xl font-black tracking-tight text-white group-hover:text-purple-300 transition-colors">
              Animation Reference
            </span>
          </Link>

          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-purple-300">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" /> Animator Portfolio Builder
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              The portfolio recruiters{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-pink-300">
                actually want to review.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              Stop sending compressed YouTube links or image-heavy ArtStation posts. Showcase your shots with frame-by-frame scrubbing, timing notes, and zero AI clutter.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-start gap-3.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-purple-500/20 text-purple-300 mt-0.5 border border-purple-500/20">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Frame-by-Frame Scrubbing</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Supervisors can use the keyboard (<kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px]">,</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px]">.</kbd>) to evaluate your arcs, spacing, and weight frame by frame.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-pink-500/20 text-pink-300 mt-0.5 border border-pink-500/20">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Shot Breakdowns &amp; Context</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Detail your software, rig used, blocking vs polish pass, and reference inspiration directly beneath each reel.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-500/20 text-indigo-300 mt-0.5 border border-indigo-500/20">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Clean Custom Share URL</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Share a distraction-free link (<code className="text-purple-300 text-xs">animationreference.org/u/yourname</code>) with zero ads, zero algorithms, and instant load times.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3 text-xs text-zinc-400 border-t border-white/10">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>100% Free for animators · Unlimited public portfolio shots &amp; reels.</span>
          </div>
        </div>

        {/* Right Column: Sign Up or Immediate Portfolio Submission */}
        <div className="lg:col-span-6">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40 relative">
            {user ? (
              /* Already Logged In / Freshly Registered -> Direct Submission CTA */
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-600/20 border border-purple-500/30 grid place-items-center text-purple-300">
                  <User className="h-8 w-8" />
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300 mb-2">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Account Ready
                  </span>
                  <h2 className="text-2xl font-black text-white">
                    Welcome, {userProfile?.displayName || user.displayName || 'Animator'}!
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-sm mx-auto">
                    Your animator account is active. You are ready to publish your first shot to your portfolio.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    onClick={() => setIsUploadOpen(true)}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold h-12 rounded-xl shadow-xl shadow-purple-600/30 gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <Upload className="h-4 w-4" />
                    Submit Portfolio Reel / Shot
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => router.push('/profile')}
                    className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold h-11 rounded-xl gap-2"
                  >
                    View &amp; Customize My Portfolio <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Sign Up Form */
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Create Your Animator Portfolio
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Free forever. Start uploading and sharing your animation shots in minutes.
                  </p>
                </div>

                {/* Google Sign-Up */}
                <Button
                  onClick={handleGoogleSignup}
                  disabled={googleLoading}
                  variant="outline"
                  className="w-full border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold h-11 rounded-xl gap-2 transition-all"
                >
                  {googleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  Sign up with Google
                </Button>

                <div className="relative text-center my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <span className="relative bg-[#0d0c13] px-3 text-[11px] uppercase tracking-wider text-zinc-500">
                    or with email
                  </span>
                </div>

                {/* Email Signup Form */}
                <form onSubmit={handleEmailSignup} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1 text-left">
                      <Label htmlFor="name" className="text-xs font-bold text-zinc-300">
                        Full Name / Alias
                      </Label>
                      <Input
                        id="name"
                        placeholder="Alex Rivers"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="bg-zinc-900 border-white/10 text-xs sm:text-sm h-10"
                        required
                      />
                    </div>

                    <div className="space-y-1 text-left">
                      <Label htmlFor="username" className="text-xs font-bold text-zinc-300">
                        Portfolio Username
                      </Label>
                      <Input
                        id="username"
                        placeholder="alex_anim"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className="bg-zinc-900 border-white/10 text-xs sm:text-sm h-10 font-mono"
                        required
                      />
                    </div>
                  </div>

                  {username && (
                    <p className="text-[11px] text-zinc-400 font-mono text-left">
                      Your link: <span className="text-purple-400 font-bold">animationreference.org/u/{username}</span>
                    </p>
                  )}

                  <div className="space-y-1 text-left">
                    <Label htmlFor="discipline" className="text-xs font-bold text-zinc-300">
                      Primary Discipline
                    </Label>
                    <select
                      id="discipline"
                      value={discipline}
                      onChange={(e) => setDiscipline(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg text-xs sm:text-sm h-10 px-3 text-white focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="3D Character Animation">3D Character Animation</option>
                      <option value="2D / Sakuga Animation">2D / Sakuga Animation</option>
                      <option value="Gameplay & Combat Animation">Gameplay &amp; Combat Animation</option>
                      <option value="Creature & VFX Animation">Creature &amp; VFX Animation</option>
                      <option value="Rigging & Technical Art">Rigging &amp; Technical Art</option>
                      <option value="Animation Student / Junior">Animation Student / Junior</option>
                    </select>
                  </div>

                  <div className="space-y-1 text-left">
                    <Label htmlFor="email" className="text-xs font-bold text-zinc-300">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="alex@animator.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-zinc-900 border-white/10 text-xs sm:text-sm h-10"
                      required
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <Label htmlFor="password" className="text-xs font-bold text-zinc-300">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-zinc-900 border-white/10 text-xs sm:text-sm h-10"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-purple-600/30 gap-2 cursor-pointer mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating Your Portfolio…
                      </>
                    ) : (
                      <>
                        <FolderPlus className="h-4 w-4" />
                        Create Free Portfolio
                      </>
                    )}
                  </Button>
                </form>

                <p className="text-xs text-center text-zinc-400 pt-1">
                  Already have an account?{' '}
                  <Link href="/login" className="text-purple-400 font-bold hover:underline">
                    Sign in here
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal (Triggered after signup or for logged in users) */}
      {user && (
        <UploadPortfolioItemModal
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          userId={user.uid}
          authorName={userProfile?.displayName || user.displayName || 'Animator'}
          authorAvatar={userProfile?.photoURL || user.photoURL || undefined}
          onItemCreated={(newItem) => {
            setIsUploadOpen(false);
            toast({
              title: 'Portfolio Shot Published!',
              description: `"${newItem.title}" is now live on your portfolio!`,
            });
            router.push('/profile');
          }}
        />
      )}
    </div>
  );
}
