'use client';

import React from 'react';
import Link from 'next/link';
import { useSidebar } from '@/components/ui/sidebar';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SidebarLinkProps extends React.ComponentProps<typeof SidebarMenuButton> {
    href: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    target?: string;
    rel?: string;
}

export function SidebarLink({ href, icon: Icon, children, tooltip, className, target, rel, ...props }: SidebarLinkProps) {
    const { setOpenMobile, isMobile } = useSidebar();
    const pathname = usePathname();
    const isActive = pathname === href;
    const isExternal = href.startsWith('http://') || href.startsWith('https://');

    if (isExternal) {
        return (
            <a
                href={href}
                target={target || "_blank"}
                rel={rel || "noopener noreferrer"}
                onClick={() => {
                    if (isMobile) {
                        setOpenMobile(false);
                    }
                }}
                className="w-full"
            >
                <SidebarMenuButton
                    tooltip={tooltip}
                    isActive={false}
                    className={className}
                    {...props}
                >
                    {Icon && <Icon className="size-4" />}
                    <span>{children}</span>
                </SidebarMenuButton>
            </a>
        );
    }

    return (
        <Link
            href={href}
            onClick={() => {
                if (isMobile) {
                    setOpenMobile(false);
                }
            }}
            className="w-full"
        >
            <SidebarMenuButton
                tooltip={tooltip}
                isActive={isActive}
                className={cn(
                    'relative isolate transition-colors duration-200 data-[active=true]:bg-transparent data-[active=true]:text-white',
                    className
                )}
                {...props}
            >
                {/* Shared highlight that glides to whichever item is active.
                    Rendered first so the label stays the last <span>, which the
                    menu button relies on for truncation. */}
                {isActive && (
                    <motion.span
                        layoutId="sidebar-active"
                        aria-hidden
                        className="absolute inset-0 -z-10 rounded-md bg-gradient-to-r from-violet-500/25 via-violet-500/10 to-transparent ring-1 ring-inset ring-violet-400/20"
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    >
                        <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.9)]" />
                    </motion.span>
                )}
                {Icon && <Icon className={cn('size-4 transition-transform duration-300 ease-overshoot', isActive && 'scale-110 text-violet-200')} />}
                <span>{children}</span>
            </SidebarMenuButton>
        </Link>
    );
}
