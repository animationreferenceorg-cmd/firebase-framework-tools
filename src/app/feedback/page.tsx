'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Clock, CheckCircle2, User, Sparkles, CornerDownRight, Plus, HelpCircle, Inbox, Layers } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';
import { FeedbackModal } from '@/components/FeedbackModal';

interface UserFeedback {
  id: string;
  email?: string;
  userEmail?: string;
  content: string;
  createdAt: any;
  response?: string;
  respondedAt?: any;
  status?: string;
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
    let unsubscribed = false;

    const fetchUserFeedback = async () => {
      try {
        setLoading(true);
        const feedbackRef = collection(db, 'feedback');
        const docsSnap: any[] = [];
        
        // 1. Fetch where userId == user.uid
        if (user?.uid) {
          const qUser = query(feedbackRef, where('userId', '==', user.uid));
          const snapUser = await getDocs(qUser).catch(() => ({ docs: [] }));
          docsSnap.push(...snapUser.docs);
        }

        // 2. Fetch locally saved doc IDs from this browser session
        try {
          const localDocIds: string[] = JSON.parse(localStorage.getItem('my_feedback_doc_ids') || '[]');
          for (const docId of localDocIds) {
            const dSnap = await getDoc(doc(db, 'feedback', docId)).catch(() => null);
            if (dSnap && dSnap.exists()) {
              docsSnap.push(dSnap);
            }
          }
        } catch (e) {
          // ignore localStorage error
        }

        // 3. Deduplicate items by document ID
        const seen = new Set<string>();
        const uniqueItems: UserFeedback[] = [];
        
        for (const d of docsSnap) {
          if (d && d.id && !seen.has(d.id)) {
            seen.add(d.id);
            uniqueItems.push({ id: d.id, ...d.data() } as UserFeedback);
          }
        }

        // 4. Sort desc by createdAt
        uniqueItems.sort((a, b) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (typeof a.createdAt === 'number' ? a.createdAt : 0);
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (typeof b.createdAt === 'number' ? b.createdAt : 0);
          return tB - tA;
        });

        if (!unsubscribed) {
          setFeedback(uniqueItems);
          setLoading(false);
          localStorage.setItem(LAST_SEEN_KEY, Date.now().toString());
        }
      } catch (e: any) {
        console.warn("Error loading user feedback:", e?.message || e);
        if (!unsubscribed) setLoading(false);
      }
    };

    fetchUserFeedback();

    return () => {
      unsubscribed = true;
    };
  }, [user?.uid]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-transparent text-white pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-4 space-y-6">
          <Skeleton className="h-16 w-80 rounded-2xl bg-white/5 mx-auto" />
          <Skeleton className="h-12 w-96 rounded-full bg-white/5 mx-auto" />
          <Skeleton className="h-64 w-full rounded-2xl bg-[#0f0c1d] border border-white/10" />
          <Skeleton className="h-64 w-full rounded-2xl bg-[#0f0c1d] border border-white/10" />
        </div>
      </div>
    );
  }

  const repliedFeedback = feedback.filter(f => f.response);
  const pendingFeedback = feedback.filter(f => !f.response);

  const renderThreadCard = (item: UserFeedback, index: number, totalCount: number) => {
    const formattedDate = item.createdAt?.toDate
      ? format(item.createdAt.toDate(), 'MMM d, yyyy • h:mm a')
      : 'Recent';

    const formattedResponseDate = item.respondedAt?.toDate
      ? format(item.respondedAt.toDate(), 'MMM d, yyyy • h:mm a')
      : 'Recent';

    return (
      <div
        key={item.id}
        className="group relative w-full overflow-hidden rounded-2xl bg-[#0f0c1d] border border-white/10 shadow-lg transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(124,58,237,0.3)] hover:border-purple-500/50"
      >
        {/* Marketplace Card Header */}
        <div className="bg-[#151128] border-b border-white/10 px-6 py-4 flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-purple-500/40 bg-purple-600/20 text-purple-200 font-bold px-3 py-1 text-xs rounded-full">
              Thread #{totalCount - index}
            </Badge>
            <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 text-purple-400" />
              {formattedDate}
            </span>
          </div>

          {item.response ? (
            <Badge className="bg-green-500/20 text-green-300 border border-green-500/40 font-semibold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_-3px_rgba(34,197,94,0.3)]">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
              Replied by Admin
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-white/5 text-zinc-400 border border-white/10 text-xs font-medium px-3 py-1 rounded-full">
              Awaiting Review
            </Badge>
          )}
        </div>

        {/* Card Content Thread Body */}
        <div className="p-6 md:p-8 relative space-y-6 bg-gradient-to-b from-[#0f0c1d] to-[#0a0814]">
          
          {/* Visual Vertical Thread Connector */}
          {item.response && (
            <div className="absolute left-[43px] md:left-[51px] top-[70px] bottom-[70px] w-0.5 bg-gradient-to-b from-purple-500/60 via-purple-500/30 to-purple-500/60 rounded-full" />
          )}

          {/* User Comment Node */}
          <div className="flex items-start gap-4 relative z-10">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] flex items-center justify-center shrink-0 border border-white/20 shadow-lg">
              <User className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-purple-200">You</span>
                <span className="text-[11px] text-zinc-500 font-mono">Original Feedback</span>
              </div>
              <div className="p-4 md:p-5 rounded-2xl bg-white/5 border border-white/10 text-zinc-200 text-sm md:text-base leading-relaxed backdrop-blur-sm shadow-inner">
                {item.content}
              </div>
            </div>
          </div>

          {/* Admin Response Node */}
          {item.response ? (
            <div className="flex items-start gap-4 relative z-10 pt-2">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 p-0.5 shrink-0 shadow-[0_0_20px_-3px_rgba(34,197,94,0.4)] border border-green-400/40">
                <div className="w-full h-full rounded-2xl bg-[#0f0c1d] flex items-center justify-center overflow-hidden relative">
                  <Image
                    src="/site-icon.png"
                    alt="Animation Reference"
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Animation Reference</span>
                    <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] px-2 py-0.5 font-mono rounded-md">
                      Official Team
                    </Badge>
                  </div>
                  <span className="text-xs text-zinc-400 font-medium">
                    {formattedResponseDate}
                  </span>
                </div>
                <div className="p-4 md:p-5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-purple-100 text-sm md:text-base leading-relaxed backdrop-blur-sm shadow-inner">
                  <div className="flex items-center gap-1.5 text-purple-300 text-xs font-bold mb-2 uppercase tracking-wider">
                    <CornerDownRight className="h-3.5 w-3.5 text-purple-400" />
                    Official Response
                  </div>
                  {item.response}
                </div>
              </div>
            </div>
          ) : (
            <div className="ml-14 md:ml-16 pl-2 pt-1 flex items-center gap-2 text-xs text-zinc-500 italic">
              <Clock className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
              Our team is reviewing your thread. Responses appear directly in this view.
            </div>
          )}

        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-purple-500/30 pb-24">
      
      <main className="container mx-auto px-4 pt-10 md:pt-16 max-w-5xl">

        {/* Marketplace Hero Header */}
        <div className="text-center space-y-4 mb-10 md:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-purple-300 text-xs font-bold tracking-widest uppercase mb-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            Community & Support
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white px-2">
            Feedback Threads
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base md:text-lg px-6 leading-relaxed">
            Track your submitted suggestions, feature requests, and direct responses from the Animation Reference team.
          </p>

          <div className="pt-4 flex justify-center">
            <FeedbackModal>
              <Button className="h-12 px-8 rounded-full font-bold bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] hover:scale-105 shadow-[0_10px_30px_-5px_rgba(124,58,237,0.5)] text-white border border-purple-400/20 transition-all duration-300 group cursor-pointer">
                <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                Submit New Feedback
              </Button>
            </FeedbackModal>
          </div>
        </div>

        {/* Filter Tabs using Marketplace TabsList */}
        <Tabs defaultValue="all" className="w-full">
          <div className="flex justify-start md:justify-center mb-10 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-full whitespace-nowrap min-w-max flex h-11 items-center">
              <TabsTrigger value="all" className="rounded-full px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white h-9 transition-all text-xs sm:text-sm font-semibold">
                <Layers className="mr-2 h-4 w-4" /> All Threads ({feedback.length})
              </TabsTrigger>
              <TabsTrigger value="replied" className="rounded-full px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white h-9 transition-all text-xs sm:text-sm font-semibold">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Admin Replied ({repliedFeedback.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="rounded-full px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white h-9 transition-all text-xs sm:text-sm font-semibold">
                <Clock className="mr-2 h-4 w-4" /> Awaiting Review ({pendingFeedback.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* All Threads Tab Content */}
          <TabsContent value="all" className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {feedback.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-[#0f0c1d] border border-white/10 text-center px-6">
                <div className="bg-white/5 p-6 rounded-full mb-6">
                  <Inbox className="h-12 w-12 text-purple-400/80" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">No Feedback Threads Yet</h2>
                <p className="text-zinc-400 max-w-md text-sm sm:text-base mb-6">
                  Have an idea for a feature, a reference clip request, or found a bug? We read every submission.
                </p>
                <FeedbackModal>
                  <Button className="h-12 px-8 rounded-full font-bold bg-white text-black hover:bg-white/90 shadow-xl transition-transform hover:scale-105 cursor-pointer">
                    Submit First Feedback
                  </Button>
                </FeedbackModal>
              </div>
            ) : (
              feedback.map((item, idx) => renderThreadCard(item, idx, feedback.length))
            )}
          </TabsContent>

          {/* Replied Tab Content */}
          <TabsContent value="replied" className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {repliedFeedback.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-[#0f0c1d] border border-white/10 text-center px-6">
                <div className="bg-white/5 p-6 rounded-full mb-6">
                  <CheckCircle2 className="h-12 w-12 text-green-400/80" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">No Admin Responses Yet</h2>
                <p className="text-zinc-400 max-w-md text-sm sm:text-base">
                  When our team replies to your feedback, the thread will appear right here.
                </p>
              </div>
            ) : (
              repliedFeedback.map((item, idx) => renderThreadCard(item, idx, repliedFeedback.length))
            )}
          </TabsContent>

          {/* Pending Tab Content */}
          <TabsContent value="pending" className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {pendingFeedback.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-[#0f0c1d] border border-white/10 text-center px-6">
                <div className="bg-white/5 p-6 rounded-full mb-6">
                  <Clock className="h-12 w-12 text-purple-400/80" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">No Pending Threads</h2>
                <p className="text-zinc-400 max-w-md text-sm sm:text-base">
                  All your feedback threads have been answered by our admin team!
                </p>
              </div>
            ) : (
              pendingFeedback.map((item, idx) => renderThreadCard(item, idx, pendingFeedback.length))
            )}
          </TabsContent>
        </Tabs>

      </main>
    </div>
  );
}
