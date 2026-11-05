"use client";

import { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { isFirebaseConfigured } from '@/lib/firebase';
import type { User, Auth } from 'firebase/auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { useFirebase } from '@/firebase';

interface AuthContextType {
  user: User | null | undefined;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const firebaseConfigured = isFirebaseConfigured();
  const { auth } = useFirebase();
  // @ts-expect-error: Ignoring potential type mismatch for auth instance
  const [user, loading] = useAuthState(firebaseConfigured ? (auth as Auth) : undefined);

  const userId = user?.uid;
  // Hooks must run before the early return below.
  const value = useMemo(() => ({ user: user ?? null, loading }), [user, userId, loading]);

  // Pinterest-style automatic extension sign-in bridge
  // Whenever the user is signed into any tab of Animation Reference,
  // stamp the bridge DOM element and cookies so the browser extension auto-connects.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user) {
      const el = document.getElementById('animref-extension-auth-bridge');
      if (el) el.remove();
      document.cookie = 'animref_auth_token=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'animref_origin=; path=/; max-age=0; SameSite=Lax';
      return;
    }

    user.getIdTokenResult().then((tokenResult) => {
      const token = tokenResult.token;
      let bridge = document.getElementById('animref-extension-auth-bridge');
      if (!bridge) {
        bridge = document.createElement('div');
        bridge.id = 'animref-extension-auth-bridge';
        bridge.style.display = 'none';
        document.documentElement.appendChild(bridge);
      }
      bridge.dataset.token = token;
      bridge.dataset.refreshToken = user.refreshToken || '';
      bridge.dataset.expiresAt = String(new Date(tokenResult.expirationTime).getTime());
      bridge.dataset.origin = window.location.origin;
      bridge.dataset.uid = user.uid;
      bridge.dataset.email = user.email || '';

      // Set cookie so extension can also read via chrome.cookies without tab interaction
      document.cookie = `animref_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `animref_origin=${encodeURIComponent(window.location.origin)}; path=/; max-age=604800; SameSite=Lax`;

      // Dispatch to extension content script if active on this page
      try {
        window.postMessage({
          type: 'AR_CONNECT_POST_MESSAGE',
          token,
          refreshToken: user.refreshToken || '',
          tokenExpiresAt: new Date(tokenResult.expirationTime).getTime(),
          origin: window.location.origin,
        }, '*');
      } catch {}
    }).catch(() => {});
  }, [user]);

  if (!firebaseConfigured) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-2xl">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Firebase Configuration Missing</AlertTitle>
          <AlertDescription>
            <p className="mb-2">Your Firebase environment variables are not set. Please copy the configuration from your Firebase project settings into the <strong>.env</strong> file in the root of this project.</p>
            <p>Once you have added the keys, please restart the development server for the changes to take effect.</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
