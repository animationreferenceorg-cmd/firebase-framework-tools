'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import AuthHeader from '@/components/AuthHeader';
import { Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function GlassHeader() {
    const { state } = useSidebar();

    return (
        <header className="sticky top-6 z-50 flex justify-center px-4 pointer-events-none mb-8">
            <div className="bg-[#1a1625]/80 backdrop-blur-xl border border-white/10 rounded-full pl-4 pr-6 py-3 flex items-center justify-between shadow-2xl w-full max-w-6xl pointer-events-auto transition-all duration-300 hover:bg-[#1a1625]/90 hover:border-white/20 hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.3)]">
                {/* Left: Sidebar Trigger & Logo */}
                <div className="flex items-center gap-4">
                    <div className="bg-white/5 rounded-full p-1">
                        <SidebarTrigger className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full w-8 h-8" />
                    </div>


                </div>

                {/* Center: Navigation (Visible on all screens) */}
                <nav className="flex items-center gap-1 bg-white/5 rounded-full p-1 md:p-1.5 border border-white/5 mx-2 md:mx-4">
                    {[
                        { label: 'Home', href: '/home' },
                        { label: 'Categories', href: '/categories' },
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

                {/* Right: Auth & Donate */}
                <div className="flex items-center gap-3">
                    {/* We wrap AuthHeader to style its children if needed, but for now we let it render its buttons */}
                    <div className="flex items-center [&_button]:rounded-full [&_.animated-gradient-border]:rounded-full">
                        <AuthHeader />
                    </div>
                </div>
            </div>
        </header>
    );
}
