'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Clock, Check } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

interface UserFeedback {
  id: string;
  email: string;
  content: string;
  createdAt: any;
  response?: string;
  respondedAt?: any;
}

const LAST_SEEN_KEY = 'feedback_last_seen';

export default function FeedbackPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
  }, [user, authLoading, router]);

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
        localStorage.setItem(LAST_SEEN_KEY, Date.now().toString());
      },
      (error) => {
        console.error('Error loading feedback:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.email]);

  if (authLoading || loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const repliedCount = feedback.filter(f => f.response).length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-purple-400" />
          <h1 className="text-3xl font-bold">My Feedback</h1>
        </div>
        <p className="text-muted-foreground">View your submitted feedback and responses from Animation Reference</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedback.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Replies Received</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repliedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback List */}
      {feedback.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-lg">No feedback submitted yet</p>
            <p className="text-muted-foreground text-sm mt-2">Share your thoughts using the feedback button in the app</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-6 space-y-4">
                {/* User Feedback */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Your Feedback</Badge>
                      {item.response && (
                        <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                          <Check className="h-3 w-3 mr-1" />
                          Replied
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.createdAt?.toDate
                        ? format(item.createdAt.toDate(), 'MMM d, yyyy h:mm a')
                        : 'Unknown date'}
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {item.content}
                  </p>
                </div>

                {/* Admin Response */}
                {item.response && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="relative h-9 w-9 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border border-primary/30">
                          <Image
                            src="/site-icon.png"
                            alt="Animation Reference"
                            width={36}
                            height={36}
                            className="object-cover"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">Animation Reference</p>
                          <span className="text-xs text-muted-foreground">
                            {item.respondedAt?.toDate
                              ? format(item.respondedAt.toDate(), 'MMM d, yyyy h:mm a')
                              : 'Unknown date'}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/90 mt-2">
                          {item.response}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
