'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import AuthHeader from '@/components/AuthHeader';
import { Film, Sparkles, Plus, PlayCircle, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UpdatesModal } from '@/components/UpdatesModal';
import { usePathname, useSearchParams } from 'next/navigation';

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
                "backdrop-blur-xl border rounded-full pl-4 pr-6 py-3 flex items-center justify-between shadow-2xl w-full max-w-6xl pointer-events-auto transition-all duration-300",
                isBoardOpen 
                    ? "bg-white/10 border-black/5 hover:bg-white/20 hover:border-black/10" 
                    : "bg-[#1a1625]/80 border-white/10 hover:bg-[#1a1625]/90 hover:border-white/20 hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.3)]"
            )}>
                {/* Left: Sidebar Trigger */}
                <div className="flex items-center gap-3">
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
                </div>

                {/* Center: Streamlined 3-Pillar Mode Navigation */}
                <nav className="hidden md:flex items-center gap-1.5 bg-white/5 rounded-full p-1 border border-white/5 mx-2 md:mx-4">
                    {[
                        { label: 'Discover Library', href: '/home', icon: Film },
                        { label: 'Community & Crews', href: '/feed', icon: Sparkles },
                    ].map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                    "relative px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-2",
                                    isActive
                                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-950/50"
                                        : "text-zinc-400 hover:text-white hover:bg-white/10"
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                <span>{item.label}</span>
                                {item.isPro && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-700/50 text-[9px] font-mono font-bold">
                                        PRO
                                    </span>
                                )}
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
                            className="hidden sm:flex items-center gap-1.5 rounded-full h-9 px-4 text-xs font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-md shadow-purple-900/40 hover:shadow-purple-700/50 transition-all border border-purple-400/30"
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
