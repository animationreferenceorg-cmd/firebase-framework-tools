'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { MessageSquare } from 'lucide-react';
import { SidebarLink } from '@/components/SidebarLink';

interface UserFeedback {
  id: string;
  respondedAt?: any;
}

const LAST_SEEN_KEY = 'feedback_last_seen';

export function UserFeedbackPanel() {
  const { user } = useAuth();
  const [hasUnseenReply, setHasUnseenReply] = useState(false);

  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, 'feedback'),
      where('userEmail', '==', user.email),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as UserFeedback[];

        const lastSeen = parseInt(localStorage.getItem(LAST_SEEN_KEY) || '0', 10);
        const unseen = data.some(
          (item) => item.respondedAt?.toDate && item.respondedAt.toDate().getTime() > lastSeen
        );
        setHasUnseenReply(unseen);
      },
      (error) => {
        console.error('Error loading feedback:', error);
      }
    );

    return () => unsubscribe();
  }, [user?.email]);

  if (!user) return null;

  return (
    <SidebarLink href="/feedback" icon={MessageSquare} tooltip="My Feedback">
      <span className="flex items-center gap-2">
        Feedback
        {hasUnseenReply && (
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </span>
    </SidebarLink>
  );
}
