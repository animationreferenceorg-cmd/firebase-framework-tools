'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Check } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface UserFeedback {
  id: string;
  email: string;
  content: string;
  createdAt: any;
  response?: string;
  respondedAt?: any;
}

export function UserFeedbackPanel() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);

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
        setFeedback(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading feedback:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.email]);

  if (loading) {
    return (
      <div className="space-y-2 px-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  const hasReplies = feedback.some(f => f.response);

  if (feedback.length === 0) {
    return null;
  }

  return (
    <Link href="/feedback">
      <div className="px-2 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-white/60 uppercase tracking-wider">My Feedback</span>
          {hasReplies && (
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
              <Check className="h-3 w-3 mr-1" />
              Replies
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          {feedback.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="text-xs text-white/50 line-clamp-2 hover:text-white/70 transition-colors"
            >
              {item.content}
            </div>
          ))}
          {feedback.length > 3 && (
            <div className="text-xs text-white/40 italic">
              +{feedback.length - 3} more
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
