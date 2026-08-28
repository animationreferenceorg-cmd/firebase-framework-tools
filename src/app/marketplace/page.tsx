"use client";

import React, { useEffect } from 'react';
import { ShoppingBag, ExternalLink, Sparkles, ArrowRight, Layers, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MarketplacePage() {
    // Open anim.works in a new tab so user's Animation Reference tab stays open
    useEffect(() => {
        const timer = setTimeout(() => {
            window.open('https://anim.works/', '_blank', 'noopener,noreferrer');
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen w-full bg-[#070b14] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/15 blur-[160px] rounded-full pointer-events-none" />

            <div className="max-w-md w-full rounded-[32px] bg-[#0d1424]/90 border border-purple-500/30 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl text-center space-y-6 relative z-10 animate-in zoom-in-95 duration-200">
                
                {/* Store Icon Badge */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 mx-auto shadow-xl shadow-purple-600/40 flex items-center justify-center">
                    <div className="w-full h-full rounded-[14px] bg-[#0c1424] flex items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-purple-400" />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[11px] font-mono font-bold uppercase tracking-wider">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Official Partner Store</span>
                    </div>

                    <h1 className="text-2xl font-black text-white tracking-wide">
                        Anim.works Marketplace
                    </h1>
                    <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                        Explore premium 3D animation rigs, courses, workshops, and production assets on Anim.works.
                    </p>
                </div>

                {/* Feature Highlights */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <div className="space-y-1">
                        <Layers className="h-4 w-4 text-purple-400 mx-auto" />
                        <span className="text-[10px] font-bold text-zinc-300 block">Pro Rigs</span>
                    </div>
                    <div className="space-y-1">
                        <ShieldCheck className="h-4 w-4 text-amber-400 mx-auto" />
                        <span className="text-[10px] font-bold text-zinc-300 block">Verified Assets</span>
                    </div>
                    <div className="space-y-1">
                        <Zap className="h-4 w-4 text-blue-400 mx-auto" />
                        <span className="text-[10px] font-bold text-zinc-300 block">Instant Access</span>
                    </div>
                </div>

                {/* Action Launcher Button */}
                <div className="space-y-3 pt-2">
                    <a
                        href="https://anim.works/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full block"
                    >
                        <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm gap-2 shadow-xl shadow-purple-600/40 cursor-pointer">
                            <span>Launch Anim.works Marketplace</span>
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                    </a>

                    <p className="text-[10px] text-zinc-500 font-mono">
                        Opening Anim.works in a new tab…
                    </p>
                </div>

            </div>
        </div>
    );
}
