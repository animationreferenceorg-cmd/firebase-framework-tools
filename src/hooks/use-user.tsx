
"use client";

import { createContext, useContext, ReactNode, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './use-auth';
import type { UserProfile } from '@/lib/types';
import { getUserProfile, createUserProfile } from '@/lib/firestore';


interface UserContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  mutate: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchedUidRef = useRef<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    const currentUid = authUser?.uid || null;

    if (!currentUid) {
      setUserProfile(null);
      setLoading(false);
      lastFetchedUidRef.current = null;
      return;
    }

    if (currentUid === lastFetchedUidRef.current) {
      return;
    }
    
    setLoading(true);
    try {
      let profile = await getUserProfile(currentUid);
      
      if (!profile && authUser) {
        await createUserProfile(authUser);
        profile = await getUserProfile(currentUid);
      }

      setUserProfile(profile);
      lastFetchedUidRef.current = currentUid;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      setUserProfile(null);
      // Mark current UID to avoid retrying continuously in a loop if rules/network fail
      lastFetchedUidRef.current = currentUid;
    } finally {
      setLoading(false);
    }
  }, [authUser?.uid, authLoading]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const mutate = useCallback(() => {
    lastFetchedUidRef.current = null;
    fetchUserProfile();
  }, [fetchUserProfile]);

  const value = useMemo(() => ({
    userProfile,
    loading: authLoading || loading,
    mutate
  }), [userProfile, authLoading, loading, mutate]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
