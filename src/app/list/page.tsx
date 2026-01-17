
'use client';

import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MyListPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in zoom-in duration-500">
            {/* Decorative Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl mb-8">
                    <Construction className="h-16 w-16 text-purple-400 mx-auto animate-pulse" />
                </div>
            </div>

            <div className="space-y-4 max-w-md relative">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                    My List is <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Coming Soon</span>
                </h1>
                <p className="text-zinc-400 text-lg leading-relaxed">
                    We're building a cozy place for you to save and organize your favorite animation references. Stay tuned!
                </p>
            </div>

            <div className="pt-8 relative">
                <Button asChild variant="outline" className="h-14 px-8 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white transition-all">
                    <Link href="/home" className="flex items-center gap-2">
                        <ArrowLeft className="h-5 w-5" />
                        Back to Home
                    </Link>
                </Button>
            </div>
        </div>
    );
}
