
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Video,
  LayoutGrid,
  BookOpen,
  Box,
  Users,
  Layers,
  Sparkles,
  UserCheck,
  TrendingUp,
  Calendar,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Mail,
} from 'lucide-react';
import { MoodboardService } from '@/lib/moodboard-service';
import { useAuth } from '@/hooks/use-auth';

interface UserStats {
  totalAccounts: number;
  proCount: number;
  freeCount: number;
  newThisWeek: number;
  newThisMonth: number;
  recentSignups: Array<{
    uid: string;
    email: string | null;
    displayName: string | null;
    createdAt: number;
    lastSignInTime: number | null;
    provider: string;
    isPro: boolean;
  }>;
}

export default function AdminPage() {
  const { user: authUser } = useAuth();
  const [boardStats, setBoardStats] = useState<{ totalBoards: number; totalItems: number; uniqueUsers: number } | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      try {
        const boardPromise = MoodboardService.getGlobalStats();

        let statsPromise: Promise<UserStats | null> = Promise.resolve(null);
        if (authUser) {
          const idToken = await authUser.getIdToken();
          statsPromise = fetch('/api/admin/user-stats', {
            headers: { Authorization: `Bearer ${idToken}` },
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
        }

        const [bStats, uStats] = await Promise.all([boardPromise, statsPromise]);
        if (active) {
          setBoardStats(bStats);
          setUserStats(uStats);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load admin stats:', err);
        if (active) setLoading(false);
      }
    }

    loadStats();
    return () => {
      active = false;
    };
  }, [authUser]);

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Admin Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time accounts, signup growth, content moderation, and library telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="border-white/10 text-xs">
            <Link href="/admin/users">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Manage All Users
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-500 text-xs text-white">
            <a
              href="https://console.firebase.google.com/project/aniamtion-reference/authentication/users"
              target="_blank"
              rel="noopener noreferrer"
            >
              Firebase Console <ExternalLink className="w-3 h-3 ml-1.5" />
            </a>
          </Button>
        </div>
      </div>

      {/* User Accounts & Growth Metrics */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-purple-400" />
          Registered Users &amp; Growth
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-950/25 to-zinc-950">
            <CardHeader className="pb-2">
              <CardDescription className="text-purple-300 font-bold text-xs uppercase tracking-wider">
                Total Registered Users
              </CardDescription>
              <CardTitle className="text-3xl sm:text-4xl font-black text-white">
                {loading ? <span className="animate-pulse">...</span> : (userStats?.totalAccounts ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-400">Total accounts created in database</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-950/25 to-zinc-950">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-emerald-300 font-bold text-xs uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" />
                Signups This Week
              </CardDescription>
              <CardTitle className="text-3xl sm:text-4xl font-black text-emerald-300">
                {loading ? <span className="animate-pulse">...</span> : `+${userStats?.newThisWeek ?? 0}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-400">Past 7 days</p>
            </CardContent>
          </Card>

          <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-950/25 to-zinc-950">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                Signups This Month
              </CardDescription>
              <CardTitle className="text-3xl sm:text-4xl font-black text-indigo-300">
                {loading ? <span className="animate-pulse">...</span> : `+${userStats?.newThisMonth ?? 0}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-400">Past 30 days</p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-950/25 to-zinc-950">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-amber-300 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Pro Subscribers
              </CardDescription>
              <CardTitle className="text-3xl sm:text-4xl font-black text-amber-300">
                {loading ? <span className="animate-pulse">...</span> : (userStats?.proCount ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-400">
                {userStats?.freeCount ?? 0} free tier animators
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Latest Signups List & Moodboard Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Latest Registered Users */}
        <div className="lg:col-span-7">
          <Card className="border-white/10 bg-zinc-950/70 h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-white">Latest Registered Animators</CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Most recent accounts created on the site
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs text-purple-400 hover:text-purple-300">
                <Link href="/admin/users">
                  View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2 py-4">
                  <div className="h-9 rounded-lg bg-white/5 animate-pulse" />
                  <div className="h-9 rounded-lg bg-white/5 animate-pulse" />
                  <div className="h-9 rounded-lg bg-white/5 animate-pulse" />
                </div>
              ) : userStats?.recentSignups?.length ? (
                <div className="divide-y divide-white/5">
                  {userStats.recentSignups.map((su) => (
                    <div key={su.uid} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-3">
                        <div className="font-semibold text-white truncate">
                          {su.displayName || 'Animator'}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono truncate">
                          {su.email || 'No email'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono text-zinc-400 border-white/10">
                          {su.provider}
                        </Badge>
                        {su.isPro ? (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                            Pro
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-zinc-400 border-white/10 text-[10px]">
                            Free
                          </Badge>
                        )}
                        <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                          {new Date(su.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 py-6 text-center">No signup telemetry found yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Content & Workspace Highlights */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-950/20 to-zinc-950">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
                <Box className="w-4 h-4 text-indigo-400" />
                Total Moodboards Created
              </CardDescription>
              <CardTitle className="text-2xl font-black text-white">
                {loading ? <span className="animate-pulse">...</span> : (boardStats?.totalBoards ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-400">
                {boardStats?.totalItems ?? 0} total clips &amp; reference assets pinned
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-zinc-950">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-emerald-300 font-semibold text-xs uppercase tracking-wider">
                <Users className="w-4 h-4 text-emerald-400" />
                Active Moodboard Creators
              </CardDescription>
              <CardTitle className="text-2xl font-black text-white">
                {loading ? <span className="animate-pulse">...</span> : (boardStats?.uniqueUsers ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-400">Users actively building study spaces</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Admin Modules Navigation */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Quick Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-white/10 hover:border-purple-500/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-white">
                <Users className="w-4 h-4 text-purple-400" />
                User Accounts
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect user emails, sync Stripe subscriptions, view roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline" className="w-full text-xs">
                <Link href="/admin/users">Manage Users</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 hover:border-purple-500/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-white">
                <Video className="w-4 h-4 text-purple-400" />
                Manage Videos
              </CardTitle>
              <CardDescription className="text-xs">
                Add, edit, or remove videos and short films from the library.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline" className="w-full text-xs">
                <Link href="/admin/videos">Go to Videos</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 hover:border-purple-500/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-white">
                <LayoutGrid className="w-4 h-4 text-purple-400" />
                Manage Categories
              </CardTitle>
              <CardDescription className="text-xs">
                Organize, create, and update categories for browsing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline" className="w-full text-xs">
                <Link href="/admin/categories">Go to Categories</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 hover:border-purple-500/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Exclusive VIP Links
              </CardTitle>
              <CardDescription className="text-xs">
                Generate 1-time free access links and track who claims them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline" className="w-full text-xs">
                <Link href="/admin/exclusive-links">Manage VIP Links</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

