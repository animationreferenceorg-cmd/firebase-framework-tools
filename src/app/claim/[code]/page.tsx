'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Film,
  Zap,
  ArrowRight,
  Layers,
  Download,
  Eye,
  Lock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface Props {
  params: Promise<{ code: string }>;
}

export default function ClaimExclusiveLinkPage({ params }: Props) {
  const resolvedParams = use(params);
  const code = resolvedParams.code;

  const { user, loading: authLoading } = useAuth();
  const { userProfile, mutate } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [claimStatus, setClaimStatus] = useState<
    'checking' | 'valid' | 'redeemed' | 'revoked' | 'expired' | 'not_found' | 'claimed_success'
  >('checking');
  const [linkInfo, setLinkInfo] = useState<{
    plan?: string;
    note?: string | null;
    durationMonths?: number | null;
    redeemedAt?: string | null;
    message?: string;
  }>({});
  const [claiming, setClaiming] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Validate the code on mount
  useEffect(() => {
    async function validateCode() {
      if (!code) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/exclusive-links/validate?code=${encodeURIComponent(code)}`);
        const data = await res.json();

        if (data.valid) {
          setClaimStatus('valid');
          setLinkInfo({
            plan: data.plan,
            note: data.note,
            durationMonths: data.durationMonths,
          });
        } else {
          setClaimStatus(data.status || 'not_found');
          setLinkInfo({
            redeemedAt: data.redeemedAt,
            message: data.message,
          });
        }
      } catch (err) {
        setClaimStatus('not_found');
      } finally {
        setLoading(false);
      }
    }

    validateCode();
  }, [code]);

  const handleClaim = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in or create an account to activate your exclusive access.',
        variant: 'destructive',
      });
      return;
    }

    setClaiming(true);
    try {
      const idToken = await user.getIdToken(true);
      const res = await fetch('/api/exclusive-links/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === 'ALREADY_REDEEMED') {
          setClaimStatus('redeemed');
        }
        throw new Error(data.message || 'Could not claim exclusive link.');
      }

      setClaimStatus('claimed_success');
      toast({
        title: 'Pro Access Activated!',
        description: 'Welcome to Animation Reference Pro! Your account now has full access.',
      });

      // Refresh the active user profile in memory
      mutate?.();
    } catch (err: any) {
      toast({
        title: 'Claim Failed',
        description: err?.message || 'An error occurred while claiming your link.',
        variant: 'destructive',
      });
    } finally {
      setClaiming(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({
        title: 'Signed in!',
        description: 'Now you can activate your exclusive Pro access.',
      });
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      toast({
        title: 'Sign-in failed',
        description: err?.message || 'Could not sign in with Google.',
        variant: 'destructive',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07060b] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-lg z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/home" className="inline-flex items-center gap-2 mb-3 group">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 group-hover:scale-105 transition-transform">
              <Film className="h-5 w-5" />
            </span>
            <span className="text-xl font-black tracking-tight text-white group-hover:text-purple-300 transition-colors">
              Animation Reference
            </span>
          </Link>
        </div>

        {/* Card Body */}
        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40 relative overflow-hidden">
          {/* 1. Loading State */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
              <p className="text-sm font-semibold text-zinc-300">Checking exclusive invitation…</p>
            </div>
          ) : claimStatus === 'claimed_success' ? (
            /* 2. Success State */
            <div className="text-center py-4 space-y-6">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 grid place-items-center text-emerald-400 shadow-lg shadow-emerald-500/20 animate-in zoom-in-90">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300 mb-3">
                  <ShieldCheck className="h-3.5 w-3.5" /> Pro Access Activated
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Welcome to Pro!
                </h1>
                <p className="text-sm text-zinc-400 mt-2 max-w-sm mx-auto leading-relaxed">
                  Your account has been upgraded with complimentary Pro access. All studio tools, private workspaces, and reference downloads are unlocked.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={() => router.push('/home')}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-purple-600/30"
                >
                  Explore Library <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/moodboard')}
                  className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold h-11 rounded-xl"
                >
                  My Moodboards
                </Button>
              </div>
            </div>
          ) : claimStatus === 'valid' ? (
            /* 3. Valid Invitation State */
            <div className="space-y-6">
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-purple-300 mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" /> Exclusive Invitation
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Free Pro Access Pass
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                  You’ve been sent a one-time exclusive invite. Activate it below to unlock all professional animator tools.
                </p>
              </div>

              {/* Perks List */}
              <div className="space-y-2.5 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs sm:text-sm">
                <div className="flex items-center gap-3 text-zinc-200">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-purple-500/20 text-purple-300">
                    <Layers className="h-3.5 w-3.5" />
                  </div>
                  <span>Unlimited Reference Boards & Private Workspaces</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-200">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-pink-500/20 text-pink-300">
                    <Eye className="h-3.5 w-3.5" />
                  </div>
                  <span>Frame-by-Frame Scrubbing, Stepping & Onion Skinning</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-200">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-amber-300">
                    <Download className="h-3.5 w-3.5" />
                  </div>
                  <span>Full-Resolution MP4 Downloads & Clean Exports</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-200">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-500/20 text-emerald-300">
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                  <span>Zero View Limits & Unrestricted Library Streaming</span>
                </div>
              </div>

              {/* Auth / Claim Action */}
              {user ? (
                <div className="space-y-3 pt-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Activating for:</span>
                    <span className="font-semibold text-white truncate max-w-[220px]">
                      {user.email || user.displayName || 'Current account'}
                    </span>
                  </div>

                  <Button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-sm h-12 rounded-xl shadow-xl shadow-purple-600/30 gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    {claiming ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Activating Your Pro Pass…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Claim Free Pro Access
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-center text-zinc-400">
                    Sign in or create a free account to activate this pass.
                  </p>

                  <Button
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    variant="outline"
                    className="w-full border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold h-11 rounded-xl gap-2"
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
                    Continue with Google
                  </Button>

                  <div className="relative text-center my-2">
                    <span className="text-[11px] text-zinc-500 uppercase tracking-wider bg-[#0d0c13] px-2">
                      or
                    </span>
                  </div>

                  <Link href={`/login?redirect=/claim/${encodeURIComponent(code)}`} className="block">
                    <Button
                      variant="secondary"
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-11 rounded-xl"
                    >
                      Sign In with Email
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : claimStatus === 'redeemed' ? (
            /* 4. Already Claimed State */
            <div className="text-center py-4 space-y-5">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 grid place-items-center text-amber-400">
                <AlertTriangle className="h-7 w-7" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300 mb-2">
                  Already Claimed
                </span>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  This Link Has Already Been Used
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-sm mx-auto leading-relaxed">
                  This exclusive invite was a single-use link that has already been redeemed by another account. One-time links cannot be shared or reused.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Link href="/home" className="block">
                  <Button className="w-full bg-white/10 hover:bg-white/20 text-white font-bold h-11 rounded-xl">
                    Browse Free Library
                  </Button>
                </Link>
                <Link href="/pricing" className="block">
                  <Button variant="ghost" className="w-full text-zinc-400 hover:text-white text-xs">
                    View Pro Plans
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* 5. Invalid / Expired / Revoked */
            <div className="text-center py-4 space-y-5">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 grid place-items-center text-red-400">
                <XCircle className="h-7 w-7" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1 text-xs font-bold text-red-300 mb-2">
                  Link Unavailable
                </span>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {claimStatus === 'expired' ? 'Invite Has Expired' : 'Invalid Link'}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-sm mx-auto leading-relaxed">
                  {linkInfo.message || 'This exclusive link could not be verified or is no longer active.'}
                </p>
              </div>

              <div className="pt-2">
                <Link href="/home" className="block">
                  <Button className="w-full bg-white/10 hover:bg-white/20 text-white font-bold h-11 rounded-xl">
                    Return to Home
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-zinc-500 mt-6">
          One-time exclusive links grant full access to Animation Reference tools.
        </p>
      </div>
    </div>
  );
}
