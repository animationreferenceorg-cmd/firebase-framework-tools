'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Infinity as InfinityIcon, Layout } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';

interface UpgradeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uid?: string;
}

export function UpgradeDialog({ open, onOpenChange, uid }: UpgradeDialogProps) {
    const [loading, setLoading] = useState(false);
    const { mutate } = useUser();
    const { toast } = useToast();

    const handleMockUpgrade = async () => {
        if (!uid) return;
        setLoading(true);

        try {
            // MOCK PAYMENT: Directly toggling isPremium in Firestore
            // In production, this would redirect to Stripe Checkout
            await updateDoc(doc(db, "users", uid), {
                isPremium: true
            });

            await mutate(); // Refresh local user state

            toast({
                title: "Welcome to Pro! 🚀",
                description: "You now have unlimited access.",
                duration: 5000,
            });

            onOpenChange(false);
        } catch (error) {
            console.error("Upgrade failed:", error);
            toast({
                variant: "destructive",
                title: "Upgrade Failed",
                description: "Could not process your request."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#0f0f16] border-purple-500/20 text-white max-w-2xl sm:p-0 overflow-hidden">

                {/* Header / Hero */}
                <div className="bg-gradient-to-br from-purple-900/50 via-indigo-900/30 to-black p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500 rounded-full blur-[80px] opacity-40" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-500 rounded-full blur-[80px] opacity-40" />

                    <div className="relative z-10">
                        <div className="mx-auto w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/20 shadow-xl ring-1 ring-white/10">
                            <Sparkles className="h-8 w-8 text-purple-300" />
                        </div>
                        <DialogTitle className="text-3xl font-black tracking-tight mb-2">
                            Unlock <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Unlimited</span> Potential
                        </DialogTitle>
                        <DialogDescription className="text-zinc-300 text-lg max-w-md mx-auto">
                            Take your reference game to the next level with professional tools.
                        </DialogDescription>
                    </div>
                </div>

                {/* Benefits Grid */}
                <div className="p-8 grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Free Plan</h3>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3 text-zinc-400">
                                <Check className="h-4 w-4 text-zinc-600" />
                                <span>Browse 5,000+ References</span>
                            </li>
                            <li className="flex items-center gap-3 text-zinc-200 font-medium">
                                <Check className="h-4 w-4 text-orange-400" />
                                <span>Up to 5 Saved Videos</span>
                            </li>
                            <li className="flex items-center gap-3 text-zinc-400">
                                <Check className="h-4 w-4 text-zinc-600" />
                                <span>Basic Search</span>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-4 relative">
                        <div className="absolute -inset-4 bg-purple-500/5 rounded-2xl -z-10" />
                        <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                            <Zap className="h-3 w-3 fill-current" />
                            Pro Access
                        </h3>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3 text-white">
                                <div className="p-1 rounded bg-purple-500/20 text-purple-300">
                                    <InfinityIcon className="h-3 w-3" />
                                </div>
                                <span className="font-semibold">Unlimited Saves</span>
                            </li>
                            <li className="flex items-center gap-3 text-white">
                                <div className="p-1 rounded bg-purple-500/20 text-purple-300">
                                    <Layout className="h-3 w-3" />
                                </div>
                                <span className="font-semibold">Moodboards (Canvas)</span>
                            </li>
                            <li className="flex items-center gap-3 text-white">
                                <div className="p-1 rounded bg-purple-500/20 text-purple-300">
                                    <Check className="h-3 w-3" />
                                </div>
                                <span>Priority Support</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Footer / CTA */}
                <DialogFooter className="p-8 pt-0 flex-col sm:flex-col gap-3">
                    <Button
                        onClick={handleMockUpgrade}
                        disabled={loading}
                        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 shadow-lg shadow-purple-900/20 transition-all hover:scale-[1.02]"
                    >
                        {loading ? "Upgrading..." : "Upgrade to Pro • $5/mo"}
                    </Button>
                    <p className="text-center text-xs text-zinc-600 mt-2">
                        Secure payment via Stripe. Cancel anytime.
                    </p>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
}
