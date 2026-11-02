'use client';

import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { UserProvider } from '@/hooks/use-user';
import { LayoutClient } from '@/components/LayoutClient';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { GoogleAnalytics } from '@/components/layout/GoogleAnalytics';
import { HeyCatchInit } from '@/components/HeyCatchInit';
import { ViewingQuotaProvider } from '@/hooks/use-viewing-quota';
import { AmbientBackdrop } from '@/components/motion/AmbientBackdrop';

export function SiteProviders({ children }: { children: ReactNode }) {
  return <>
    <HeyCatchInit /><GoogleAnalytics /><AmbientBackdrop />
    <FirebaseClientProvider><AuthProvider><UserProvider><ViewingQuotaProvider>
      <FirebaseErrorListener /><LayoutClient>{children}</LayoutClient>
    </ViewingQuotaProvider></UserProvider></AuthProvider></FirebaseClientProvider>
    <Toaster />
  </>;
}
