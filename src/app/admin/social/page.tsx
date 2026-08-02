'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Video } from '@/lib/types';
import type { SocialPlatform, SocialPlatformConfig, SocialPostLog } from '@/lib/social/types';
import { generateAllCaptions } from '@/lib/social/captionBuilder';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Share2, Instagram, Twitter, Linkedin, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Send, Bot, Clock } from 'lucide-react';

export default function SocialAdminPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [captions, setCaptions] = useState<Record<SocialPlatform, string>>({
    instagram: '',
    facebook: '',
    twitter: '',
    linkedin: '',
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<SocialPlatform, boolean>>({
    instagram: true,
    facebook: false,
    twitter: true,
    linkedin: true,
  });

  const [platformConfig, setPlatformConfig] = useState<SocialPlatformConfig | null>(null);
  const [logs, setLogs] = useState<SocialPostLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [posting, setPosting] = useState<boolean>(false);
  const [botRunning, setBotRunning] = useState<boolean>(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch platform config status
      const configRes = await fetch('/api/social/status');
      const configData = await configRes.json();
      if (configData.config) {
        setPlatformConfig(configData.config);
      }

      // 2. Fetch videos from Firestore
      if (db) {
        const videoSnap = await getDocs(collection(db, 'videos'));
        const vList = videoSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Video))
          .filter(v => v.status === 'published' || !v.status);
        setVideos(vList);

        if (vList.length > 0) {
          setSelectedVideoId(vList[0].id);
          setSelectedVideo(vList[0]);
        }

        // 3. Fetch recent post logs
        const logSnap = await getDocs(query(collection(db, 'social_posts'), orderBy('createdAt', 'desc'), limit(15)));
        const lList = logSnap.docs.map(d => ({ id: d.id, ...d.data() } as SocialPostLog));
        setLogs(lList);
      }
    } catch (err) {
      console.error('Error fetching social admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update generated captions when selected video changes
  useEffect(() => {
    if (!selectedVideo) return;
    const generated = generateAllCaptions({
      title: selectedVideo.title,
      description: selectedVideo.description,
      authorName: selectedVideo.author_name || selectedVideo.uploader,
      tags: selectedVideo.tags,
      videoUrl: selectedVideo.videoUrl,
      pageUrl: `https://animationreference.org/video/${selectedVideo.id}`,
    });
    setCaptions(generated);
  }, [selectedVideo]);

  const handleVideoSelect = (vId: string) => {
    setSelectedVideoId(vId);
    const found = videos.find(v => v.id === vId) || null;
    setSelectedVideo(found);
  };

  const handlePlatformToggle = (platform: SocialPlatform) => {
    setSelectedPlatforms(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  const handleCaptionChange = (platform: SocialPlatform, value: string) => {
    setCaptions(prev => ({ ...prev, [platform]: value }));
  };

  const handlePostNow = async () => {
    if (!selectedVideoId) {
      toast({ variant: 'destructive', title: 'Select a Video', description: 'Please select a video clip to post.' });
      return;
    }

    const activePlatforms = (Object.keys(selectedPlatforms) as SocialPlatform[]).filter(p => selectedPlatforms[p]);

    if (activePlatforms.length === 0) {
      toast({ variant: 'destructive', title: 'No Platforms Selected', description: 'Select at least one platform to publish to.' });
      return;
    }

    setPosting(true);
    try {
      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: selectedVideoId,
          platforms: activePlatforms,
          customCaptions: captions,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast({
          title: 'Post Dispatched!',
          description: `Dispatched post for "${selectedVideo?.title}" to selected platforms.`,
        });
        fetchData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Posting Error',
          description: data.error || 'Failed to dispatch post.',
        });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Network error while posting.' });
    } finally {
      setPosting(false);
    }
  };

  const handleTriggerBotNow = async () => {
    setBotRunning(true);
    try {
      const res = await fetch('/api/social/cron');
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: 'Automated Bot Triggered',
          description: data.message || 'Daily bot post completed.',
        });
        fetchData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Bot Trigger Info',
          description: data.message || data.error || 'Bot execution completed.',
        });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to trigger daily bot.' });
    } finally {
      setBotRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="h-6 w-6 text-primary" />
            Social Media Manager & Daily Auto-Poster
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Direct Platform Integration (Meta Graph API, X API v2, LinkedIn API) for daily animation reference posts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
          <Button size="sm" onClick={handleTriggerBotNow} disabled={botRunning} className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <Bot className="h-4 w-4" />
            {botRunning ? 'Running Bot...' : 'Run Daily Bot Now'}
          </Button>
        </div>
      </div>

      {/* Platform Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Instagram / Meta Card */}
        <Card className="border-l-4 border-l-pink-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-500" />
                Meta / Instagram Graph API
              </span>
              {platformConfig?.instagram.enabled ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">Connected</Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300">Needs Env Setup</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {platformConfig?.instagram.enabled ? (
              <p className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Instagram Business account configured
              </p>
            ) : (
              <p className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" /> Add INSTAGRAM_ACCOUNT_ID & META_PAGE_ACCESS_TOKEN
              </p>
            )}
          </CardContent>
        </Card>

        {/* X (Twitter) Card */}
        <Card className="border-l-4 border-l-sky-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Twitter className="h-5 w-5 text-sky-500" />
                X (Twitter) API v2
              </span>
              {platformConfig?.twitter.enabled ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">Connected</Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300">Needs Env Setup</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {platformConfig?.twitter.enabled ? (
              <p className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> X API credentials active
              </p>
            ) : (
              <p className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" /> Add X_API_KEY & X_ACCESS_TOKEN
              </p>
            )}
          </CardContent>
        </Card>

        {/* LinkedIn Card */}
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Linkedin className="h-5 w-5 text-blue-600" />
                LinkedIn REST API
              </span>
              {platformConfig?.linkedin.enabled ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">Connected</Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300">Needs Env Setup</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {platformConfig?.linkedin.enabled ? (
              <p className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> LinkedIn Org credentials active
              </p>
            ) : (
              <p className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" /> Add LINKEDIN_ACCESS_TOKEN & URN
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Composer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Select Clip & Destination Platforms */}
        <Card className="lg:col-span-1 space-y-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              1-Click Clip Publisher
            </CardTitle>
            <CardDescription>Select a video from your library to format and post.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Reference Video</Label>
              <Select value={selectedVideoId} onValueChange={handleVideoSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select video clip..." />
                </SelectTrigger>
                <SelectContent>
                  {videos.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVideo && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-xs font-medium text-foreground truncate">{selectedVideo.title}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{selectedVideo.description}</p>
                {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedVideo.tags.slice(0, 4).map(t => (
                      <Badge key={t} variant="secondary" className="text-[10px]">#{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Platforms</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="instagram"
                  checked={selectedPlatforms.instagram}
                  onCheckedChange={() => handlePlatformToggle('instagram')}
                />
                <label htmlFor="instagram" className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-500" /> Instagram Reels / Meta
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="twitter"
                  checked={selectedPlatforms.twitter}
                  onCheckedChange={() => handlePlatformToggle('twitter')}
                />
                <label htmlFor="twitter" className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-sky-500" /> X (Twitter)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="linkedin"
                  checked={selectedPlatforms.linkedin}
                  onCheckedChange={() => handlePlatformToggle('linkedin')}
                />
                <label htmlFor="linkedin" className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-blue-600" /> LinkedIn
                </label>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              onClick={handlePostNow}
              disabled={posting || !selectedVideoId}
            >
              <Send className="h-4 w-4" />
              {posting ? 'Publishing Post...' : 'Publish to Selected Platforms'}
            </Button>
          </CardFooter>
        </Card>

        {/* Right Column: Smart Caption Generator & Platform Previews */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Smart Caption Generator Previews
            </CardTitle>
            <CardDescription>
              Tailored platform-specific captions generated automatically. Edit captions directly before posting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="instagram" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="instagram" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-500" /> Instagram
                </TabsTrigger>
                <TabsTrigger value="twitter" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-sky-500" /> X (Twitter)
                </TabsTrigger>
                <TabsTrigger value="linkedin" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-blue-600" /> LinkedIn
                </TabsTrigger>
              </TabsList>

              <TabsContent value="instagram" className="space-y-2">
                <Textarea
                  value={captions.instagram}
                  onChange={(e) => handleCaptionChange('instagram', e.target.value)}
                  rows={8}
                  className="font-mono text-xs bg-background"
                  placeholder="Instagram caption..."
                />
                <p className="text-[11px] text-muted-foreground">
                  Includes clip title, creator credit, link-in-bio prompt, and high-volume animation hashtags.
                </p>
              </TabsContent>

              <TabsContent value="twitter" className="space-y-2">
                <Textarea
                  value={captions.twitter}
                  onChange={(e) => handleCaptionChange('twitter', e.target.value)}
                  rows={6}
                  className="font-mono text-xs bg-background"
                  placeholder="X Tweet caption..."
                />
                <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                  <span>Concise format under 280 characters with link back to animationreference.org.</span>
                  <span className={captions.twitter.length > 280 ? 'text-destructive font-bold' : ''}>
                    {captions.twitter.length}/280 chars
                  </span>
                </div>
              </TabsContent>

              <TabsContent value="linkedin" className="space-y-2">
                <Textarea
                  value={captions.linkedin}
                  onChange={(e) => handleCaptionChange('linkedin', e.target.value)}
                  rows={8}
                  className="font-mono text-xs bg-background"
                  placeholder="LinkedIn caption..."
                />
                <p className="text-[11px] text-muted-foreground">
                  Industry-focused breakdown targeting animators, VFX artists, and game developers.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Post Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Recent Distribution Logs
          </CardTitle>
          <CardDescription>History of manual and automated daily bot posts.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground bg-muted/40 rounded-lg">
              No social posts logged yet. Use 1-Click Publisher above or run the Daily Bot.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, idx) => (
                <div key={log.id || idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-lg border bg-card text-xs gap-2">
                  <div>
                    <span className="font-semibold text-foreground">{log.videoTitle}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={log.triggeredBy === 'bot' ? 'secondary' : 'outline'} className="text-[10px]">
                        {log.triggeredBy === 'bot' ? '🤖 Daily Bot' : '👤 Manual'}
                      </Badge>
                      <span className="text-muted-foreground">
                        {new Date(log.postedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {log.results?.map((res, rIdx) => (
                      <Badge
                        key={rIdx}
                        variant={res.success ? 'default' : 'destructive'}
                        className="text-[10px] capitalize"
                      >
                        {res.platform}: {res.success ? 'Success' : 'Failed'}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
