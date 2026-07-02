'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Check, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Feedback {
  id: string;
  userId: string;
  userEmail: string;
  content: string;
  createdAt: any;
  status: 'new' | 'read' | 'archived';
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'feedback'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feedbackData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Feedback[];
      setFeedback(feedbackData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleMarkAsRead = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'read' ? 'new' : 'read';
    try {
      await updateDoc(doc(db, 'feedback', id), { status: newStatus });
    } catch (error) {
      console.error('Error updating feedback:', error);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await updateDoc(doc(db, 'feedback', id), { status: 'archived' });
    } catch (error) {
      console.error('Error archiving feedback:', error);
    }
  };

  const newCount = feedback.filter(f => f.status === 'new').length;
  const archivedCount = feedback.filter(f => f.status === 'archived').length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">New</CardTitle>
            <Badge variant="default">{newCount}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
            <Badge variant="secondary">{archivedCount}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{archivedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback list */}
      <Card>
        <CardHeader>
          <CardTitle>All Feedback</CardTitle>
          <CardDescription>User requests, bug reports, and suggestions</CardDescription>
        </CardHeader>
        <CardContent>
          {feedback.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No feedback yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedback.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 space-y-3 transition-colors ${
                    item.status === 'archived'
                      ? 'bg-muted/30 opacity-60'
                      : item.status === 'new'
                      ? 'bg-primary/5 border-primary/20'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{item.userEmail}</p>
                        {item.status === 'new' && (
                          <Badge variant="default" className="text-xs">
                            New
                          </Badge>
                        )}
                        {item.status === 'archived' && (
                          <Badge variant="secondary" className="text-xs">
                            Archived
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {item.createdAt?.toDate
                          ? format(item.createdAt.toDate(), 'MMM d, yyyy h:mm a')
                          : 'Unknown date'}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(item.id, item.status)}
                        title={item.status === 'new' ? 'Mark as read' : 'Mark as unread'}
                      >
                        <Check className={`h-4 w-4 ${item.status === 'new' ? '' : 'text-primary'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(item.id)}
                        disabled={item.status === 'archived'}
                        title="Archive"
                      >
                        <Trash2 className="h-4 w-4 text-destructive/50" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-foreground/90 break-words">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
