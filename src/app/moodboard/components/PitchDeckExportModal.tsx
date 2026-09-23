'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  FileText, 
  Sparkles, 
  LayoutGrid, 
  Columns, 
  Presentation, 
  Copy, 
  Check, 
  Film, 
  StickyNote, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DraggableCanvasItem } from '../types';
import type { Video, LocalImage } from '@/lib/types';

interface PitchDeckExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardName: string;
  canvasItems: DraggableCanvasItem[];
  creatorName?: string;
}

export function PitchDeckExportModal({
  isOpen,
  onClose,
  boardName,
  canvasItems,
  creatorName = 'Animator',
}: PitchDeckExportModalProps) {
  const { toast } = useToast();
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Deck configuration state
  const [projectTitle, setProjectTitle] = useState(boardName || 'Action Sequence Pitch');
  const [directorName, setDirectorName] = useState(creatorName || 'Lead Animator');
  const [logline, setLogline] = useState(
    'Key choreography and animation reference board for director review. Timing calibrated to 24 FPS.'
  );
  const [deckTheme, setDeckTheme] = useState<'dark' | 'light'>('dark');
  const [layoutStyle, setLayoutStyle] = useState<'presentation' | 'shotlist' | 'grid'>('presentation');
  const [pageOrientation, setPageOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeTimecodes, setIncludeTimecodes] = useState(true);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [hasCopiedMarkdown, setHasCopiedMarkdown] = useState(false);

  const getExportImageUrl = (url: string) => {
    if (!url || !/^https?:\/\//i.test(url)) return url;
    return `/api/export-image?url=${encodeURIComponent(url)}`;
  };

  // Helper to extract clean normalized video and reference info from any canvas item
  const getVideoMetadata = (item: DraggableCanvasItem, idx: number) => {
    const vid = (item.video || (item as any).videoData) as (Video & LocalImage & Record<string, any>) | undefined;
    const title = vid?.title || (item as any).title || item.text || `Shot #${idx + 1}`;
    const thumb = vid?.thumbnailUrl || vid?.posterUrl || item.imageUrl || vid?.url || (item as any)?.thumbnailUrl || (item as any)?.posterUrl || '';
    const uploader = vid?.uploader || vid?.author_name || (vid as any)?.sourceAuthorName || (item as any)?.creator || '';
    const description = vid?.description || (item as any)?.description || '';
    const tags = vid?.tags || (item as any)?.tags || [];
    const isShort = vid?.isShort || (vid?.category && String(vid.category).toLowerCase().includes('short')) || false;
    const directUrl = vid && 'videoUrl' in vid ? vid.videoUrl : ((item as any).videoUrl || '');

    return {
      vid,
      title,
      thumb,
      uploader,
      description,
      tags,
      isShort,
      directUrl,
    };
  };

  // Extract reference clips and sticky notes with deep fallback
  const referenceClips = useMemo(() => {
    return canvasItems.filter((item) => {
      if (item.type === 'note' || item.type === 'text' || item.type === 'shape' || item.type === 'drawing' || item.type === 'connection') {
        return false;
      }
      return item.type === 'video' || item.type === 'image' || Boolean(item.video) || Boolean((item as any).videoData) || Boolean(item.imageUrl) || Boolean(item.videoId);
    });
  }, [canvasItems]);

  const stickyNotes = useMemo(() => {
    return canvasItems.filter(
      (item) => item.type === 'note' || item.type === 'text'
    );
  }, [canvasItems]);

  // Export as high-res PNG image
  const handleExportPNG = async () => {
    document.body.dataset.moodboardExporting = 'true';
    window.dispatchEvent(new Event('moodboard-export-start'));
    setIsExportingPng(true);
    try {
      const columns = 3;
      const pageWidth = 1800;
      const gutter = 42;
      const cardWidth = (pageWidth - gutter * (columns + 1)) / columns;
      const loadImage = (src: string) => new Promise<HTMLImageElement | null>((resolve) => {
        if (!src) return resolve(null);
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = getExportImageUrl(src);
      });
      const images = await Promise.all(referenceClips.map((item, index) => loadImage(getVideoMetadata(item, index).thumb)));

      // Masonry placement gives the export the same image-led browsing feel as
      // a saved-reference/Pinterest board, rather than a rigid spreadsheet.
      const columnHeights = Array.from({ length: columns }, () => 220);
      const placements = referenceClips.map((item, index) => {
        const column = columnHeights.indexOf(Math.min(...columnHeights));
        const image = images[index];
        const imageHeight = image
          ? Math.max(210, Math.min(620, Math.round(cardWidth * (image.height / image.width))))
          : 300;
        const title = String(getVideoMetadata(item, index).title || `Reference #${index + 1}`);
        const titleLines = Math.max(1, Math.min(2, Math.ceil(title.length / Math.max(20, Math.floor((cardWidth - 44) / 16)))));
        const cardHeight = imageHeight + 132 + titleLines * 32;
        const placement = { column, y: columnHeights[column], imageHeight, cardHeight };
        columnHeights[column] += cardHeight + gutter;
        return placement;
      });
      const pageHeight = Math.max(1100, Math.max(...columnHeights) + 110);
      const canvas = document.createElement('canvas');
      canvas.width = pageWidth;
      canvas.height = pageHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable');
      const roundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
        const r = Math.min(radius, width / 2, height / 2);
        context.beginPath();
        context.moveTo(x + r, y);
        context.arcTo(x + width, y, x + width, y + height, r);
        context.arcTo(x + width, y + height, x, y + height, r);
        context.arcTo(x, y + height, x, y, r);
        context.arcTo(x, y, x + width, y, r);
        context.closePath();
      };

      const dark = deckTheme === 'dark';
      const background = context.createLinearGradient(0, 0, pageWidth, pageHeight);
      background.addColorStop(0, dark ? '#101018' : '#fafafa');
      background.addColorStop(1, dark ? '#09090d' : '#eef0f4');
      context.fillStyle = background;
      context.fillRect(0, 0, pageWidth, pageHeight);
      context.fillStyle = '#f59e0b';
      context.font = '700 22px monospace';
      context.fillText('ANIMATION REFERENCE MOODBOARD', gutter, 58);
      context.fillStyle = dark ? '#ffffff' : '#18181b';
      context.font = '800 52px Arial';
      context.fillText(projectTitle || 'Moodboard', gutter, 122);
      context.fillStyle = dark ? '#a1a1aa' : '#52525b';
      context.font = '24px Arial';
      context.fillText(`${referenceClips.length} saved references  •  ${directorName}`, gutter, 164);

      referenceClips.forEach((item, index) => {
        const { column, y, imageHeight, cardHeight } = placements[index];
        const x = gutter + column * (cardWidth + gutter);
        const { title, uploader, tags } = getVideoMetadata(item, index);
        roundedRect(x, y, cardWidth, cardHeight, 22);
        context.fillStyle = dark ? '#181820' : '#ffffff';
        context.fill();
        context.strokeStyle = dark ? '#34343f' : '#e4e4e7';
        context.lineWidth = 2;
        context.stroke();
        const image = images[index];
        if (image) {
          const scale = Math.max(cardWidth / image.width, imageHeight / image.height);
          const drawWidth = image.width * scale;
          const drawHeight = image.height * scale;
          context.save();
          roundedRect(x, y, cardWidth, imageHeight, 22);
          context.clip();
          context.drawImage(image, x + (cardWidth - drawWidth) / 2, y + (imageHeight - drawHeight) / 2, drawWidth, drawHeight);
          context.restore();
        } else {
          context.fillStyle = '#27272a';
          roundedRect(x, y, cardWidth, imageHeight, 22);
          context.fill();
          context.fillStyle = '#a1a1aa';
          context.font = '20px monospace';
          context.fillText('Reference thumbnail unavailable', x + 24, y + imageHeight / 2);
        }
        // Shot number chip, modeled after a presentation shot deck.
        roundedRect(x + 18, y + 18, 96, 34, 17);
        context.fillStyle = 'rgba(9,9,11,0.84)';
        context.fill();
        context.fillStyle = '#fbbf24';
        context.font = '700 16px monospace';
        context.fillText(`SHOT ${String(index + 1).padStart(2, '0')}`, x + 30, y + 40);
        context.fillStyle = dark ? '#ffffff' : '#18181b';
        context.font = '700 27px Arial';
        const words = title.split(/\s+/);
        let line = '';
        let lineY = y + imageHeight + 48;
        words.forEach((word: string) => {
          const next = line ? `${line} ${word}` : word;
          if (context.measureText(next).width > cardWidth - 44 && line) {
            context.fillText(line, x + 22, lineY);
            lineY += 34;
            line = word;
          } else line = next;
        });
        context.fillText(line || `Reference #${index + 1}`, x + 22, lineY);
        context.fillStyle = dark ? '#a1a1aa' : '#71717a';
        context.font = '20px Arial';
        context.fillText(uploader ? `@${uploader.replace(/^@/, '')}` : 'ANIMATION REFERENCE', x + 22, y + cardHeight - 70);
        const tagY = y + cardHeight - 44;
        let tagX = x + 22;
        (tags || ['reference']).slice(0, 3).forEach((tag: string) => {
          const label = `#${tag}`;
          context.font = '600 16px Arial';
          const pillWidth = Math.min(context.measureText(label).width + 26, cardWidth - 44);
          if (tagX + pillWidth > x + cardWidth - 22) return;
          roundedRect(tagX, tagY, pillWidth, 28, 14);
          context.fillStyle = dark ? '#2a2418' : '#fff4d6';
          context.fill();
          context.fillStyle = dark ? '#fcd34d' : '#a16207';
          context.fillText(label, tagX + 13, tagY + 20);
          tagX += pillWidth + 8;
        });
      });

      const dataUrl = canvas.toDataURL('image/png');

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${projectTitle.toLowerCase().replace(/\s+/g, '_')}_pitch_deck.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast({
        title: 'Pitch Deck Exported',
        description: 'Saved high-resolution pitch sheet.',
      });
    } catch (err) {
      console.error('Failed to export pitch deck PNG:', err);
      toast({
        title: 'PNG Export Failed',
    description: 'One or more reference images could not be loaded for export.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingPng(false);
      delete document.body.dataset.moodboardExporting;
      window.dispatchEvent(new Event('moodboard-export-end'));
    }
  };

  // Copy Markdown summary for Slack/Notion/Discord
  const handleCopyMarkdown = () => {
    let md = `# ${projectTitle}\n`;
    md += `**Prepared by:** ${directorName} | **Date:** ${new Date().toLocaleDateString()}\n\n`;
    if (logline) {
      md += `> ${logline}\n\n`;
    }
    md += `## Reference Breakdown (${referenceClips.length} Shots)\n\n`;

    referenceClips.forEach((item, index) => {
      const { title, tags, directUrl } = getVideoMetadata(item, index);
      md += `### ${index + 1}. ${title}\n`;
      if (tags && tags.length > 0) {
        md += `- **Tags:** ${tags.join(', ')}\n`;
      }
      if (directUrl) {
        md += `- **Direct Video URL:** ${directUrl}\n`;
      }
      md += `\n`;
    });

    if (includeNotes && stickyNotes.length > 0) {
      md += `## Production Notes & Director Feedback\n\n`;
      stickyNotes.forEach((n, idx) => {
        md += `${idx + 1}. ${n.text || 'Note'}\n`;
      });
    }

    navigator.clipboard.writeText(md);
    setHasCopiedMarkdown(true);
    setTimeout(() => setHasCopiedMarkdown(false), 2000);
    toast({
      title: 'Copied to Clipboard',
      description: 'Formatted pitch markdown ready to paste into Notion, Slack, or Email.',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[92vh] p-0 bg-[#0c0c12] border-white/10 text-white flex flex-col overflow-hidden rounded-3xl shadow-2xl">
        <DialogTitle className="sr-only">Moodboard Export</DialogTitle>

        {/* ──────── TOP MODAL HEADER ──────── */}
        <div id="pitch-deck-modal-header" className="h-16 px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#12121c]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Presentation className="h-5 w-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight">
                  Moodboard Reference Export
                </h2>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-[10px] px-2 py-0.5 uppercase tracking-wider border-none">
                  Studio Pro
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                Export a styled shot-deck reference sheet with saved clips and notes.
              </p>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyMarkdown}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs h-9"
            >
              {hasCopiedMarkdown ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-400 mr-1.5" />
                  Copied MD
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
                  Copy Markdown
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPNG}
              disabled={isExportingPng}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs h-9"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
              {isExportingPng ? 'Rendering...' : 'Export PNG'}
            </Button>

          </div>
        </div>

        {/* ──────── MAIN SPLIT WORKSPACE ──────── */}
        <div id="pitch-deck-workspace" className="flex-1 flex overflow-hidden">
          
          {/* LEFT SIDEBAR: CONFIGURATION SETTINGS */}
          <div id="pitch-deck-config-sidebar" className="w-80 border-r border-white/10 bg-[#0f0f18] p-5 overflow-y-auto shrink-0 flex flex-col gap-5 text-xs">
            
            {/* Project Title */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Project Title
              </label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="e.g., Cyberpunk Chase Sequence"
              />
            </div>

            {/* Presenter / Lead Animator */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Presenter / Lead Animator
              </label>
              <input
                type="text"
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="Your Name / Studio"
              />
            </div>

            {/* Logline / Director Concept */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Director Logline & Notes
              </label>
              <textarea
                rows={3}
                value={logline}
                onChange={(e) => setLogline(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors resize-none leading-relaxed"
                placeholder="Summary of action beats, camera angles, or character motivations..."
              />
            </div>

            {/* Layout Style Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Deck Layout Template
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setLayoutStyle('presentation')}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 px-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer",
                    layoutStyle === 'presentation'
                      ? "bg-amber-500 text-black shadow"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Presentation className="h-4 w-4" />
                  <span>Cinematic</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLayoutStyle('shotlist')}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 px-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer",
                    layoutStyle === 'shotlist'
                      ? "bg-amber-500 text-black shadow"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Columns className="h-4 w-4" />
                  <span>Shot List</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLayoutStyle('grid')}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 px-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer",
                    layoutStyle === 'grid'
                      ? "bg-amber-500 text-black shadow"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span>Contact Grid</span>
                </button>
              </div>
            </div>

            {/* Deck Theme */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                PDF Color Theme
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeckTheme('dark')}
                  className={cn(
                    "py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all",
                    deckTheme === 'dark'
                      ? "bg-zinc-900 border-amber-500 text-white shadow-md shadow-amber-500/20"
                      : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                  )}
                >
                  <span className="w-3 h-3 rounded-full bg-zinc-950 border border-white/20" />
                  <span>Dark Room</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeckTheme('light')}
                  className={cn(
                    "py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all",
                    deckTheme === 'light'
                      ? "bg-white text-zinc-900 border-amber-500 shadow-md shadow-amber-500/20"
                      : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                  )}
                >
                  <span className="w-3 h-3 rounded-full bg-white border border-zinc-400" />
                  <span>Print White</span>
                </button>
              </div>
            </div>

            {/* Page Orientation */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                PDF Page Orientation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPageOrientation('landscape')}
                  className={cn(
                    "py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all",
                    pageOrientation === 'landscape'
                      ? "bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/20"
                      : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                  )}
                >
                  <span>Landscape (16:9)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPageOrientation('portrait')}
                  className={cn(
                    "py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all",
                    pageOrientation === 'portrait'
                      ? "bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/20"
                      : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                  )}
                >
                  <span>Portrait (A4)</span>
                </button>
              </div>
            </div>

            {/* Display Toggles */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Pitch Elements
              </label>
              
              <label className="flex items-center gap-2.5 cursor-pointer text-zinc-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 accent-amber-500 cursor-pointer"
                />
                <span>Include Sticky Notes & Annotations</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-zinc-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={includeTimecodes}
                  onChange={(e) => setIncludeTimecodes(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 accent-amber-500 cursor-pointer"
                />
                <span>Include Timecodes & 24 FPS Badges</span>
              </label>
            </div>

            {/* Summary Metadata */}
            <div className="mt-auto pt-4 border-t border-white/10 text-[11px] text-zinc-500 flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Reference Clips:</span>
                <span className="text-zinc-300 font-bold">{referenceClips.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Production Notes:</span>
                <span className="text-zinc-300 font-bold">{stickyNotes.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Deck Items:</span>
                <span className="text-amber-400 font-bold">{canvasItems.length}</span>
              </div>
            </div>

          </div>

          {/* RIGHT PREVIEW AREA: LIVE PRINT DECK SHEET */}
          <div id="pitch-deck-preview-container" className="flex-1 bg-[#07070b] overflow-y-auto p-6 flex justify-center items-start">
            
            {/* The Print Sheet container */}
            <div
              id="pitch-deck-print-area"
              ref={printContainerRef}
              className={cn(
                "w-full max-w-4xl p-8 rounded-2xl shadow-2xl transition-all border",
                deckTheme === 'dark'
                  ? "bg-[#0d0d14] text-white border-white/10"
                  : "bg-white text-zinc-900 border-zinc-200 shadow-zinc-300/40"
              )}
            >
              {/* Pitch Header Banner */}
              <div className="pb-6 mb-6 border-b border-current/10 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-widest font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Animation Pitch Deck
                    </span>
                    <span className="text-xs opacity-50 font-mono">
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h1 className="text-2xl font-black tracking-tight">{projectTitle}</h1>
                  <p className="text-xs opacity-70 mt-1">
                    Prepared by <strong className="opacity-100">{directorName}</strong> • AnimationReference.org
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold opacity-60">
                    TARGET: 24 FPS
                  </div>
                  <div className="text-[11px] opacity-40 font-mono mt-0.5">
                    {referenceClips.length} Reference Shots
                  </div>
                </div>
              </div>

              {/* Logline Box */}
              {logline && (
                <div className={cn(
                  "p-4 rounded-xl mb-6 text-xs leading-relaxed border italic pitch-deck-section",
                  deckTheme === 'dark'
                    ? "bg-white/5 border-white/10 text-zinc-300"
                    : "bg-zinc-50 border-zinc-200 text-zinc-700"
                )}>
                  &ldquo;{logline}&rdquo;
                </div>
              )}

              {/* Reference Shots Display based on selected Layout */}
              {referenceClips.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-xs">
                  <Film className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No reference videos found on this moodboard. Add clips from the sidebar to populate your pitch deck.
                </div>
              ) : layoutStyle === 'presentation' ? (
                /* CINEMATIC 16:9 PRESENTATION MODE */
                <div className="space-y-6">
                  {referenceClips.map((item, idx) => {
                    const { vid, title, thumb, uploader, description, tags, isShort } = getVideoMetadata(item, idx);

                    return (
                      <div
                        key={item.id || idx}
                        className={cn(
                          "pitch-deck-shot-card rounded-2xl p-4 border flex flex-col md:flex-row gap-5 items-start",
                          deckTheme === 'dark' ? "bg-white/[0.03] border-white/10" : "bg-zinc-50 border-zinc-200"
                        )}
                      >
                        {/* Shot Thumbnail */}
                        <div className="w-full md:w-64 aspect-video bg-black/80 rounded-xl overflow-hidden relative shrink-0 border border-current/10 flex items-center justify-center">
                          {thumb ? (
                            <img
                              src={getExportImageUrl(thumb)}
                              alt={title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-4 text-center opacity-40">
                              <Film className="h-8 w-8 mb-1 text-amber-500" />
                              <span className="text-[10px] font-mono">Reference #{idx + 1}</span>
                            </div>
                          )}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white border border-white/20 shadow-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                            <span>{uploader ? (uploader.startsWith('@') ? uploader : `@${uploader}`) : `SHOT ${String(idx + 1).padStart(2, '0')}`}</span>
                          </div>
                          {includeTimecodes && (
                            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono text-amber-300 border border-amber-500/30">
                              24 FPS • 00:0{idx + 1}:00
                            </div>
                          )}
                        </div>

                        {/* Shot Details & Production Notes */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-bold truncate">{title}</h3>
                              {isShort && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono">
                                  SHORT
                                </span>
                              )}
                            </div>
                            
                            {description && (
                              <p className="text-xs opacity-60 line-clamp-2 mb-3">
                                {description}
                              </p>
                            )}

                            {/* Tags */}
                            {tags && tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {tags.slice(0, 4).map((tag: string) => (
                                  <span
                                    key={tag}
                                    className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-current/5 border border-current/10 opacity-70"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Matching Sticky Notes */}
                          {includeNotes && (
                            <div className="pt-2 border-t border-current/10 text-[11px] opacity-80 flex items-center gap-2">
                              <StickyNote className="h-3 w-3 text-amber-500 shrink-0" />
                              <span className="italic truncate">
                                {stickyNotes[idx % Math.max(1, stickyNotes.length)]?.text || 'Director Note: Emphasize weight and arc follow-through.'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : layoutStyle === 'shotlist' ? (
                /* SHOT LIST 2-COLUMN TABLE FORMAT */
                <div className="space-y-3">
                  {referenceClips.map((item, idx) => {
                    const { title, thumb, tags } = getVideoMetadata(item, idx);

                    return (
                      <div
                        key={item.id || idx}
                        className={cn(
                          "pitch-deck-shot-card p-3 rounded-xl border flex items-center gap-4 text-xs",
                          deckTheme === 'dark' ? "bg-white/[0.02] border-white/10" : "bg-zinc-50 border-zinc-200"
                        )}
                      >
                        <span className="font-mono font-black text-amber-500 text-xs w-6 shrink-0">
                          #{idx + 1}
                        </span>
                        
                        <div className="w-20 aspect-video bg-black/80 rounded-lg overflow-hidden shrink-0 border border-current/10 flex items-center justify-center">
                          {thumb ? (
                            <img
                              src={getExportImageUrl(thumb)}
                              alt={title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Film className="h-4 w-4 opacity-40 text-amber-500" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold truncate text-xs">{title}</h4>
                          <span className="text-[10px] opacity-50 font-mono">
                            {tags?.slice(0, 3).join(', ') || 'Action Reference'}
                          </span>
                        </div>

                        {includeTimecodes && (
                          <div className="text-right font-mono text-[11px] opacity-70 shrink-0">
                            00:0{idx + 1}:00 • 24fps
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 3x2 CONTACT SHEET GRID */
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {referenceClips.map((item, idx) => {
                    const { title, thumb, uploader } = getVideoMetadata(item, idx);

                    return (
                      <div
                        key={item.id || idx}
                        className={cn(
                          "pitch-deck-shot-card rounded-xl overflow-hidden border flex flex-col",
                          deckTheme === 'dark' ? "bg-white/[0.03] border-white/10" : "bg-zinc-50 border-zinc-200"
                        )}
                      >
                        <div className="aspect-video bg-black/80 relative flex items-center justify-center">
                          {thumb ? (
                            <img
                              src={getExportImageUrl(thumb)}
                              alt={title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Film className="h-6 w-6 opacity-40 text-amber-500" />
                          )}
                          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold text-white border border-white/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                            <span className="truncate max-w-[90px]">{uploader ? (uploader.startsWith('@') ? uploader : `@${uploader}`) : `#${idx + 1}`}</span>
                          </div>
                        </div>
                        <div className="p-2.5 text-xs flex-1 flex flex-col justify-between">
                          <span className="font-bold truncate text-[11px] mb-1">{title}</span>
                          <span className="text-[9px] font-mono opacity-50">24 FPS Reference</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sticky Notes Appendix */}
              {includeNotes && stickyNotes.length > 0 && (
                <div className="pitch-deck-section mt-8 pt-6 border-t border-current/10">
                  <h3 className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-1.5 text-amber-500">
                    <StickyNote className="h-3.5 w-3.5" />
                    <span>Production Notes & Action Beats</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {stickyNotes.map((note) => (
                      <div
                        key={note.id}
                        className={cn(
                          "pitch-deck-shot-card p-3 rounded-xl border text-xs leading-relaxed",
                          deckTheme === 'dark'
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-100"
                            : "bg-amber-50 border-amber-200 text-amber-900"
                        )}
                      >
                        {note.text || 'Action note'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pitch Footer */}
              <div className="pitch-deck-section mt-10 pt-4 border-t border-current/10 flex items-center justify-between text-[10px] opacity-40 font-mono">
                <span>Generated by AnimationReference.org Studio Pro</span>
                <span>Confidential Production Reference</span>
              </div>

            </div>

          </div>

        </div>

        {/* Global Print Stylesheet specifically for multi-page PDF Export */}
        <style jsx global>{`
          @media print {
            html, body {
              overflow: visible !important;
              height: auto !important;
              min-height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: transparent !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body > *:not([data-radix-portal]),
            [data-radix-portal] > [data-state="open"]:first-child,
            [data-radix-focus-guard],
            button,
            #pitch-deck-modal-header,
            #pitch-deck-config-sidebar {
              display: none !important;
            }
            /* Radix renders the dialog in a body portal. Keep the portal and the
               actual dialog visible; only its overlay and editor chrome are hidden. */
            body > [data-radix-portal],
            body > [data-radix-portal] > [role="dialog"] {
              display: block !important;
              visibility: visible !important;
            }
            [role="dialog"] {
              position: static !important;
              transform: none !important;
              max-width: 100% !important;
              width: 100% !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: transparent !important;
            }
            #pitch-deck-workspace,
            #pitch-deck-preview-container {
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
              padding: 0 !important;
              margin: 0 !important;
              display: block !important;
              background: transparent !important;
            }
            #pitch-deck-print-area {
              position: static !important;
              display: block !important;
              visibility: visible !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 10mm !important;
              border: none !important;
              box-shadow: none !important;
            }
            #pitch-deck-print-area > * {
              max-width: 100% !important;
            }
            .pitch-deck-shot-card {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              margin-bottom: 20px !important;
            }
            .pitch-deck-section {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            @page {
              size: ${pageOrientation};
              margin: 10mm;
            }
          }
        `}</style>

      </DialogContent>
    </Dialog>
  );
}
