'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import AuthHeader from '@/components/AuthHeader';
import { Film, Sparkles, Plus, PlayCircle, Layers, LayoutGrid, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UpdatesModal } from '@/components/UpdatesModal';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { BrandMark } from '@/components/motion/BrandMark';

export function GlassHeader() {
    const { state } = useSidebar();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isMoodboardPage = pathname === '/moodboard';
    const isBoardOpen = isMoodboardPage && searchParams.get('board') !== null;
    const isProfilePage = pathname.startsWith('/profile');

    return (
        <header className={cn(
            "z-50 flex justify-center px-4 pointer-events-none transition-all duration-300",
            isMoodboardPage || isProfilePage
                ? "absolute top-6 left-0 right-0 z-50 mb-0" 
                : "sticky top-6 mb-8"
        )}>
            <div className={cn(
                "edge-lit backdrop-blur-2xl backdrop-saturate-150 border rounded-full pl-2.5 pr-2.5 md:pr-3 py-2 flex items-center justify-between shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] w-full max-w-6xl pointer-events-auto transition-all duration-500 ease-out-expo",
                isBoardOpen
                    ? "bg-white/10 border-black/5 hover:bg-white/20 hover:border-black/10"
                    : "bg-[#110f1a]/70 border-white/[0.07] hover:bg-[#110f1a]/85 hover:shadow-[0_20px_60px_-20px_rgba(124,58,237,0.45)]"
            )}>
                {/* Left: Sidebar Trigger + brand */}
                <div className="flex items-center gap-2.5">
                    <div className={cn(
                        "rounded-full p-1 transition-all duration-300",
                        state === 'collapsed' 
                            ? "bg-white" 
                            : "bg-white/5"
                    )}>
                        <SidebarTrigger className={cn(
                            "rounded-full w-8 h-8 transition-colors duration-200",
                            state === 'collapsed' 
                                ? "text-[#1a1625] hover:bg-zinc-150" 
                                : "text-zinc-400 hover:text-white hover:bg-white/10"
                        )} />
                    </div>
                    <Link href="/home" aria-label="Animation Reference home" className="squash rounded-xl">
                        <BrandMark />
                    </Link>
                </div>

                {/* Center: Streamlined Navigation */}
                <nav className="hidden md:flex items-center gap-0.5 bg-black/25 rounded-full p-1 border border-white/[0.06] mx-2 md:mx-4">
                    {[
                        { label: 'Discover', href: '/home', icon: Film },
                        { label: 'Categories', href: '/categories', icon: LayoutGrid },
                        { label: 'Clips', href: '/references', icon: Scissors },
                        { label: 'Community', href: '/feed', icon: Sparkles },
                    ].map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                    "squash relative px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 flex items-center gap-1.5",
                                    isActive ? "text-white" : "text-zinc-400 hover:text-white"
                                )}
                            >
                                {/* One shared pill that glides between tabs, like a
                                    streaming app's nav, instead of each tab snapping
                                    its own background on and off. */}
                                {isActive && (
                                    <motion.span
                                        layoutId="header-nav-pill"
                                        className="absolute inset-0 -z-10 rounded-full bg-gradient-to-b from-violet-500 to-indigo-600 shadow-[0_6px_18px_-6px_rgba(124,58,237,0.9),inset_0_1px_0_rgba(255,255,255,0.25)]"
                                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                    />
                                )}
                                <Icon className="h-3.5 w-3.5" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Right: Upload CTA, Announcements & Auth */}
                <div className="flex items-center gap-2 md:gap-3">
                    {/* Global Upload CTA */}
                    <Link href="/profile?tab=studio&upload=true">
                        <Button
                            size="sm"
                            className="squash shine hidden sm:flex items-center gap-1.5 rounded-full h-9 px-4 text-xs font-bold bg-white text-[#12101c] hover:bg-white shadow-[0_8px_24px_-10px_rgba(255,255,255,0.6)] transition-shadow"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Upload Shot</span>
                        </Button>
                    </Link>

                    {/* Announcements */}
                    <UpdatesModal variant="header" />

                    {/* Auth Profile / Sign In */}
                    <div className="flex items-center [&_button]:rounded-full [&_.animated-gradient-border]:rounded-full">
                        <AuthHeader />
                    </div>
                </div>
            </div>
        </header>
    );
}
