'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Mail,
  Send,
  Sparkles,
  Users,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export default function BroadcastAdminPage() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState<{ totalAccounts: number; freeCount: number; proCount: number; promoPreviewHtml: string } | null>(null);

  // Form states
  const [segment, setSegment] = useState<'free' | 'pro' | 'all'>('free');
  const [template, setTemplate] = useState<'one_dollar_promo' | 'custom'>('one_dollar_promo');
  const [subject, setSubject] = useState('Your Animation Reference Pro pass is ready');
  const [customMessage, setCustomMessage] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'staggered_6am' | 'immediate'>('staggered_6am');

  // Actions
  const [sendingTest, setSendingTest] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sentCount: number; failedCount: number; total: number } | null>(null);

  useEffect(() => {
    async function loadStats() {
      if (!authUser) return;
      try {
        const idToken = await authUser.getIdToken();
        const res = await fetch('/api/admin/broadcast', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          if (authUser.email) setTestEmail(authUser.email);
        }
      } catch (err) {
        console.error('Failed to load broadcast stats:', err);
      } finally {
        setLoadingStats(false);
      }
    }

    loadStats();
  }, [authUser]);

  const recipientCount = segment === 'free'
    ? (stats?.freeCount ?? 1981)
    : segment === 'pro'
    ? (stats?.proCount ?? 46)
    : (stats?.totalAccounts ?? 2037);

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast({ title: 'Invalid Email', description: 'Enter a valid test email address.', variant: 'destructive' });
      return;
    }

    setSendingTest(true);
    try {
      const idToken = await authUser?.getIdToken();
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          action: 'test',
          targetEmail: testEmail.trim(),
          template,
          subject,
          customMessage: customMessage.trim() || undefined,
          scheduleMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to send test email');
      }

      toast({
        title: 'Test Email Sent! 🚀',
        description: `Check ${testEmail} to view the rendered email.`,
      });
    } catch (err: any) {
      toast({
        title: 'Send Failed',
        description: err.message || 'Could not send test email.',
        variant: 'destructive',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleBroadcast = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to send this email to all ${recipientCount.toLocaleString()} ${segment} accounts?`
    );
    if (!confirmed) return;

    setBroadcasting(true);
    setBroadcastResult(null);

    try {
      const idToken = await authUser?.getIdToken();
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          action: 'broadcast',
          segment,
          template,
          subject,
          customMessage: customMessage.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Broadcast failed');
      }

      setBroadcastResult({
        sentCount: data.sentCount,
        failedCount: data.failedCount,
        total: data.totalRecipients,
      });

      toast({
        title: 'Broadcast Complete! 🎉',
        description: `Successfully delivered ${data.sentCount} emails (${data.failedCount} failed).`,
      });
    } catch (err: any) {
      toast({
        title: 'Broadcast Error',
        description: err.message || 'Error occurred during broadcast.',
        variant: 'destructive',
      });
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <Mail className="w-7 h-7 text-purple-400" />
            Email Broadcasts &amp; Newsletters
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Send promotional campaigns, product drops, and sales funnels powered by Resend.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-3 py-1">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Resend Connected (@animationreference.org)
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Campaign Builder */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-white/10 bg-zinc-950/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-white">1. Select Target Audience</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Choose which user segment will receive this email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSegment('free')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    segment === 'free'
                      ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-950/40'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="text-xs font-bold text-purple-300">Free Accounts</div>
                  <div className="text-xl font-black text-white mt-1">
                    {loadingStats ? '...' : (stats?.freeCount ?? 1981).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Sales funnel target</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSegment('pro')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    segment === 'pro'
                      ? 'border-amber-500 bg-amber-500/15 shadow-lg shadow-amber-950/40'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="text-xs font-bold text-amber-300">Pro Subscribers</div>
                  <div className="text-xl font-black text-white mt-1">
                    {loadingStats ? '...' : (stats?.proCount ?? 46).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">VIP updates</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSegment('all')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    segment === 'all'
                      ? 'border-indigo-500 bg-indigo-500/15 shadow-lg shadow-indigo-950/40'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="text-xs font-bold text-indigo-300">All Accounts</div>
                  <div className="text-xl font-black text-white mt-1">
                    {loadingStats ? '...' : (stats?.totalAccounts ?? 2037).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Full community</div>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-zinc-950/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-white">2. Campaign Content</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Configure the subject line and promotional pitch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="subject" className="text-xs font-bold text-zinc-300">
                  Email Subject Line
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-xs h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customNote" className="text-xs font-bold text-zinc-300">
                  Custom Personal Message (Optional)
                </Label>
                <Textarea
                  id="customNote"
                  placeholder="Add a personalized intro or message to animators..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-xs min-h-[90px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Test & Broadcast Controls */}
          <Card className="border-purple-500/30 bg-purple-950/15">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-400" /> 3. Test &amp; Send Broadcast
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Test Send */}
              <div className="space-y-2 pb-4 border-b border-white/10">
                <Label htmlFor="testEmail" className="text-xs font-bold text-zinc-300">
                  Send a Single Test to Your Inbox First:
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="testEmail"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="you@studio.com"
                    className="bg-white/5 border-white/10 text-white text-xs h-10"
                  />
                  <Button
                    onClick={handleSendTest}
                    disabled={sendingTest}
                    variant="outline"
                    className="h-10 px-4 text-xs font-bold shrink-0 border-purple-500/30 hover:bg-purple-500/20"
                  >
                    {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                    Send Test
                  </Button>
                </div>
              </div>

              {/* Schedule Mode Selector */}
              <div className="space-y-2 pb-4 border-b border-white/10">
                <Label className="text-xs font-bold text-zinc-300">
                  Delivery Schedule &amp; Timezone Optimization:
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleMode('staggered_6am')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      scheduleMode === 'staggered_6am'
                        ? 'border-emerald-500 bg-emerald-500/15 shadow-md'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <span>⚡ 6:00 AM Global Wave Stagger</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                      Delivers at 6:00 AM – 8:00 AM recipient local time (Europe now, US East in 3h, US West in 6h, Asia tonight).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScheduleMode('immediate')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      scheduleMode === 'immediate'
                        ? 'border-purple-500 bg-purple-500/15 shadow-md'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs font-bold text-purple-300">
                      🚀 Send All Immediately
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                      Sends all recipients right now in batched sequences with rate-limit pauses.
                    </p>
                  </button>
                </div>
              </div>

              {/* Full Broadcast */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span>Selected Audience:</span>
                  <strong className="text-white font-mono">{recipientCount.toLocaleString()} {segment} accounts</strong>
                </div>

                {broadcastResult && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Broadcast Sent: {broadcastResult.sentCount} delivered, {broadcastResult.failedCount} errors.</span>
                  </div>
                )}

                <Button
                  onClick={handleBroadcast}
                  disabled={broadcasting}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-sm rounded-xl shadow-lg shadow-purple-900/50 cursor-pointer gap-2"
                >
                  {broadcasting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending to {recipientCount.toLocaleString()} Animators…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Broadcast to {recipientCount.toLocaleString()} Animators
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Email Preview */}
        <div className="lg:col-span-5">
          <Card className="border-white/10 bg-zinc-950/70 sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" />
                Live Email Preview
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                What animators will see in their inboxes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-white/10 bg-[#07060b] overflow-hidden max-h-[620px] overflow-y-auto">
                <div className="p-3 bg-zinc-900/70 border-b border-white/10 text-[11px] text-zinc-400 space-y-1">
                  <div><strong>From:</strong> Animation Reference &lt;team@animationreference.org&gt;</div>
                  <div><strong>Subject:</strong> {subject}</div>
                </div>
                <iframe
                  title="Email Preview"
                  srcDoc={stats?.promoPreviewHtml || '<p style="color:white;padding:20px;">Loading preview...</p>'}
                  className="w-full h-[520px] border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

