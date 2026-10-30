'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Key,
  Copy,
  Check,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Clock,
  UserCheck,
  AlertCircle,
  Trash2,
  Sparkles,
  Link2,
} from 'lucide-react';
import type { ExclusiveLink } from '@/lib/types';

type LinkWithUrl = ExclusiveLink & { claimUrl: string };

export default function ExclusiveLinksAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [links, setLinks] = useState<LinkWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unclaimed' | 'claimed' | 'revoked'>('all');

  // Generation Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createNote, setCreateNote] = useState('');
  const [createCount, setCreateCount] = useState('1');
  const [createDuration, setCreateDuration] = useState('lifetime');
  const [createExpires, setCreateExpires] = useState('none');
  const [creating, setCreating] = useState(false);

  // Newly generated links display
  const [newlyCreated, setNewlyCreated] = useState<LinkWithUrl[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin/exclusive-links', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not load links');
      setLinks(data.links || []);
    } catch (err: any) {
      toast({
        title: 'Error loading links',
        description: err?.message || 'Could not fetch exclusive links.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLinks();
    }
  }, [user]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setCreating(true);
    try {
      const idToken = await user.getIdToken();
      const durationMonths =
        createDuration === '1m'
          ? 1
          : createDuration === '3m'
          ? 3
          : createDuration === '1y'
          ? 12
          : null;

      const expiresDays =
        createExpires === '7d'
          ? 7
          : createExpires === '30d'
          ? 30
          : createExpires === '90d'
          ? 90
          : null;

      const res = await fetch('/api/admin/exclusive-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          note: createNote,
          count: parseInt(createCount, 10) || 1,
          durationMonths,
          expiresDays,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate links.');
      }

      toast({
        title: 'Links generated!',
        description: `Successfully created ${data.links.length} exclusive access link(s).`,
      });

      setNewlyCreated(data.links);
      setLinks((prev) => [...data.links, ...prev]);
      setCreateNote('');
      setCreateCount('1');
    } catch (err: any) {
      toast({
        title: 'Generation Failed',
        description: err?.message || 'Could not generate links.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to revoke this link? Anyone with the link will no longer be able to claim it.')) {
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/exclusive-links?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) throw new Error('Could not revoke link');

      toast({ title: 'Link revoked' });
      setLinks((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: 'revoked' as const } : l))
      );
    } catch (err: any) {
      toast({
        title: 'Revoke Failed',
        description: err?.message,
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: 'Copied to clipboard!', description: text });
      setTimeout(() => setCopiedId(null), 2500);
    } catch (e) {
      toast({ title: 'Copy failed', description: 'Could not access clipboard', variant: 'destructive' });
    }
  };

  // Filtered links
  const filtered = links.filter((link) => {
    // Tab filter
    if (activeTab === 'unclaimed' && link.status !== 'active') return false;
    if (activeTab === 'claimed' && link.status !== 'redeemed') return false;
    if (activeTab === 'revoked' && link.status !== 'revoked') return false;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const noteMatch = link.note?.toLowerCase().includes(q);
      const codeMatch = link.code?.toLowerCase().includes(q);
      const emailMatch = link.redeemedBy?.email?.toLowerCase().includes(q);
      const nameMatch = link.redeemedBy?.displayName?.toLowerCase().includes(q);
      return noteMatch || codeMatch || emailMatch || nameMatch;
    }

    return true;
  });

  const totalCount = links.length;
  const unclaimedCount = links.filter((l) => l.status === 'active').length;
  const claimedCount = links.filter((l) => l.status === 'redeemed').length;
  const revokedCount = links.filter((l) => l.status === 'revoked').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Key className="h-7 w-7 text-purple-400" /> Exclusive Links
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Generate one-time links for free Pro access and track which animators have redeemed them.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLinks}
            disabled={loading}
            className="border-white/10 hover:bg-white/5 text-zinc-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={() => {
              setNewlyCreated([]);
              setIsCreateOpen(true);
            }}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold gap-2 shadow-lg shadow-purple-600/30"
          >
            <Plus className="h-4 w-4" /> Generate Link
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-zinc-950/70">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
              Total Links
            </CardDescription>
            <CardTitle className="text-2xl font-black text-white">{totalCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-950/20">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
              Unclaimed (Ready)
            </CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-300">{unclaimedCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-purple-500/20 bg-purple-950/20">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs uppercase tracking-wider text-purple-400 font-bold">
              Claimed (Used)
            </CardDescription>
            <CardTitle className="text-2xl font-black text-purple-300">{claimedCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-white/10 bg-zinc-950/70">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
              Revoked
            </CardDescription>
            <CardTitle className="text-2xl font-black text-zinc-400">{revokedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="border-white/10 bg-zinc-950/80">
        <CardHeader className="p-5 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search note, code, or user email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-zinc-900 border-white/10 text-xs sm:text-sm h-9"
              />
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(val: any) => setActiveTab(val)}
              className="w-full sm:w-auto"
            >
              <TabsList className="bg-white/5 border border-white/5">
                <TabsTrigger value="all" className="text-xs">
                  All ({totalCount})
                </TabsTrigger>
                <TabsTrigger value="unclaimed" className="text-xs">
                  Unclaimed ({unclaimedCount})
                </TabsTrigger>
                <TabsTrigger value="claimed" className="text-xs">
                  Claimed ({claimedCount})
                </TabsTrigger>
                <TabsTrigger value="revoked" className="text-xs">
                  Revoked ({revokedCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-zinc-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
              <span>Loading exclusive links…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 space-y-3">
              <Key className="mx-auto h-8 w-8 text-zinc-600" />
              <p className="text-sm font-semibold">No exclusive links found</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {search ? 'Try adjusting your search query.' : 'Generate your first link above to send free access to animators.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden bg-black/40">
              {filtered.map((link) => {
                const isClaimed = link.status === 'redeemed';
                const isRevoked = link.status === 'revoked';
                const isCopied = copiedId === link.id;

                return (
                  <div
                    key={link.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Left: Link Info */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        {isClaimed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-[11px] font-bold text-purple-300">
                            <UserCheck className="h-3 w-3" /> Claimed
                          </span>
                        ) : isRevoked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 text-[11px] font-bold text-red-300">
                            Revoked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                            <Clock className="h-3 w-3" /> Unclaimed
                          </span>
                        )}

                        <span className="text-xs font-mono font-semibold text-zinc-300">
                          {link.code}
                        </span>

                        {link.durationMonths ? (
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300 font-semibold">
                            {link.durationMonths} Months
                          </span>
                        ) : (
                          <span className="rounded bg-purple-950/80 border border-purple-500/30 px-1.5 py-0.5 text-[10px] text-purple-300 font-semibold">
                            Lifetime Pro
                          </span>
                        )}
                      </div>

                      {/* Recipient note */}
                      <p className="text-sm font-semibold text-white">
                        {link.note || <span className="text-zinc-500 italic">No recipient note</span>}
                      </p>

                      {/* Redemption tracking details */}
                      {isClaimed && link.redeemedBy && (
                        <div className="text-xs text-purple-300/90 flex flex-wrap items-center gap-1.5 bg-purple-950/30 border border-purple-500/20 rounded-lg px-2.5 py-1">
                          <span className="font-semibold text-white">Redeemed by:</span>
                          <span className="font-mono text-purple-200">
                            {link.redeemedBy.email || link.redeemedBy.displayName || link.redeemedBy.uid}
                          </span>
                          {link.redeemedAt && (
                            <span className="text-zinc-400">
                              · {new Date(link.redeemedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-[11px] text-zinc-500">
                        Created {new Date(link.createdAt).toLocaleDateString()}
                        {link.expiresAt && ` · Link expires ${new Date(link.expiresAt).toLocaleDateString()}`}
                      </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(link.claimUrl, link.id)}
                        className={`text-xs h-9 px-3 gap-1.5 font-bold transition-all ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {isCopied ? 'Copied' : 'Copy Link'}
                      </Button>

                      {!isClaimed && !isRevoked && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRevoke(link.id)}
                          className="text-xs h-9 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Creation Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border-white/15 bg-zinc-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="h-5 w-5 text-purple-400" /> Generate Exclusive Link
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Create a unique one-time link. When the recipient clicks it, they receive instant free Pro access. The link automatically locks once claimed.
            </DialogDescription>
          </DialogHeader>

          {newlyCreated.length > 0 ? (
            /* Show Newly Created Links Immediately */
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Generated {newlyCreated.length} link(s)! Copy and send directly to users:</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {newlyCreated.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-white/10 bg-black/60 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{l.note || l.code}</p>
                      <p className="font-mono text-[11px] text-zinc-400 truncate">{l.claimUrl}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(l.claimUrl, l.id)}
                      className="h-8 px-2.5 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold shrink-0 gap-1"
                    >
                      {copiedId === l.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy
                    </Button>
                  </div>
                ))}
              </div>

              <DialogFooter className="pt-2">
                <Button
                  onClick={() => setIsCreateOpen(false)}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-bold h-10 rounded-xl"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleGenerate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="note" className="text-xs font-bold text-zinc-300">
                  Recipient / Note (Optional)
                </Label>
                <Input
                  id="note"
                  placeholder="e.g. Sent to Animator @Alex on Twitter"
                  value={createNote}
                  onChange={(e) => setCreateNote(e.target.value)}
                  className="bg-zinc-900 border-white/10 text-xs sm:text-sm h-10"
                />
                <p className="text-[11px] text-zinc-500">
                  Helps you remember who you gave this link to when tracking redemptions.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="duration" className="text-xs font-bold text-zinc-300">
                    Pro Duration
                  </Label>
                  <select
                    id="duration"
                    value={createDuration}
                    onChange={(e) => setCreateDuration(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg text-xs sm:text-sm h-10 px-3 text-white focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="lifetime">Lifetime Access</option>
                    <option value="1y">1 Year Access</option>
                    <option value="3m">3 Months Access</option>
                    <option value="1m">1 Month Access</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="count" className="text-xs font-bold text-zinc-300">
                    Quantity
                  </Label>
                  <select
                    id="count"
                    value={createCount}
                    onChange={(e) => setCreateCount(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg text-xs sm:text-sm h-10 px-3 text-white focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="1">1 link</option>
                    <option value="5">5 links</option>
                    <option value="10">10 links</option>
                    <option value="20">20 links</option>
                  </select>
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold h-10 rounded-xl px-5 gap-2"
                >
                  {creating ? 'Generating…' : 'Create Exclusive Link'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
