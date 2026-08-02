'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import AuthHeader from '@/components/AuthHeader';
import { Film, Sparkles } from 'lucide-react';
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
    const isProfilePage = pathname.startsWith('/profile') || pathname.startsWith('/u/');

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
                {/* Left: Sidebar Trigger & Logo */}
                <div className="flex items-center gap-4">
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

                {/* Center: Navigation (Visible on all screens) */}
                <nav className="hidden md:flex items-center gap-1 bg-white/5 rounded-full p-1 md:p-1.5 border border-white/5 mx-2 md:mx-4">
                    {[
                        { label: 'Home', href: '/home' },
                        { label: 'Categories', href: '/categories' },
                        { label: 'Tags', href: '/tags' },
                        { label: 'Marketplace', href: '/marketplace' },
                        { label: 'Portfolio', href: '/profile', isNew: true, icon: Sparkles },
                    ].map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                    "relative px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                                    isActive
                                        ? "bg-white/15 text-white shadow-md font-bold"
                                        : "text-zinc-400 hover:text-white hover:bg-white/10",
                                    item.isNew && "text-purple-300 hover:text-purple-200"
                                )}
                            >
                                {Icon && <Icon className="h-3.5 w-3.5 text-purple-400 animate-pulse" />}
                                <span>{item.label}</span>
                                {item.isNew && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-mono text-[9px] font-black uppercase tracking-wider shadow-md animate-pulse">
                                        NEW
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Right: Announcements, Auth & Donate */}
                <div className="flex items-center gap-2 md:gap-3">
                    {/* Announcements — what's new on the site */}
                    <UpdatesModal variant="header" />
                    {/* We wrap AuthHeader to style its children if needed, but for now we let it render its buttons */}
                    <div className="flex items-center [&_button]:rounded-full [&_.animated-gradient-border]:rounded-full">
                        <AuthHeader />
                    </div>
                </div>
            </div>
        </header>
    );
}
