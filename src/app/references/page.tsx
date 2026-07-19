'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Play, Pause, X, Tag, RefreshCw, ZoomIn, Film, Layers, ChevronRight, Grid } from 'lucide-react';
import { CLIPS, CATEGORY_MAP, Clip } from './data';

CATEGORY_MAP.sakugabooru = 'Sakugabooru Stream';

// Brand colors
const BLUE = '#2563EB';
const DARK_BG = '#0B0B0C';
const CARD_BG = '#131316';
const ITEMS_PER_PAGE = 40;

export default function AnimRefBrowsePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  
  // Sakugabooru Stream State
  const [isSakugaStream, setIsSakugaStream] = useState(false);
  const [sakugaClips, setSakugaClips] = useState<Clip[]>([]);
  const [sakugaLoading, setSakugaLoading] = useState(false);

  const fetchSakugaClips = async (tagsList: string[] = []) => {
    setSakugaLoading(true);
    try {
      const tagsParam = tagsList.length > 0 ? `&tags=${encodeURIComponent(tagsList.join(' '))}` : '';
      const response = await fetch(`/api/sakugabooru/random?limit=40${tagsParam}`);
      if (!response.ok) throw new Error('Failed to fetch Sakugabooru stream');
      const data = await response.json();
      setSakugaClips(data);
    } catch (err) {
      console.error('Sakugabooru stream fetch error:', err);
    } finally {
      setSakugaLoading(false);
    }
  };

  useEffect(() => {
    if (isSakugaStream) {
      const delayDebounce = setTimeout(() => {
        const combined = [...selectedTags];
        if (searchQuery.trim()) {
          combined.push(searchQuery.trim());
        }
        fetchSakugaClips(combined);
      }, 500);
      return () => clearTimeout(delayDebounce);
    }
  }, [isSakugaStream, selectedTags, searchQuery]);

  // Video player state in modal
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  // Auto-play control for grid cards
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    if (hoveredClipId) {
      const vid = videoRefs.current[hoveredClipId];
      if (vid) {
        vid.muted = true;
        vid.play().catch(() => {});
      }
    } else {
      // Pause all background videos
      Object.values(videoRefs.current).forEach(vid => {
        if (vid) {
          vid.pause();
          vid.currentTime = 0;
        }
      });
    }
  }, [hoveredClipId]);

  // Reset pagination on filter changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchQuery, activeCategory, selectedTags]);

  // Modal play/pause keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedClip) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggleModalPlay();
      } else if (e.code === 'ArrowRight') {
        stepFrame(1 / 30);
      } else if (e.code === 'ArrowLeft') {
        stepFrame(-1 / 30);
      } else if (e.code === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClip, isPlaying]);

  const toggleModalPlay = () => {
    if (modalVideoRef.current) {
      if (isPlaying) {
        modalVideoRef.current.pause();
      } else {
        modalVideoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const stepFrame = (amount: number) => {
    if (modalVideoRef.current) {
      modalVideoRef.current.pause();
      setIsPlaying(false);
      modalVideoRef.current.currentTime = Math.max(0, Math.min(modalVideoRef.current.duration, modalVideoRef.current.currentTime + amount));
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (modalVideoRef.current) {
      modalVideoRef.current.playbackRate = rate;
    }
  };

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActiveCategory('all');
    setSelectedTags([]);
  };

  const closeModal = () => {
    setSelectedClip(null);
    setIsPlaying(true);
    setPlaybackRate(1.0);
  };

  // Get all unique tags from currently loaded database to display in recommendation
  const allAvailableTags = Array.from(new Set(CLIPS.flatMap(c => c.tags))).slice(0, 15);

  // Filtering Logic
  const filteredClips = CLIPS.filter(clip => {
    // 1. Category Filter
    if (activeCategory !== 'all' && clip.category !== activeCategory) {
      return false;
    }
    // 2. Selected Tags Filter
    if (selectedTags.length > 0 && !selectedTags.every(t => clip.tags.includes(t))) {
      return false;
    }
    // 3. Search Query Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = clip.name.toLowerCase().includes(query);
      const matchTags = clip.tags.some(t => t.toLowerCase().includes(query));
      const matchCat = CATEGORY_MAP[clip.category]?.toLowerCase().includes(query);
      if (!matchName && !matchTags && !matchCat) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0B0C]">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden py-24 px-6 md:px-12 border-b border-gray-900 bg-radial-at-t from-gray-900/40 via-transparent to-transparent">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-8">
          <span 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-xs font-black uppercase tracking-widest"
            style={{ color: BLUE }}
          >
            <Film className="w-3.5 h-3.5" /> Indie Game Animation Database
          </span>
          
          <h1 className="font-sans font-black text-4xl sm:text-6xl tracking-tight leading-[1.05] text-white max-w-4xl">
            Discover Ultra-Smooth<br />
            <span style={{ color: BLUE }}>Game Animations</span> & <span className="text-purple-500">VFX Clips</span>
          </h1>
          
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl leading-relaxed">
            Curated library of combat, movement, hit responses, and cinematic transitions for animators and motion designers. Click any card to enter theater mode for frame-by-frame analysis.
          </p>

          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-gray-500 font-bold">
            <div className="flex items-center gap-2">
              <span className="text-white font-extrabold text-lg">{CLIPS.length}</span> Clips Available
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />
            <div className="flex items-center gap-2">
              <span className="text-white font-extrabold text-lg">{Object.keys(CATEGORY_MAP).length}</span> Combat Categories
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />
            <div className="flex items-center gap-2">
              Frame-by-Frame Slow Mo
            </div>
          </div>
        </div>
      </section>

      {/* 2. FILTER & SEARCH CONTROL BLOCK */}
      <section className="bg-[#0B0B0C] border-b border-gray-900 sticky top-16 z-45">
        <div className="max-w-7xl mx-auto px-6 py-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by character, game, weapon, action, or tag..."
                className="w-full bg-[#131316] border border-gray-800 hover:border-gray-700 focus:border-blue-600 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Clear Filters Button */}
            {(searchQuery || activeCategory !== 'all' || selectedTags.length > 0) && (
              <button
                onClick={clearFilters}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            )}

            {isSakugaStream && (
              <button
                onClick={() => fetchSakugaClips(selectedTags)}
                disabled={sakugaLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-purple-500/30 hover:border-purple-500/60 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 hover:text-purple-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${sakugaLoading ? 'animate-spin' : ''}`} /> Reroll Stream
              </button>
            )}
          </div>

          {/* Categories Tab Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-t border-gray-900/60 pt-3">
            <button
              onClick={() => { setActiveCategory('all'); setIsSakugaStream(false); }}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'all' && !isSakugaStream
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                  : 'bg-[#131316] text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              All Categories
            </button>
            {Object.entries(CATEGORY_MAP).filter(([key]) => key !== 'sakugabooru').map(([key, name]) => (
              <button
                key={key}
                onClick={() => { setActiveCategory(key); setIsSakugaStream(false); }}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === key && !isSakugaStream
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                    : 'bg-[#131316] text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {name}
              </button>
            ))}
            <button
              onClick={() => { setIsSakugaStream(true); setActiveCategory('all'); }}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                isSakugaStream
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/15'
                  : 'bg-[#131316] text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              ✨ Sakugabooru Stream (Free)
            </button>
          </div>

          {/* Selected Tags Display */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Active Tags:</span>
              {selectedTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600/10 border border-blue-500/20 rounded-md text-xs font-bold text-blue-400 hover:bg-blue-600/20"
                >
                  #{tag} <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. MASONRY VIDEO GRID */}
      <section id="library" className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Grid className="w-5 h-5 text-blue-500" />
              Reference Library
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              {isSakugaStream 
                ? `Showing ${sakugaClips.length} random Sakugabooru references`
                : `Showing ${Math.min(visibleCount, filteredClips.length)} of ${filteredClips.length} matching clips`
              }
            </p>
          </div>

          {/* Tag Quick Selection Recommendation */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500">Quick Tags:</span>
            <div className="flex flex-wrap gap-1.5">
              {allAvailableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#131316] text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isSakugaStream && sakugaLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={idx} className="bg-[#131316] rounded-2xl overflow-hidden border border-gray-900 aspect-[1.33] animate-pulse flex flex-col justify-between p-4">
                <div className="w-1/3 h-4 bg-gray-800 rounded-md" />
                <div className="w-2/3 h-4 bg-gray-800 rounded-md" />
              </div>
            ))}
          </div>
        ) : (isSakugaStream ? sakugaClips : filteredClips).length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {(isSakugaStream ? sakugaClips : filteredClips.slice(0, visibleCount)).map((clip) => {
                const isHovered = hoveredClipId === clip.id;
                const aspectRatio = clip.width / clip.height;
                
                return (
                  <div
                    key={clip.id}
                    className="group bg-[#131316] rounded-2xl overflow-hidden border border-gray-900 hover:border-gray-800 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer"
                    onMouseEnter={() => setHoveredClipId(clip.id)}
                    onMouseLeave={() => setHoveredClipId(null)}
                    onClick={() => setSelectedClip(clip)}
                  >
                    {/* Video Player Wrapper */}
                    <div 
                      className="relative bg-black w-full overflow-hidden flex items-center justify-center"
                      style={{ aspectRatio: `${aspectRatio > 0.5 && aspectRatio < 2.5 ? aspectRatio : 1.33}` }}
                    >
                      {/* Thumbnail Image */}
                      <img
                        src={clip.thumbnailUrl}
                        alt={clip.name}
                        referrerPolicy="no-referrer"
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                          isHovered ? 'opacity-0' : 'opacity-100'
                        }`}
                      />
                      
                      {/* Video element - plays on hover */}
                      <video
                        ref={el => { videoRefs.current[clip.id] = el; }}
                        src={clip.videoUrl}
                        loop
                        muted
                        playsInline
                        className={`w-full h-full object-cover transition-opacity duration-300 ${
                          isHovered ? 'opacity-100' : 'opacity-0'
                        }`}
                      />

                      {/* Bottom overlay details */}
                      <div className="absolute bottom-2.5 right-2.5 px-2 py-1 bg-black/75 rounded text-[10px] font-black tracking-wide text-white">
                        {clip.duration > 0 ? `${clip.duration.toFixed(1)}s` : 'Sakuga'}
                      </div>

                      <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 bg-blue-600/90 text-white rounded text-[10px] font-black uppercase tracking-wider">
                        {CATEGORY_MAP[clip.category]?.split(' ')[0] || clip.category}
                      </div>

                      {/* Play Icon hover overlay */}
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
                          <ZoomIn className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <h3 className="text-sm font-bold text-gray-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                        {clip.name}
                      </h3>

                      <div className="flex flex-wrap gap-1">
                        {clip.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] font-semibold text-gray-500 bg-gray-950 px-2 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                        {clip.tags.length > 3 && (
                          <span className="text-[10px] font-semibold text-gray-600 bg-gray-950 px-2 py-0.5 rounded">
                            +{clip.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {!isSakugaStream && visibleCount < filteredClips.length && (
              <div className="flex justify-center mt-16">
                <button
                  onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                  className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-600/20"
                >
                  Load More Clips ({filteredClips.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-24 text-center border border-dashed border-gray-800 rounded-3xl bg-[#131316]/50">
            <Film className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No matching clips found</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Try adjusting your search query, selecting another category, or removing some tags.
            </p>
            <button
              onClick={clearFilters}
              className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-black uppercase tracking-widest text-white rounded-lg transition-all cursor-pointer"
            >
              Show All Clips
            </button>
          </div>
        )}
      </section>

      {/* 4. ABOUT & FEATURES SECTION */}
      <section id="about" className="py-24 px-6 md:px-12 bg-[#080809] border-t border-gray-900 text-left">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-8">
            <div className="space-y-3">
              <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: BLUE }}>
                DESIGN PHILOSOPHY & CAPABILITY
              </span>
              <h2 className="text-3xl sm:text-4xl font-sans font-black tracking-tight text-white leading-none">
                Built for Professional Animators
              </h2>
            </div>
            
            <p className="text-gray-400 text-sm leading-relaxed">
              AnimRef delivers fast, high-quality loops. Every video supports instant playback adjustments and frame-by-frame analysis. Using your keyboard (Arrow keys) you can step frame-by-frame forward or backward to inspect the poses and timing details.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-[#131316] border border-gray-900/60">
                <Layers className="w-6 h-6 text-blue-500 mb-3" />
                <h4 className="font-bold text-sm text-gray-200 mb-1">Detailed Tag Engine</h4>
                <p className="text-xs text-gray-500 leading-relaxed">Filter by shield block, polearm, dual-wielding, dodge, fall states, and more.</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#131316] border border-gray-900/60">
                <Film className="w-6 h-6 text-purple-500 mb-3" />
                <h4 className="font-bold text-sm text-gray-200 mb-1">Frame-by-Frame Scrubbing</h4>
                <p className="text-xs text-gray-500 leading-relaxed">Made for motion matching analysis, featuring keyboard steps and speed controls.</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-blue-600 rounded-[32px] rotate-3 opacity-5 blur-xl pointer-events-none" />
            <div className="relative aspect-[16/10] rounded-[24px] overflow-hidden border border-gray-800 shadow-2xl bg-[#131316] p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-gray-900 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-[10px] font-mono text-gray-500 tracking-wider">ANIMREF PLAYER CONSOLE</span>
              </div>
              
              <div className="my-8 text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-bold">
                  Keyboard Shortcut Guide
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-400 max-w-sm mx-auto">
                  <div className="bg-gray-950 p-3 rounded-lg border border-gray-900">
                    <span className="text-white block mb-1">Spacebar</span>
                    Play / Pause
                  </div>
                  <div className="bg-gray-950 p-3 rounded-lg border border-gray-900">
                    <span className="text-white block mb-1">Esc Key</span>
                    Close Theater Mode
                  </div>
                  <div className="bg-gray-950 p-3 rounded-lg border border-gray-900">
                    <span className="text-white block mb-1">← Key</span>
                    Step Back 1 Frame
                  </div>
                  <div className="bg-gray-950 p-3 rounded-lg border border-gray-900">
                    <span className="text-white block mb-1">→ Key</span>
                    Step Forward 1 Frame
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-center text-gray-600 border-t border-gray-900 pt-4">
                Frame-stepping driven by HTML5 Media Controller
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ SECTION */}
      <section id="faq" className="py-24 px-6 md:px-12 bg-[#0B0B0C]">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: BLUE }}>
              QUESTIONS ANSWERED
            </span>
            <h3 className="text-3xl sm:text-4xl font-sans font-black tracking-tight text-white leading-none">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "What is the source of these reference videos?",
                a: "All animation loops are loaded directly from high-resolution storage buckets. We host responsive MP4 files to ensure instantaneous loading and lag-free scrubbing."
              },
              {
                q: "How can I adjust the playback speed?",
                a: "Click any video card to open the theater player. Below the video track, you can choose between 0.25x, 0.5x, 0.75x, 1.0x, or 1.5x speed options to break down fast moves."
              },
              {
                q: "Am I allowed to download these clips?",
                a: "These clips are provided strictly for online analysis, learning, and reference. Please respect the original game copyright and creators."
              }
            ].map((faq, idx) => (
              <details 
                key={idx} 
                className="group bg-[#131316] border border-gray-900 rounded-xl overflow-hidden transition-all duration-300"
              >
                <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none text-left select-none">
                  <span className="font-bold text-gray-200 text-sm group-hover:text-white transition-colors">{faq.q}</span>
                  <ChevronRight className="w-4 h-4 shrink-0 text-gray-500 transition-transform duration-300 group-open:rotate-90" />
                </summary>
                <p className="px-6 pb-5 text-xs text-gray-400 leading-relaxed font-medium text-left border-t border-gray-900/60 pt-4">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 6. THEATER-STYLE DETAIL MODAL */}
      {selectedClip && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-[#131316] border border-gray-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col lg:flex-row relative">
            
            {/* Close Button */}
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 z-55 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Column: Huge Video Player */}
            <div className="lg:w-2/3 bg-black flex flex-col justify-center relative min-h-[300px]">
              <video
                ref={modalVideoRef}
                src={selectedClip.videoUrl}
                autoPlay
                loop
                playsInline
                className="w-full h-auto max-h-[70vh] object-contain"
              />

              {/* Video controller bar */}
              <div className="bg-[#131316] border-t border-gray-900 p-4 flex flex-wrap items-center justify-between gap-4">
                {/* Play/Pause & Step Buttons */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={toggleModalPlay}
                    className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-colors cursor-pointer"
                    title="Play / Pause (Space)"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  <button 
                    onClick={() => stepFrame(-1 / 30)}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-950 border border-gray-900 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-all cursor-pointer"
                    title="Step backward 1 frame (← Key)"
                  >
                    &larr; Prev Frame
                  </button>

                  <button 
                    onClick={() => stepFrame(1 / 30)}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-950 border border-gray-900 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-all cursor-pointer"
                    title="Step forward 1 frame (→ Key)"
                  >
                    Next Frame &rarr;
                  </button>
                </div>

                {/* Speed Controls */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-500 mr-1.5">Speed:</span>
                  {[0.25, 0.5, 0.75, 1.0, 1.5].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        playbackRate === rate
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-950 text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      {rate.toFixed(2)}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Video Details & Recommendation */}
            <div className="lg:w-1/3 p-6 md:p-8 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-gray-800 space-y-6">
              <div className="space-y-6">
                <div>
                  <span 
                    className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white"
                    style={{ backgroundColor: BLUE }}
                  >
                    {CATEGORY_MAP[selectedClip.category] || selectedClip.category}
                  </span>
                  
                  <h2 className="text-xl font-bold text-white mt-3 leading-snug">
                    {selectedClip.name}
                  </h2>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-gray-900 pb-2">
                    <span className="text-gray-500 font-bold">Framerate</span>
                    <span className="text-gray-300">30 FPS</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-900 pb-2">
                    <span className="text-gray-500 font-bold">Duration</span>
                    <span className="text-gray-300">{selectedClip.duration.toFixed(3)}s</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-900 pb-2">
                    <span className="text-gray-500 font-bold">Dimensions</span>
                    <span className="text-gray-300">{selectedClip.width} × {selectedClip.height}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedClip.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          handleTagToggle(tag);
                          closeModal();
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold text-blue-400 bg-blue-600/10 border border-blue-500/10 hover:bg-blue-600/20 transition-all cursor-pointer"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Related clips list in recommendation */}
              <div className="pt-6 border-t border-gray-900">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3">
                  Related Recommendations
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {CLIPS
                    .filter(c => c.id !== selectedClip.id && (c.category === selectedClip.category || c.tags.some(t => selectedClip.tags.includes(t))))
                    .slice(0, 2)
                    .map(clip => (
                      <div 
                        key={clip.id} 
                        onClick={() => {
                          setSelectedClip(clip);
                          setIsPlaying(true);
                          setPlaybackRate(1.0);
                        }}
                        className="group flex flex-col gap-1.5 cursor-pointer bg-gray-950 p-2 rounded-xl border border-gray-900/60 hover:border-gray-800"
                      >
                        <div className="aspect-[1.5] w-full rounded-lg overflow-hidden relative">
                          <img 
                            src={clip.thumbnailUrl} 
                            alt={clip.name} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold line-clamp-1 group-hover:text-white">
                          {clip.name}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
