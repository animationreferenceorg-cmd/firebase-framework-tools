'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingBag,
  ExternalLink,
  Sparkles,
  Search,
  Layers,
  ShieldCheck,
  Zap,
  Box,
  Compass,
  ArrowRight,
  Filter,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/ProductCard';
import { getProducts } from '@/lib/firestore-marketplace';
import type { Product } from '@/lib/marketplace-types';

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'sample-rig-1',
    title: 'Biped Hero Production Rig',
    description: 'Feature-ready Maya character rig with intuitive picker, FK/IK blending, and expressive facial controls.',
    price: 0,
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    category: 'Rigs',
    type: 'affiliate',
    linkUrl: 'https://anim.works/',
    rating: 4.9,
  },
  {
    id: 'sample-plugin-1',
    title: 'AnimPicker Studio Pro',
    description: 'High-speed character selection and keyframe breakdown utility for Autodesk Maya and Blender.',
    price: 19,
    imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=80',
    category: 'Plugins',
    type: 'affiliate',
    linkUrl: 'https://anim.works/',
    rating: 5.0,
  },
  {
    id: 'sample-set-1',
    title: 'Sci-Fi Corridor & Hangar Set',
    description: 'Optimized production environment set with modular lighting, collision proxy, and cinematic camera rigs.',
    price: 29,
    imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80',
    category: 'Sets',
    type: 'affiliate',
    linkUrl: 'https://anim.works/',
    rating: 4.8,
  },
  {
    id: 'sample-rig-2',
    title: 'Creature Quadruped Tiger Rig',
    description: 'Anatomically accurate muscle and spine dynamics for heavy quadruped run and combat animation.',
    price: 45,
    imageUrl: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800&auto=format&fit=crop&q=80',
    category: 'Rigs',
    type: 'affiliate',
    linkUrl: 'https://anim.works/',
    rating: 4.9,
  },
  {
    id: 'sample-plugin-2',
    title: 'Pose Library & Inbetweener',
    description: 'Save, blend, and mirror key animation poses across any character rig with one shortcut.',
    price: 15,
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
    category: 'Plugins',
    type: 'affiliate',
    linkUrl: 'https://anim.works/',
    rating: 4.7,
  },
  {
    id: 'sample-set-2',
    title: 'Urban Rooftops & Parkour Set',
    description: 'Modular urban rooftops set with ledges, water towers, and alleys crafted for locomotion references.',
    price: 35,
    imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&auto=format&fit=crop&q=80',
    category: 'Sets',
    type: 'affiliate',
    linkUrl: 'https://anim.works/',
    rating: 4.8,
  },
];

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Rigs' | 'Sets' | 'Plugins'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getProducts();
        if (isMounted) {
          if (data && data.length > 0) {
            setProducts(data);
          } else {
            setProducts(SAMPLE_PRODUCTS);
          }
        }
      } catch (err) {
        console.error('Failed to load marketplace products:', err);
        if (isMounted) setProducts(SAMPLE_PRODUCTS);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-transparent text-white space-y-10 pb-28">
      {/* ──────────────── HERO SECTION ──────────────── */}
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-[#131126] via-[#0c0d16] to-[#070b14] p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold shadow-md">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>Curated Animation Marketplace</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.1]">
            Production Rigs, Sets & Workflow Tools
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
            Equip your animation workflow with battle-tested character rigs, lighting & environment sets, and automation plugins created by industry veterans.
          </p>
        </div>

        {/* Partner Banner: Anim.works */}
        <div className="mt-8 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-600/30 border border-purple-400/40 text-purple-300">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Official Partner Store: Anim.works</span>
                <Badge className="bg-purple-600 text-white font-mono text-[9px] px-1.5 py-0">Partner</Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Access advanced character rigs, masterclasses, and specialized production tools.
              </p>
            </div>
          </div>

          <a
            href="https://anim.works/"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Button
              size="sm"
              className="w-full sm:w-auto h-9 gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30"
            >
              <span>Visit Anim.works</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      </section>

      {/* ──────────────── CONTROLS: CATEGORIES & SEARCH ──────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['All', 'Rigs', 'Sets', 'Plugins'] as const).map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                  active
                    ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                    : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat === 'All' ? 'All Items' : cat}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search rigs, sets, plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10 rounded-xl bg-white/5 border-white/10 text-xs text-white placeholder:text-zinc-500 focus:border-purple-500"
          />
        </div>
      </div>

      {/* ──────────────── PRODUCTS GRID ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-[#0f0c1d] p-4 space-y-3">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
            <ShoppingBag className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-300">No marketplace assets found</p>
            <p className="text-xs text-zinc-500 mt-1">Try adjusting your category or search query.</p>
          </div>
        )}
      </div>

      {/* ──────────────── CREATOR CALLOUT ──────────────── */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-purple-950/20 via-zinc-900/40 to-transparent p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
            <Zap className="h-4 w-4" />
            <span>Are you a Rigger or Tool Developer?</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            List Your Assets on the Marketplace
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
            Reach thousands of professional character animators, students, and studios. Showcase your Maya/Blender rigs, scripts, and production environments.
          </p>
        </div>

        <Link href="/feedback">
          <Button className="h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-6 shadow-lg shadow-purple-600/30">
            Submit Your Asset
          </Button>
        </Link>
      </section>
    </div>
  );
}
