
'use client';

import { ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const { app, auth, db } = initializeFirebase();
  return <FirebaseProvider app={app} auth={auth} db={db}>{children}</FirebaseProvider>;
}
