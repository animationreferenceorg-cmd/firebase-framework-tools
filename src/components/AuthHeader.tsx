
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { User, Settings, Bookmark, Zap, LogOut, Edit3, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { DonateDialog } from './DonateDialog';
import { useUser } from '@/hooks/use-user';

export default function AuthHeader() {
  const { user, loading } = useAuth();
  const { auth } = useFirebase();
  const { toast } = useToast();
  const { userProfile, loading: userProfileLoading } = useUser();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const isPremium = userProfile?.isPremium;
  const isSjsuStudent = Boolean(
    userProfile?.isStudent || 
    userProfile?.tier === 'student_unlimited' || 
    userProfile?.school?.includes('SJSU') || 
    userProfile?.unlimitedAccess || 
    (userProfile?.studentEmail && userProfile.studentEmail.endsWith('@sjsu.edu'))
  );
  const likedCount = userProfile?.likedVideoIds?.length || 0;
  const savedCategoriesCount = userProfile?.likedCategoryIds?.length || 0;

  const tierInfo = (() => {
    if (isSjsuStudent) {
      return {
        badge: 'SJSU VIP',
        title: 'SJSU Unlimited Pass',
        price: '$0/mo (Free)',
        description: 'Unlimited SJSU Spartan VIP Partner Access.'
      };
    }
    if (!isPremium) {
      return {
        badge: 'BASIC',
        title: 'Basic Plan',
        price: 'Free',
        description: 'Basic access with 1 Moodboard and 5 Likes.'
      };
    }
    switch (userProfile?.tier) {
      case 'student_unlimited':
        return {
          badge: 'SJSU VIP',
          title: 'SJSU Unlimited Pass',
          price: '$0/mo (Free)',
          description: 'Unlimited SJSU Spartan VIP Partner Access.'
        };
      case 'tier5':
        return {
          badge: 'PRO',
          title: 'Pro Plan',
          price: '$5/mo',
          description: 'Unlimited Moodboards, Unlimited Likes & Reel Editor Studio.'
        };
      case 'tier2':
        return {
          badge: 'SUPER FAN',
          title: 'Super Fan Plan',
          price: '$2/mo',
          description: '6 Moodboards, 20 Likes & Priority Support.'
        };
      case 'tier1':
      default:
        return {
          badge: 'SUPPORTER',
          title: 'Supporter Plan',
          price: '$1/mo',
          description: '3 Moodboards, 10 Likes & Supporter Badge.'
        };
    }
  })();

  const handlePortal = async () => {
    if (isCheckingOut) return;
    setIsCheckingOut(true);
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ userId: user?.uid, returnUrl: window.location.href }),
      });
      const data = await response.json();
      if (data.url) window.location.assign(data.url);
      else throw new Error(data.error);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (loading || userProfileLoading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 md:gap-4">
      {user ? (
        <>
          <DonateDialog>
            <div className="animated-gradient-border p-[2px] rounded-full">
              <Button variant="outline" className="relative z-10 bg-background hover:bg-background/80 rounded-full h-9 px-4 text-xs font-bold">Donate</Button>
            </div>
          </DonateDialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-10 w-10 cursor-pointer border border-white/20 hover:border-purple-500/80 transition-colors shadow-lg">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} data-ai-hint="user avatar" />
                <AvatarFallback className="bg-purple-950 text-purple-200 font-bold">{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72 p-3 bg-zinc-950/95 border border-white/10 rounded-3xl shadow-2xl text-white backdrop-blur-2xl space-y-2">
              {/* Profile Card Header (Matching Screenshot) */}
              <div className="flex items-center justify-between p-2 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-11 w-11 border border-white/15">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback className="bg-purple-900 text-white font-bold">{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 text-left">
                    <p className="font-black text-sm text-white truncate leading-tight">{user.displayName || 'Animator'}</p>
                    <p className="text-xs text-zinc-400 font-medium truncate">{user.email || '@animator'}</p>
                  </div>
                </div>
                <Link href="/profile?edit=true">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white cursor-pointer">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <DropdownMenuSeparator className="bg-white/10" />

              {/* Menu Navigation Links */}
              <div className="space-y-1">
                <Link href="/profile">
                  <DropdownMenuItem className="flex items-center gap-3 p-2.5 rounded-2xl text-xs font-bold text-zinc-200 hover:text-white hover:bg-white/10 cursor-pointer transition-colors">
                    <User className="h-4 w-4 text-purple-400" />
                    <span>View Profile</span>
                  </DropdownMenuItem>
                </Link>

                <Link href="/profile?tab=settings">
                  <DropdownMenuItem className="flex items-center gap-3 p-2.5 rounded-2xl text-xs font-bold text-zinc-200 hover:text-white hover:bg-white/10 cursor-pointer transition-colors">
                    <Settings className="h-4 w-4 text-cyan-400" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </Link>

                <Link href="/list">
                  <DropdownMenuItem className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl text-xs font-bold text-zinc-200 hover:text-white hover:bg-white/10 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Bookmark className="h-4 w-4 text-amber-400 fill-amber-400/20 shrink-0" />
                      <span className="truncate">Saved Items & Moodboards</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {likedCount > 0 && (
                        <Badge className="bg-rose-950/80 text-rose-300 border border-rose-800/40 font-mono text-[9px] px-1.5 py-0 rounded-full font-bold">
                          ❤️ {likedCount}
                        </Badge>
                      )}
                      <Badge className="bg-purple-600 text-white font-mono text-[9px] px-1.5 py-0 rounded-full font-bold">
                        📌 {savedCategoriesCount}
                      </Badge>
                    </div>
                  </DropdownMenuItem>
                </Link>
              </div>

              <DropdownMenuSeparator className="bg-white/10" />

              {/* Membership Status Card (Matching Screenshot) */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-950/60 via-zinc-900 to-black border border-purple-500/30 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500 text-black font-extrabold text-[10px] shrink-0">
                      {tierInfo.badge}
                    </span>
                    <span className="text-xs font-bold text-white truncate">
                      {tierInfo.title}
                    </span>
                  </div>
                  <span className="text-xs font-black text-amber-400 font-mono shrink-0 ml-1">
                    {tierInfo.price}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-medium leading-normal">
                  {tierInfo.description}
                </p>
              </div>

              <DropdownMenuSeparator className="bg-white/10" />

              {/* Logout Button */}
              <DropdownMenuItem
                onClick={() => auth?.signOut()}
                className="flex items-center gap-3 p-2.5 rounded-2xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : (
        <div className="flex items-center gap-2 md:gap-4">
          <DonateDialog>
            <div className="animated-gradient-border p-[2px] rounded-full">
              <Button variant="outline" className="relative z-10 bg-background hover:bg-background/80 rounded-full h-9 px-4 text-xs font-bold">Donate</Button>
            </div>
          </DonateDialog>
          <Button asChild className="rounded-full h-9 px-5 text-xs font-bold bg-white text-black hover:bg-white/90">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
