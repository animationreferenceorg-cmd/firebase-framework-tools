'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SiteProviders } from './SiteProviders';

/** Embeds render only the player, without site chrome, auth, quota, banners or analytics. */
export function DocumentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/embed/')) return children;
  return <SiteProviders>{children}</SiteProviders>;
}
