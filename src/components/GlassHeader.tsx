'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import AuthHeader from '@/components/AuthHeader';
import { Film } from 'lucide-react';
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

    return (
        <header className={cn(
            "z-50 flex justify-center px-4 pointer-events-none transition-all duration-300",
            isMoodboardPage 
                ? "absolute top-6 left-0 right-0" 
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
                    ].map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="px-3 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                        >
                            {item.label}
                        </Link>
                    ))}
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
