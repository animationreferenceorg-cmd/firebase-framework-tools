
'use client';

import React from 'react';
import Link from 'next/link';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import AuthHeader from '@/components/AuthHeader';
import { Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function GlassHeader() {
    const { state } = useSidebar();

    return (
        <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <div className="bg-[#0f0c1d]/60 backdrop-blur-xl border border-white/10 rounded-full pl-4 pr-6 py-3 flex items-center justify-between shadow-2xl w-full max-w-6xl pointer-events-auto transition-all duration-300 hover:bg-[#0f0c1d]/80 hover:border-white/20 hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.3)]">
                {/* Left: Sidebar Trigger & Logo */}
                <div className="flex items-center gap-4">
                    <div className="bg-white/5 rounded-full p-1">
                        <SidebarTrigger className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full w-8 h-8" />
                    </div>

                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
                            <Film className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white hidden sm:block">AnimationRef</span>
                    </Link>
                </div>

                {/* Center: Navigation (Hidden on mobile) */}
                <nav className="hidden lg:flex items-center gap-1 bg-white/5 rounded-full p-1.5 border border-white/5 mx-4">
                    {[
                        { label: 'Home', href: '/' },
                        { label: 'Features', href: '/landing#features' },
                        { label: 'Browse', href: '/browse' },
                    ].map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="px-5 py-2 rounded-full text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-200"
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
