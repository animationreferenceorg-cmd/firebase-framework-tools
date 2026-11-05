'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize, Sparkles, Film, Check, ArrowRight, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { createUserProfile } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';

interface SignUpPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: 'fullscreen' | 'hover_limit' | 'general';
  videoTitle?: string;
}

export function SignUpPromptDialog({
  open,
  onOpenChange,
  trigger = 'fullscreen',
  videoTitle,
}: SignUpPromptDialogProps) {
  const { auth } = useFirebase();
  const { toast } = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);

  const isFullscreenTrigger = trigger === 'fullscreen';

  const redirectUrl = typeof window !== 'undefined'
    ? encodeURIComponent(window.location.pathname + window.location.search)
    : '';

  const signupHref = redirectUrl ? `/signup?redirect=${redirectUrl}` : '/signup';
  const loginHref = redirectUrl ? `/login?redirect=${redirectUrl}` : '/login';

  const handleGoogleSignIn = async () => {
    if (!auth || googleLoading) return;
    setGoogleLoading(true);
    track('signup_prompt_clicked', { trigger, method: 'google' });
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await createUserProfile(result.user);
      toast({
        title: 'Welcome to AnimationReference!',
        description: `Signed in as ${result.user.displayName || result.user.email}`,
      });
      onOpenChange(false);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast({
          title: 'Sign in failed',
          description: err.message || 'Could not complete Google sign-in. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0b0914] border border-purple-500/30 text-white shadow-[0_25px_70px_rgba(0,0,0,0.9)] rounded-3xl p-6 sm:p-7">
        <DialogHeader className="text-center flex flex-col items-center">
          {/* Badge Icon */}
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500/25 via-pink-500/20 to-purple-600/30 rounded-2xl flex items-center justify-center mb-3.5 border border-purple-500/30 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
            {isFullscreenTrigger ? (
              <Maximize className="h-7 w-7 text-purple-300" />
            ) : (
              <Film className="h-7 w-7 text-purple-300" />
            )}
          </div>

          {/* Category Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 text-[11px] font-bold uppercase tracking-wider border border-purple-500/25 mb-2">
            <Sparkles className="h-3 w-3 text-purple-400" />
            <span>{isFullscreenTrigger ? 'Full-Screen Study' : 'Guest Previews Complete'}</span>
          </div>

          {/* Title */}
          <DialogTitle className="text-center text-xl sm:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-zinc-200">
            {isFullscreenTrigger ? 'Sign In to Watch in Full Screen' : 'Create Free Account to Keep Watching'}
          </DialogTitle>

          {/* Description */}
          <DialogDescription className="text-center text-xs sm:text-sm text-zinc-300 leading-relaxed mt-2 max-w-sm">
            {isFullscreenTrigger ? (
              <>
                Full-screen playback, frame-by-frame scrubbing, and custom speed controls are free with an animator account. Create yours in seconds!
              </>
            ) : (
              <>
                You&apos;ve watched your <strong className="text-white">8 free reference previews</strong>. Create a free account now to get <strong className="text-emerald-300">25 free full reference clips every day</strong> and unlimited moodboards!
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Benefits List */}
        <div className="mt-4 mb-5 space-y-2 bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 text-xs">
          <div className="flex items-center gap-2.5 text-zinc-200">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong>25 free reference clips</strong> every single day</span>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-200">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong>Full-screen player</strong> with frame-stepping (◀ ▶)</span>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-200">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Save to unlimited personal moodboards</span>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-200">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>100% free forever for animators & artists</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* 1-Click Google Sign In */}
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full h-11 rounded-xl bg-white hover:bg-zinc-100 text-black font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </Button>

          {/* Email Sign Up Option */}
          <Button
            asChild
            variant="outline"
            className="w-full h-11 rounded-xl border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Link
              href={signupHref}
              onClick={() => {
                track('signup_prompt_clicked', { trigger, method: 'email' });
                onOpenChange(false);
              }}
            >
              <span>Create Account with Email</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </Link>
          </Button>
        </div>

        {/* Existing User Sign In Link */}
        <div className="mt-4 text-center">
          <Link
            href={loginHref}
            onClick={() => onOpenChange(false)}
            className="text-xs text-zinc-400 hover:text-white transition-colors underline underline-offset-4"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

