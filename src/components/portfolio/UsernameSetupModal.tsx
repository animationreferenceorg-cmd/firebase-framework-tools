"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { updateUserProfileData } from '@/lib/portfolio-service';
import { UserProfile } from '@/lib/types';
import { Sparkles, ArrowRight, CheckCircle2, User } from 'lucide-react';

interface UsernameSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
  onUsernameSet: (username: string) => void;
}

export const UsernameSetupModal: React.FC<UsernameSetupModalProps> = ({
  open,
  onOpenChange,
  userProfile,
  onUsernameSet,
}) => {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const defaultSuggested =
        userProfile?.username ||
        userProfile?.displayName?.toLowerCase().replace(/[^a-z0-9_]/g, '') ||
        auth.currentUser?.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_]/g, '') ||
        '';
      setUsername(defaultSuggested);
    }
  }, [open, userProfile]);

  const cleanHandle = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanHandle) {
      toast({ title: 'Username required', description: 'Please enter a valid username handle.', variant: 'destructive' });
      return;
    }

    if (!auth.currentUser) return;

    setIsSaving(true);
    try {
      await updateUserProfileData(auth.currentUser.uid, { username: cleanHandle });

      try {
        const storageKey = `user_profile_${auth.currentUser.uid}`;
        const existingStr = localStorage.getItem(storageKey);
        const existing = existingStr ? JSON.parse(existingStr) : {};
        localStorage.setItem(storageKey, JSON.stringify({ ...existing, username: cleanHandle }));
      } catch (e) {}

      // Trigger automated welcome email via Resend
      if (auth.currentUser.email) {
        fetch('/api/send-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: auth.currentUser.email,
            displayName: userProfile?.displayName || auth.currentUser.displayName || 'Animator',
            username: cleanHandle,
          }),
        }).catch((err) => console.warn('Welcome email trigger skipped:', err));
      }

      toast({
        title: '🎉 Username Claimed!',
        description: `Your portfolio is now live at animationreference.org/${cleanHandle}`,
      });

      onUsernameSet(cleanHandle);
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error setting username', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-950 border border-purple-500/30 text-white p-6 rounded-3xl shadow-2xl backdrop-blur-2xl">
        <DialogHeader className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold w-fit">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>Welcome to Animator Portfolios</span>
          </div>

          <DialogTitle className="text-2xl font-black tracking-tight text-white">
            Choose Your Portfolio Handle
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs leading-relaxed">
            Claim your unique username handle so recruiters and directors can view your work directly at your personal URL.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          {/* Username Input Field */}
          <div className="space-y-2">
            <Label htmlFor="setup-username" className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
              <span>Your Portfolio URL</span>
              <span className="text-[10px] text-zinc-400 font-mono">
                animationreference.org/{cleanHandle || 'your_name'}
              </span>
            </Label>

            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-zinc-500 font-mono text-xs select-none">/</span>
              <Input
                id="setup-username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="your_name"
                className="bg-zinc-900 border-white/10 text-white text-sm h-12 pl-7 focus-within:ring-2 focus-within:ring-purple-500 rounded-2xl font-mono"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-zinc-500 font-normal">
              Letters, numbers, and underscores allowed. You can change this anytime in Edit Profile.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-2 bg-zinc-900/60 p-3.5 rounded-2xl border border-white/10 text-xs text-zinc-300 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Clean top-level ArtStation recruiter link</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
              <span>Shareable with 1-click clipboard copy</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSaving || !cleanHandle}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-purple-600/30 gap-2 cursor-pointer transition-all hover:scale-[1.02]"
          >
            {isSaving ? 'Claiming Handle...' : (
              <>
                Claim Username & Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
