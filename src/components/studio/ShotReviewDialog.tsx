'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  PenTool, 
  ExternalLink, 
  CheckCircle2, 
  Layers, 
  Film, 
  Play, 
  Share2, 
  Link as LinkIcon,
  MessageSquare,
  Clock,
  Video
} from 'lucide-react';
import type { ProductionShot, ShotStatus } from '@/lib/types';
import { updateShot } from '@/lib/project-service';

interface ShotReviewDialogProps {
  shot: ProductionShot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShotUpdated?: (updated: ProductionShot) => void;
}

const STATUS_LABELS: Record<ShotStatus, { label: string; color: string }> = {
  concept: { label: 'Concept & Brief', color: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
  storyboard: { label: 'Storyboard', color: 'bg-blue-950/80 text-blue-300 border-blue-800' },
  layout: { label: '3D Layout', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-800' },
  blocking: { label: 'Keyframe Blocking', color: 'bg-amber-950/80 text-amber-300 border-amber-800' },
  splining: { label: 'Splining Pass', color: 'bg-purple-950/80 text-purple-300 border-purple-800' },
  polish: { label: 'Polish & Arcs', color: 'bg-pink-950/80 text-pink-300 border-pink-800' },
  rendered: { label: 'Rendered Preview', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-800' },
  approved: { label: 'Final Approved', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800' },
};

export function ShotReviewDialog({
  shot,
  open,
  onOpenChange,
  onShotUpdated,
}: ShotReviewDialogProps) {
  const { toast } = useToast();
  const [syncsketchUrl, setSyncsketchUrl] = useState(shot?.syncsketchUrl || '');
  const [currentPassUrl, setCurrentPassUrl] = useState(shot?.currentPassMediaUrl || '');
  const [status, setStatus] = useState<ShotStatus>(shot?.status || 'blocking');
  const [notes, setNotes] = useState(shot?.description || '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when shot changes
  React.useEffect(() => {
    if (shot) {
      setSyncsketchUrl(shot.syncsketchUrl || '');
      setCurrentPassUrl(shot.currentPassMediaUrl || '');
      setStatus(shot.status);
      setNotes(shot.description || '');
    }
  }, [shot]);

  if (!shot) return null;

  const handleLaunchAnimWorks = () => {
    const videoUrlToUse = currentPassUrl || shot.referenceVideoUrl || shot.thumbnailUrl;
    const baseUrl = 'https://anim.works/review/new';
    const params = new URLSearchParams({
      video_url: videoUrlToUse || '',
      title: `${shot.shotNumber} - ${shot.title}`,
      source: 'animationreference.org',
      fps: shot.fps.toString(),
      ref_id: shot.id,
    });
    window.open(`${baseUrl}?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const handleLaunchSyncsketch = () => {
    const url = syncsketchUrl || 'https://syncsketch.com';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const updatedData: Partial<ProductionShot> = {
        status,
        syncsketchUrl,
        currentPassMediaUrl: currentPassUrl,
        description: notes,
      };
      await updateShot(shot.id, updatedData);
      toast({ title: 'Shot Updated', description: `${shot.shotNumber} review settings saved.` });
      onShotUpdated?.({ ...shot, ...updatedData });
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update shot review data.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0d0a1a] border-purple-500/30 text-white p-6 md:p-8 rounded-3xl shadow-2xl backdrop-blur-3xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-extrabold bg-purple-900/80 text-purple-200 border border-purple-600/50">
                {shot.shotNumber}
              </span>
              <Badge className={`${STATUS_LABELS[status]?.color} border text-xs font-bold`}>
                {STATUS_LABELS[status]?.label}
              </Badge>
              <span className="text-xs text-zinc-400 font-mono">
                {shot.durationFrames} Frames • {shot.fps} FPS
              </span>
            </div>

            {/* Quick Action Review Launchers */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleLaunchAnimWorks}
                size="sm"
                className="h-8 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 border border-purple-400/30"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Anim.works Draw-over</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </Button>

              <Button
                onClick={handleLaunchSyncsketch}
                size="sm"
                variant="outline"
                className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/15 text-blue-300 border-blue-500/40 text-xs font-bold flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>SyncSketch Room</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
          </div>

          <DialogTitle className="text-2xl md:text-3xl font-black text-white tracking-tight">
            {shot.title}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Review animation timing, draw notes on keyframes, and update production milestones.
          </DialogDescription>
        </DialogHeader>

        {/* Media & Comparison Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          {/* Reference Video / Source */}
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-purple-400" />
                Paired Reference Video
              </label>
              {shot.referenceVideoTitle && (
                <span className="text-[10px] text-purple-300 font-medium truncate max-w-[150px]">
                  {shot.referenceVideoTitle}
                </span>
              )}
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center group">
              {shot.thumbnailUrl ? (
                <img
                  src={shot.thumbnailUrl}
                  alt={shot.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-4">
                  <Film className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">No reference thumbnail</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                <Button size="sm" onClick={handleLaunchAnimWorks} className="rounded-xl h-8 text-xs font-bold bg-white text-black hover:bg-white/90">
                  <Play className="w-3.5 h-3.5 fill-black mr-1" /> Scrub Frames
                </Button>
              </div>
            </div>
          </div>

          {/* Current Animation Pass / SyncSketch Preview */}
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Current Animation Pass
              </label>
              <span className="text-[10px] text-blue-300 font-mono">
                {status.toUpperCase()} PASS
              </span>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/60 border border-blue-500/20 flex flex-col items-center justify-center p-4 text-center">
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-400 mb-2">
                <PenTool className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-white mb-1">Live Draw-Over & Notes</p>
              <p className="text-[11px] text-zinc-400 max-w-xs mb-3">
                Open in SyncSketch or Anim.works to draw silhouette fixes and timing notes.
              </p>
              <Button size="sm" onClick={handleLaunchSyncsketch} className="h-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md">
                Launch Review Session
              </Button>
            </div>
          </div>
        </div>

        {/* Status & Review Links Settings */}
        <div className="space-y-4 text-left p-4 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Production Stage</label>
              <Select value={status} onValueChange={(val) => setStatus(val as ShotStatus)}>
                <SelectTrigger className="bg-zinc-950 border-white/10 text-white h-10 rounded-xl">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                  {Object.entries(STATUS_LABELS).map(([key, info]) => (
                    <SelectItem key={key} value={key} className="cursor-pointer">
                      {info.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SyncSketch Room Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                <LinkIcon className="w-3 h-3 text-blue-400" />
                SyncSketch Review Room URL
              </label>
              <Input
                value={syncsketchUrl}
                onChange={(e) => setSyncsketchUrl(e.target.value)}
                placeholder="https://syncsketch.com/sketch/..."
                className="bg-zinc-950 border-white/10 text-white h-10 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          {/* Director & Animator Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-purple-400" />
              Shot Description & Feedback Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes on timing, weight, spacing, or arcs..."
              rows={3}
              className="bg-zinc-950 border-white/10 text-white rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white rounded-xl"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="h-11 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-950/50"
          >
            {isSaving ? 'Saving...' : 'Save Shot Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
