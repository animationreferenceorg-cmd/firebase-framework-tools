
"use client";

import { createContext, useContext, ReactNode } from 'react';
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
  // @ts-expect-error
  const [user, loading] = useAuthState(firebaseConfigured ? (auth as Auth) : undefined);

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

  const value = { user, loading };

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
