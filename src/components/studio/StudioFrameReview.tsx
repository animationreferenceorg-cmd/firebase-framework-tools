'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Paintbrush, 
  Send, 
  CheckCircle2, 
  Video, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  SkipBack, 
  SkipForward, 
  Trash2, 
  Image as ImageIcon, 
  ArrowRight, 
  Type, 
  Eye, 
  Check, 
  X, 
  Plus, 
  RotateCcw, 
  Sliders,
  Folder,
  Copy,
  Lock,
  Share2,
  Shield,
  Download,
  MessageSquare,
  ExternalLink,
  Layers,
  Cloud,
  Film,
  Music,
  CheckSquare,
  Sparkles,
  Grid,
  Film as ReelIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// --- Types ---
interface Point {
  x: number;
  y: number;
}

interface DrawingPath {
  type: 'brush' | 'arrow' | 'text';
  color: string;
  lineWidth: number;
  strokes: Point[];
  text?: string;
}

interface DrawingFrame {
  frame: number;
  paths: DrawingPath[];
}

interface FrameReviewComment {
  id: string;
  frameNumber: number;
  timecode: string;
  author: string;
  avatar: string;
  text: string;
  resolved: boolean;
}

interface ReelAsset {
  id: string;
  title: string;
  type: 'video' | 'image';
  size: string;
  status: 'Approved' | 'Needs Review' | 'WIP';
  thumbnail: string;
  src: string;
  duration: number;
}

const FPS = 24;

const mockReelAssets: ReelAsset[] = [
  {
    id: 'ra-1',
    title: 'Dryp 2.0 Teaser - Shot 01',
    type: 'video',
    size: '460 MB',
    status: 'Needs Review',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 8.5
  },
  {
    id: 'ra-2',
    title: 'Character Turnaround Art Pass',
    type: 'image',
    size: '124 MB',
    status: 'Needs Review',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
    duration: 0
  },
  {
    id: 'ra-3',
    title: 'Dojo Environment Color Script',
    type: 'image',
    size: '88 MB',
    status: 'Approved',
    thumbnail: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop&q=80',
    src: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000&auto=format&fit=crop&q=80',
    duration: 0
  }
];

export function StudioFrameReview() {
  const { toast } = useToast();

  // Active Selections
  const [activeAsset, setActiveAsset] = useState<ReelAsset>(mockReelAssets[0]);
  const [activeShare, setActiveShare] = useState('Teaser - ForClient');
  const [rightPanelTab, setRightPanelTab] = useState<'share' | 'comments'>('share');
  const [layoutMode, setLayoutMode] = useState<'Reel' | 'Grid'>('Reel');

  // Video Scrubber State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(8.5);

  const currentFrame = Math.floor(currentTime * FPS);
  const totalFrames = Math.max(1, Math.floor(duration * FPS));

  // SyncSketch Markup State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(true);
  const [toolType, setToolType] = useState<'brush' | 'arrow' | 'text'>('brush');
  const [activeColor, setActiveColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(4);
  const [onionSkinning, setOnionSkinning] = useState(false);

  const [drawings, setDrawings] = useState<DrawingFrame[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);

  // Frame.io Share Settings Toggles
  const [linkVisibility, setLinkVisibility] = useState(true);
  const [commentsPermission, setCommentsPermission] = useState(true);
  const [downloadsPermission, setDownloadsPermission] = useState(false);
  const [showAllVersions, setShowAllVersions] = useState(true);
  const [passphraseSecurity, setPassphraseSecurity] = useState(false);

  // Comments
  const [comments, setComments] = useState<FrameReviewComment[]>([
    {
      id: 'c1',
      frameNumber: 12,
      timecode: '00:00.12',
      author: 'Alex Rivera (Director)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80',
      text: 'Push the action vector higher on frame 12 for better silhouette readability!',
      resolved: false,
    },
    {
      id: 'c2',
      frameNumber: 32,
      timecode: '00:01.08',
      author: 'Sarah Chen (Lead Anim)',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&q=80',
      text: 'Added in-betweens. Looks ready for client review.',
      resolved: true,
    },
  ]);
  const [newCommentText, setNewCommentText] = useState('');

  // Transport Handlers
  const togglePlay = () => {
    if (videoRef.current && activeAsset.type === 'video') {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const stepFrame = (direction: 1 | -1) => {
    if (activeAsset.type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      const newTime = Math.max(0, Math.min(duration, currentTime + (direction * (1 / FPS))));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const jumpToFrame = (frame: number) => {
    const newTime = frame / FPS;
    setCurrentTime(newTime);
    if (videoRef.current && activeAsset.type === 'video') {
      videoRef.current.currentTime = newTime;
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  // Drawing Canvas logic
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const coords = getCanvasCoords(e);
    setCurrentPath({
      type: toolType,
      color: activeColor,
      lineWidth: lineWidth,
      strokes: [coords]
    });
    if (isPlaying && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !currentPath) return;
    const coords = getCanvasCoords(e);
    if (toolType === 'brush') {
      setCurrentPath({ ...currentPath, strokes: [...currentPath.strokes, coords] });
    } else if (toolType === 'arrow') {
      setCurrentPath({ ...currentPath, strokes: [currentPath.strokes[0], coords] });
    }
  };

  const stopDrawing = () => {
    if (!isDrawingMode || !currentPath) return;
    setDrawings(prev => {
      const idx = prev.findIndex(d => d.frame === currentFrame);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], paths: [...updated[idx].paths, currentPath] };
        return updated;
      } else {
        return [...prev, { frame: currentFrame, paths: [currentPath] }];
      }
    });
    setCurrentPath(null);
  };

  // Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const renderPaths = (paths: DrawingPath[], opacity = 1) => {
      ctx.globalAlpha = opacity;
      paths.forEach(p => {
        ctx.strokeStyle = p.color;
        ctx.fillStyle = p.color;
        ctx.lineWidth = p.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (p.type === 'brush' && p.strokes.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(p.strokes[0].x, p.strokes[0].y);
          for (let i = 1; i < p.strokes.length; i++) {
            ctx.lineTo(p.strokes[i].x, p.strokes[i].y);
          }
          ctx.stroke();
        } else if (p.type === 'arrow' && p.strokes.length === 2) {
          const p1 = p.strokes[0];
          const p2 = p.strokes[1];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          const headLen = 14;
          ctx.beginPath();
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(p2.x - headLen * Math.cos(angle - Math.PI / 6), p2.y - headLen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(p2.x - headLen * Math.cos(angle + Math.PI / 6), p2.y - headLen * Math.sin(angle + Math.PI / 6));
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
    };

    if (onionSkinning && currentFrame > 0) {
      const prevFrameDrawings = drawings.find(d => d.frame === currentFrame - 1);
      if (prevFrameDrawings) renderPaths(prevFrameDrawings.paths, 0.35);
    }

    const currentFrameDrawings = drawings.find(d => d.frame === currentFrame);
    const pathsToDraw = currentFrameDrawings ? [...currentFrameDrawings.paths] : [];
    if (currentPath) pathsToDraw.push(currentPath);

    renderPaths(pathsToDraw, 1);
  }, [drawings, currentPath, currentFrame, onionSkinning]);

  // Handle Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvas.parentElement) {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    }
  }, [activeAsset]);

  const handleCopyLink = () => {
    toast({
      title: "Frame.io Share Link Copied! 🔗",
      description: "http://f.io/eRGT43Sa copied to clipboard.",
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0c0d12] text-zinc-300 font-sans overflow-hidden select-none">
      
      {/* ──────────────── 1. FRAME.IO TOP BREADCRUMB HEADER ──────────────── */}
      <div className="h-12 bg-[#12131c] border-b border-[#1c1e2d] flex items-center justify-between px-4 shrink-0 z-20">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className="h-6 w-6 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
            f.io
          </div>
          <span className="text-white font-bold">Dryp 2.0</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400">Shares</span>
          <span className="text-zinc-600">/</span>
          <button className="flex items-center gap-1.5 text-indigo-400 font-bold bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-lg border border-indigo-500/30 transition-colors">
            <span>{activeShare}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right Action Switchers */}
        <div className="flex items-center gap-3 text-xs font-bold">
          <button 
            onClick={() => setRightPanelTab(rightPanelTab === 'share' ? 'comments' : 'share')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1c29] hover:bg-[#232638] border border-[#272a3d] text-zinc-300 transition-colors cursor-pointer"
          >
            {rightPanelTab === 'share' ? <MessageSquare className="h-3.5 w-3.5 text-indigo-400" /> : <Share2 className="h-3.5 w-3.5 text-indigo-400" />}
            <span>{rightPanelTab === 'share' ? 'View Comments' : 'Share Settings'}</span>
          </button>
        </div>

      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* ──────────────── 2. LEFT SIDEBAR (Assets, Collections, Shares) ──────────────── */}
        <div className="w-60 bg-[#101119] border-r border-[#1c1e2d] flex flex-col shrink-0 text-xs">
          
          <div className="flex-1 overflow-y-auto p-3 space-y-6">
            
            {/* ASSETS SECTION */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between px-2 text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                <span>Assets</span>
                <button className="hover:text-white"><Plus className="h-3.5 w-3.5" /></button>
              </div>

              <button className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 font-medium transition-colors">
                <Folder className="h-3.5 w-3.5 text-indigo-400" />
                <span>All Assets</span>
              </button>

              <button className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 font-medium transition-colors">
                <Folder className="h-3.5 w-3.5 text-zinc-500" />
                <span>Episodes</span>
              </button>

              <button className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 font-medium transition-colors">
                <Folder className="h-3.5 w-3.5 text-zinc-500" />
                <span>Key Scenes</span>
              </button>

              {/* Nested Art Folder */}
              <div className="pl-2 flex flex-col gap-0.5 mt-1 border-l border-white/10 ml-3">
                <span className="text-[11px] font-bold text-zinc-400 px-2 py-1">Art</span>
                <span className="px-2 py-1 text-zinc-500 hover:text-zinc-300 cursor-pointer">Launch</span>
                <span className="px-2 py-1 text-zinc-500 hover:text-zinc-300 cursor-pointer">Editors</span>
                <span className="px-2 py-1 text-zinc-500 hover:text-zinc-300 cursor-pointer">RAWs</span>
                <span className="px-2 py-1 text-zinc-500 hover:text-zinc-300 cursor-pointer">Delivery</span>
              </div>
            </div>

            {/* COLLECTIONS SECTION */}
            <div className="flex flex-col gap-1 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between px-2 text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                <span>Collections</span>
                <button className="hover:text-white"><Plus className="h-3.5 w-3.5" /></button>
              </div>

              <button className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 font-medium transition-colors">
                <Film className="h-3.5 w-3.5 text-blue-400" />
                <span>Videos</span>
              </button>

              <button className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 font-medium transition-colors">
                <ImageIcon className="h-3.5 w-3.5 text-orange-400" />
                <span>Images</span>
              </button>

              <button className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 font-medium transition-colors">
                <Music className="h-3.5 w-3.5 text-pink-400" />
                <span>Audio</span>
              </button>

              <button className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 font-medium transition-colors">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Needs Review</span>
              </button>

              <button className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 font-medium transition-colors">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Approved</span>
              </button>
            </div>

            {/* SHARES SECTION (ACTIVE HIGHLIGHT) */}
            <div className="flex flex-col gap-1 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between px-2 text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                <span>Shares</span>
                <button className="hover:text-white"><Plus className="h-3.5 w-3.5" /></button>
              </div>

              <button className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-zinc-400 hover:bg-white/5 font-medium transition-colors">
                <span>All Shares (3)</span>
              </button>

              <button 
                onClick={() => setActiveShare('Teaser - ForClient')}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-bold transition-all text-left",
                  activeShare === 'Teaser - ForClient' 
                    ? "bg-[#1f2233] text-indigo-300 border border-indigo-500/30 shadow-xs" 
                    : "text-zinc-300 hover:bg-white/5"
                )}
              >
                <Folder className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">Teaser - ForClient</span>
              </button>

              <button 
                onClick={() => setActiveShare('Rough Cut 10/14/24')}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-bold transition-all text-left",
                  activeShare === 'Rough Cut 10/14/24' 
                    ? "bg-[#1f2233] text-indigo-300 border border-indigo-500/30 shadow-xs" 
                    : "text-zinc-400 hover:bg-white/5"
                )}
              >
                <Folder className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <span className="truncate">Rough Cut 10/14/24</span>
              </button>

              <button 
                onClick={() => setActiveShare('Trailer v2')}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-bold transition-all text-left",
                  activeShare === 'Trailer v2' 
                    ? "bg-[#1f2233] text-indigo-300 border border-indigo-500/30 shadow-xs" 
                    : "text-zinc-400 hover:bg-white/5"
                )}
              >
                <Folder className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <span className="truncate">Trailer v2</span>
              </button>
            </div>

          </div>

          {/* C2C Connection Indicator */}
          <div className="p-3 border-t border-[#1c1e2d] bg-[#0c0d12] flex items-center gap-2 text-zinc-400 font-semibold text-[11px]">
            <Cloud className="h-4 w-4 text-indigo-400" />
            <span>C2C Connections</span>
          </div>

        </div>

        {/* ──────────────── 3. CENTER REEL VIEWER & FILMSTRIP CAROUSEL ──────────────── */}
        <div className="flex-1 flex flex-col bg-[#07080c] relative overflow-hidden">
          
          {/* Subbar: Brand Header & Toolbar */}
          <div className="px-6 py-3 border-b border-[#171926] flex items-center justify-between bg-[#0e0f17]/60">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-zinc-800 text-white flex items-center justify-center font-bold text-[10px]">
                Dryp
              </div>
              <span className="text-sm font-bold text-white">Dryp 2.0</span>
            </div>

            <div className="flex items-center gap-6 text-xs text-zinc-400 font-semibold">
              <button className="hover:text-white flex items-center gap-1.5"><Sliders className="h-3.5 w-3.5" /> Appearance</button>
              <button className="hover:text-white flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Fields</button>
              <button className="hover:text-white flex items-center gap-1.5"><ChevronDown className="h-3.5 w-3.5" /> Sort</button>
            </div>
          </div>

          {/* SyncSketch Floating Pen Overlay */}
          <div className="absolute top-16 left-6 z-30 flex items-center gap-2 bg-[#12131c]/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-2xl">
            <button
              onClick={() => setToolType('brush')}
              className={cn("p-2 rounded-lg transition-all", toolType === 'brush' ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white")}
              title="Brush Pen"
            >
              <Paintbrush className="h-4 w-4" />
            </button>
            <button
              onClick={() => setToolType('arrow')}
              className={cn("p-2 rounded-lg transition-all", toolType === 'arrow' ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white")}
              title="Vector Arrow"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
            
            <div className="h-4 w-px bg-white/10 mx-1" />

            {['#ef4444', '#3b82f6', '#10b981', '#ffffff'].map(c => (
              <button 
                key={c}
                onClick={() => setActiveColor(c)}
                className={cn("w-4 h-4 rounded-full border transition-transform", activeColor === c ? "border-white scale-110" : "border-transparent")}
                style={{ backgroundColor: c }}
              />
            ))}

            <button onClick={() => setDrawings([])} className="p-2 text-zinc-400 hover:text-rose-400" title="Clear Canvas">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Hero Reel Video Container */}
          <div className="flex-1 relative flex items-center justify-center p-6">
            <div className="relative w-full h-full max-w-4xl aspect-video mx-auto bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center group">
              
              {activeAsset.type === 'video' ? (
                <video
                  ref={videoRef}
                  src={activeAsset.src}
                  className="w-full h-full object-cover pointer-events-none"
                  onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
                  onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
                />
              ) : (
                <img src={activeAsset.src} alt={activeAsset.title} className="w-full h-full object-cover pointer-events-none" />
              )}

              {/* Large Central Play Button Overlay */}
              {!isPlaying && activeAsset.type === 'video' && (
                <button
                  onClick={togglePlay}
                  className="absolute z-20 w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center transition-transform group-hover:scale-110 cursor-pointer shadow-2xl"
                >
                  <Play className="h-7 w-7 fill-white ml-1" />
                </button>
              )}

              {/* SyncSketch Canvas Overlay */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full touch-none cursor-crosshair z-10"
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
              />
            </div>
          </div>

          {/* FILMSTRIP REEL CAROUSEL */}
          <div className="p-4 bg-[#0d0e15] border-t border-[#171926] flex items-center justify-center gap-4 shrink-0">
            <button className="h-8 w-8 rounded-lg bg-[#181a26] text-zinc-400 hover:text-white flex items-center justify-center border border-white/5 cursor-pointer">
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              {mockReelAssets.map(item => {
                const isSelected = item.id === activeAsset.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveAsset(item)}
                    className={cn(
                      "w-24 h-16 rounded-xl relative overflow-hidden border-2 cursor-pointer transition-all shadow-md group",
                      isSelected ? "border-indigo-500 scale-105 ring-2 ring-indigo-500/30" : "border-white/10 opacity-70 hover:opacity-100"
                    )}
                  >
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 bg-black/60 rounded p-0.5">
                      <CheckSquare className={cn("h-3 w-3", isSelected ? "text-indigo-400" : "text-zinc-500")} />
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="h-8 w-8 rounded-lg bg-[#181a26] text-zinc-400 hover:text-white flex items-center justify-center border border-white/5 cursor-pointer">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Frame.io Bottom Selection Strip */}
          <div className="px-6 py-2.5 bg-[#090a0f] border-t border-[#171926] flex items-center justify-between text-xs font-semibold text-zinc-400 shrink-0">
            <span>✕ 1 Asset selected • {activeAsset.size}</span>
            <div className="flex items-center gap-4">
              <button className="hover:text-zinc-200">Remove from Share</button>
              <button className="px-3 py-1 rounded-lg bg-white/10 text-white font-bold border border-white/10 hover:bg-white/20 transition-colors">
                View in Source
              </button>
            </div>
          </div>

        </div>

        {/* ──────────────── 4. RIGHT SIDEBAR (Frame.io Link Visibility & Permissions) ──────────────── */}
        <div className="w-72 bg-[#101119] border-l border-[#1c1e2d] flex flex-col shrink-0 text-xs overflow-y-auto">
          
          <div className="p-4 flex flex-col gap-6">
            
            {/* Link Visibility Toggle */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Link Visibility</span>
                <input 
                  type="checkbox" 
                  checked={linkVisibility}
                  onChange={(e) => setLinkVisibility(e.target.checked)}
                  className="accent-indigo-500 w-4 h-4 cursor-pointer" 
                />
              </div>

              {/* Shortlink Box */}
              <div className="flex items-center bg-[#171926] border border-[#25283c] rounded-xl p-1.5 gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value="http://f.io/eRGT43Sa" 
                  className="bg-transparent text-xs font-mono text-zinc-300 w-full focus:outline-none px-1"
                />
                <button onClick={handleCopyLink} className="p-1 hover:text-white text-zinc-400">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button className="px-2 py-0.5 rounded bg-black/40 text-[10px] font-bold text-zinc-400 border border-white/10 flex items-center gap-1">
                  Secure <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 pt-1">
                <span>Only visible to project members</span>
                <div className="flex -space-x-1.5">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80" className="w-5 h-5 rounded-full border border-black" />
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80" className="w-5 h-5 rounded-full border border-black" />
                </div>
              </div>
            </div>

            {/* Layout Selector (Grid vs Reel) */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Layout</span>
              <div className="grid grid-cols-2 gap-2 bg-[#171926] p-1 rounded-xl border border-[#25283c]">
                <button
                  onClick={() => setLayoutMode('Grid')}
                  className={cn(
                    "py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    layoutMode === 'Grid' ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Grid className="h-3.5 w-3.5" /> Grid
                </button>
                <button
                  onClick={() => setLayoutMode('Reel')}
                  className={cn(
                    "py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    layoutMode === 'Reel' ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                  )}
                >
                  <ReelIcon className="h-3.5 w-3.5" /> Reel
                </button>
              </div>
            </div>

            {/* Security Settings */}
            <div className="flex flex-col gap-3 border-t border-[#1c1e2d] pt-4">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Security</span>
              
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-300">Passphrase</span>
                <input 
                  type="checkbox" 
                  checked={passphraseSecurity}
                  onChange={(e) => setPassphraseSecurity(e.target.checked)}
                  className="accent-indigo-500 w-4 h-4 cursor-pointer" 
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-300">Expiration date</span>
                <button className="px-2 py-0.5 rounded bg-[#171926] text-[10px] font-bold text-zinc-400 border border-[#25283c]">
                  Set
                </button>
              </div>
            </div>

            {/* Permissions Settings */}
            <div className="flex flex-col gap-3 border-t border-[#1c1e2d] pt-4">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Permissions</span>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-300">Comments</span>
                <input 
                  type="checkbox" 
                  checked={commentsPermission}
                  onChange={(e) => setCommentsPermission(e.target.checked)}
                  className="accent-indigo-500 w-4 h-4 cursor-pointer" 
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-300">Downloads</span>
                <input 
                  type="checkbox" 
                  checked={downloadsPermission}
                  onChange={(e) => setDownloadsPermission(e.target.checked)}
                  className="accent-indigo-500 w-4 h-4 cursor-pointer" 
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-300">Show all versions</span>
                <input 
                  type="checkbox" 
                  checked={showAllVersions}
                  onChange={(e) => setShowAllVersions(e.target.checked)}
                  className="accent-indigo-500 w-4 h-4 cursor-pointer" 
                />
              </div>
            </div>

            {/* Fields Settings */}
            <div className="flex flex-col gap-2 border-t border-[#1c1e2d] pt-4">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Fields</span>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-400">Featured field</span>
                <select className="bg-[#171926] border border-[#25283c] text-xs font-bold text-zinc-300 rounded px-2 py-1">
                  <option>Status</option>
                  <option>Version</option>
                  <option>Date</option>
                </select>
              </div>
            </div>

          </div>

          {/* Bottom Frame.io Share Action Buttons */}
          <div className="mt-auto p-4 border-t border-[#1c1e2d] bg-[#0c0d12] flex flex-col gap-2">
            <button 
              onClick={() => {
                toast({
                  title: "Opening Frame.io Share Page ↗",
                  description: "Launching client review URL in new tab...",
                });
              }}
              className="w-full py-2 rounded-xl bg-[#1a1c29] hover:bg-[#232638] text-white font-bold text-xs flex items-center justify-center gap-2 border border-[#272a3d] transition-colors cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
              <span>Open Share</span>
            </button>

            <button 
              onClick={handleCopyLink}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Link</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
