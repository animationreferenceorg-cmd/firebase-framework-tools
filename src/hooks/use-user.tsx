
"use client";

import { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { useAuth } from './use-auth';
import type { UserProfile } from '@/lib/types';
import { getUserProfile, createUserProfile } from '@/lib/firestore';
import { auth } from '@/lib/firebase';

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

  const fetchUserProfile = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    
    if (authUser) {
      setLoading(true);
      try {
        const profile = await getUserProfile(authUser.uid);
        
        if (profile) {
            setUserProfile(profile);
        } else {
             // This case is a fallback, createUserProfile should handle it.
            await createUserProfile(authUser);
            const newUserProfile = await getUserProfile(authUser.uid);
            setUserProfile(newUserProfile);
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    } else {
      setUserProfile(null);
      setLoading(false);
    }
  }, [authUser, authLoading]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const mutate = useCallback(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const value = {
    userProfile,
    loading: authLoading || loading,
    mutate
  };

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
