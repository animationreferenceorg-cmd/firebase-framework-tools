'use client';

import React from 'react';
import Link from 'next/link';
import { useSidebar } from '@/components/ui/sidebar';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';

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
                className={className}
                {...props}
            >
                {Icon && <Icon className="size-4" />}
                <span>{children}</span>
            </SidebarMenuButton>
        </Link>
    );
}
