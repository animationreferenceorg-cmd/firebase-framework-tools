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
}

export function SidebarLink({ href, icon: Icon, children, tooltip, className, ...props }: SidebarLinkProps) {
    const { setOpenMobile, isMobile } = useSidebar();
    const pathname = usePathname();
    // Simple active check, can be expanded if needed (e.g. startsWith for sections)
    const isActive = pathname === href;

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
