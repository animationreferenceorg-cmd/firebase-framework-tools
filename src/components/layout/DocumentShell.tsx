'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const SiteProviders = dynamic(() => import('./SiteProviders').then(module => module.SiteProviders));

/** Embeds render only the player, without site chrome, auth, quota, banners or analytics. */
export function DocumentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/embed/')) return children;
  return <SiteProviders>{children}</SiteProviders>;
}
