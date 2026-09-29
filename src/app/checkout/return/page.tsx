'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Sparkles, ArrowRight, LayoutGrid, ShieldCheck, Film, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { PRO_FEATURES } from '@/lib/plans';

function ReturnContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get('session_id');
    const { user, loading: authLoading } = useAuth();
    const { mutate } = useUser();

    const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
    const [message, setMessage] = useState('Finalizing your Pro upgrade…');

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setStatus('success');
            return;
        }

        let isCancelled = false;

        async function syncAccess() {
            try {
                const idToken = await user?.getIdToken();
                if (!idToken) return;

                // Sync with Stripe immediately so the user doesn't wait for webhook
                const syncRes = await fetch('/api/sync-stripe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({}),
                });

                const syncData = await syncRes.json().catch(() => ({}));
                if (isCancelled) return;

                if (mutate) {
                    await mutate();
                }

                setStatus('success');
                setMessage(syncData?.message || 'Your Pro membership is active!');
            } catch (err: any) {
                if (isCancelled) return;
                console.error('Return sync error:', err);
                // Still allow user to proceed
                setStatus('success');
                setMessage('Your upgrade is being processed!');
            }
        }

        syncAccess();

        return () => {
            isCancelled = true;
        };
    }, [user, authLoading, mutate]);

    return (
        <div className="relative min-h-[85vh] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Ambient radiant background */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-purple-600/25 via-indigo-600/25 to-pink-500/15 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-purple-900/15 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-xl p-8 sm:p-10 rounded-3xl bg-[#08070e]/90 border border-purple-500/30 shadow-[0_30px_100px_rgba(0,0,0,0.95)] backdrop-blur-2xl text-center space-y-7">
                {/* Header icon */}
                <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-400 p-[2px] shadow-[0_0_40px_rgba(168,85,247,0.45)]">
                    <div className="w-full h-full rounded-[14px] bg-[#0c0a17] flex items-center justify-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400 animate-in zoom-in-75 duration-300" />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wider uppercase">
                        <Sparkles className="h-3 w-3" />
                        Upgrade Confirmed
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        Welcome to AnimationReference Pro
                    </h1>
                    <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                        {message} You now have complete access to professional animator tools, unlimited reference storage, and studio export pipelines.
                    </p>
                </div>

                {/* Features unlocked pill grid */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left space-y-3">
                    <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                        Unlocked on your account
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-zinc-300">
                        <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-purple-400 shrink-0" />
                            <span>Unlimited Boards & Drawovers</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Film className="h-4 w-4 text-purple-400 shrink-0" />
                            <span>Side-by-Side Playblast Compare</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
                            <span>Private Uploads & High-Res PDF</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <LayoutGrid className="h-4 w-4 text-purple-400 shrink-0" />
                            <span>Maya Bridge & Production Export</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-2">
                    <Button
                        asChild
                        className="w-full sm:w-auto h-12 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2"
                    >
                        <Link href="/moodboard">
                            Start a Moodboard <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        className="w-full sm:w-auto h-12 px-6 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                    >
                        <Link href="/">
                            Browse Reference Library
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutReturnPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            </div>
        }>
            <ReturnContent />
        </Suspense>
    );
}
