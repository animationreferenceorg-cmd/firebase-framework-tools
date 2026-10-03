
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Video, LayoutGrid, BookOpen, Box, Users, Layers, Sparkles } from 'lucide-react';
import { MoodboardService } from '@/lib/moodboard-service';

export default function AdminPage() {
  const [boardStats, setBoardStats] = useState<{ totalBoards: number; totalItems: number; uniqueUsers: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let active = true;
    MoodboardService.getGlobalStats().then((stats) => {
      if (active) {
        setBoardStats(stats);
        setLoadingStats(false);
      }
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the Animation Reference content management system. Monitor analytics, manage videos, categories, and moodboards.</p>
      </div>

      {/* Analytics Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-zinc-950">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-purple-300 font-semibold text-xs uppercase tracking-wider">
              <Box className="w-4 h-4 text-purple-400" />
              Total Moodboards
            </CardDescription>
            <CardTitle className="text-3xl font-black text-white">
              {loadingStats ? <span className="animate-pulse">...</span> : (boardStats?.totalBoards ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-400">Shot study & reference boards created</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-zinc-950">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs uppercase tracking-wider">
              <Layers className="w-4 h-4 text-amber-400" />
              Clips in Moodboards
            </CardDescription>
            <CardTitle className="text-3xl font-black text-white">
              {loadingStats ? <span className="animate-pulse">...</span> : (boardStats?.totalItems ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-400">Total animation references pinned</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-zinc-950">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-emerald-300 font-semibold text-xs uppercase tracking-wider">
              <Users className="w-4 h-4 text-emerald-400" />
              Active Board Users
            </CardDescription>
            <CardTitle className="text-3xl font-black text-white">
              {loadingStats ? <span className="animate-pulse">...</span> : (boardStats?.uniqueUsers ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-400">Animators who have active workspaces</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video />
              Manage Videos
            </CardTitle>
            <CardDescription>Add, edit, or remove videos and short films from the library.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
                <Link href="/admin/videos">Go to Videos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <LayoutGrid />
                Manage Categories
            </CardTitle>
            <CardDescription>Organize, create, and update the content categories for browsing.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button asChild>
                <Link href="/admin/categories">Go to Categories</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen />
              Articles
            </CardTitle>
            <CardDescription>Create and manage articles optimized to rank in search engines (blog posts).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/blog">Go to Articles</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="text-purple-400" />
              Moodboard Studio
            </CardTitle>
            <CardDescription>Open the interactive infinite board workspace and test features.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-purple-600 hover:bg-purple-500">
              <Link href="/moodboard">Launch Boards</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
