
'use client';

import { ReactNode, useEffect } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const { app, auth, db, storage } = initializeFirebase();

  useEffect(() => {
    // Pre-register hls.js on window so react-player's HLS video sources never
    // depend on fetching hls.js from cdn.jsdelivr.net at click-time. That fetch
    // has no error handling upstream, so if it's ever blocked (network hiccup,
    // ad-blocker, corporate firewall) it throws an unhandled rejection and
    // takes down the whole app.
    import('hls.js').then(({ default: Hls }) => {
      (window as unknown as { Hls?: typeof Hls }).Hls = Hls;
    }).catch(() => {});
  }, []);

  return <FirebaseProvider app={app} auth={auth} db={db} storage={storage}>{children}</FirebaseProvider>;
}
