'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Film,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // 1. First attempt to call the branded Resend password reset API
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      if (!res.ok) {
        // Fallback directly to client Firebase Auth if API had an issue
        if (auth) {
          await sendPasswordResetEmail(auth, cleanEmail, {
            url: `${window.location.origin}/login?reset=success`,
          });
        }
      }

      setSubmitted(true);
      toast({
        title: 'Check Your Email',
        description: 'If an account exists, a password reset link has been sent.',
      });
    } catch (err: any) {
      console.warn('Password reset fallback attempt:', err);
      // Try client SDK as fallback
      try {
        if (auth) {
          await sendPasswordResetEmail(auth, cleanEmail);
          setSubmitted(true);
          return;
        }
      } catch (fallbackErr: any) {
        console.error('All reset attempts failed:', fallbackErr);
      }

      toast({
        title: 'Reset link requested',
        description: 'If an account exists with this email, you will receive reset instructions shortly.',
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07060b] text-white flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/home" className="inline-flex items-center gap-2 group mb-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 group-hover:scale-105 transition-transform">
              <Film className="h-5 w-5" />
            </span>
            <span className="text-xl font-black tracking-tight text-white group-hover:text-purple-300 transition-colors">
              Animation Reference
            </span>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Reset Your Password
          </h1>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Enter your account email and we&apos;ll send you a secure link to create a new password.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40">
          {submitted ? (
            <div className="text-center space-y-5 py-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 grid place-items-center text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white">Reset Link Dispatched</h2>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  We sent instructions to <strong className="text-white font-mono">{email}</strong>. Please check your inbox (and spam folder) within the next few minutes.
                </p>
              </div>

              <div className="pt-3 space-y-2">
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-purple-600/30 gap-2 cursor-pointer"
                >
                  <Link href="/login">
                    Return to Sign In <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setSubmitted(false)}
                  className="w-full text-xs text-zinc-400 hover:text-white"
                >
                  Didn&apos;t receive it? Try another email
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="email" className="text-xs font-bold text-zinc-300">
                  Account Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="animator@studio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 text-xs font-medium"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-purple-900/50 cursor-pointer gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Reset Link…
                  </>
                ) : (
                  <>
                    Send Password Reset Link
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
