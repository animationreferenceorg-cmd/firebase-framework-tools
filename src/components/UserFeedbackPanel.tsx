'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { MessageSquare } from 'lucide-react';
import { SidebarLink } from '@/components/SidebarLink';

interface UserFeedback {
  id: string;
  response?: string;
  respondedAt?: any;
}

const LAST_SEEN_KEY = 'feedback_last_seen';

export function UserFeedbackPanel() {
  const { user } = useAuth();
  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'feedback'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as UserFeedback[];

        const lastSeen = parseInt(localStorage.getItem(LAST_SEEN_KEY) || '0', 10);
        const unseenItems = data.filter((item) => {
          if (!item.response) return false;
          if (!item.respondedAt) return true;
          const time = item.respondedAt.toDate ? item.respondedAt.toDate().getTime() : new Date(item.respondedAt).getTime();
          return time > lastSeen;
        });

        setUnseenCount(unseenItems.length);
      },
      (error) => {
        console.warn('Error loading feedback notification badge:', error?.message || error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  if (!user) return null;

  return (
    <SidebarLink href="/feedback" icon={MessageSquare} tooltip="Feedback Threads">
      <span className="flex items-center justify-between w-full pr-1">
        <span>Feedback</span>
        {unseenCount > 0 && (
          <span className="relative flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-black text-[10px] shadow-[0_0_12px_rgba(239,68,68,0.9)] border border-white/20 animate-pulse">
            {unseenCount}
          </span>
        )}
      </span>
    </SidebarLink>
  );
}
