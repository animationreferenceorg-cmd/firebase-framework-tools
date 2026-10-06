'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, Layout, Sparkles, Check, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { track } from '@/lib/analytics';
import { getEntitlements } from '@/lib/plans';
import { useIntroOffer } from '@/hooks/use-intro-offer';

interface LimitReachedDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feature: 'likes' | 'moodboards';
    onDonateClick?: () => void;
    onUpgradeClick?: () => void;
}

export function LimitReachedDialog({ 
    open, 
    onOpenChange, 
    feature, 
    onDonateClick,
    onUpgradeClick 
}: LimitReachedDialogProps) {
    const { userProfile } = useUser();
    const isLikes = feature === 'likes';
    const { access, limits } = getEntitlements(userProfile);
    const limit = isLikes ? limits.maxSavedReferences : limits.maxBoards;
    const noun = isLikes ? (limit === 1 ? 'saved reference' : 'saved references') : (limit === 1 ? 'board' : 'boards');
    const planName = access === 'free' ? 'free plan' : 'current plan';
    const { shortPrice: price } = useIntroOffer();
    const title = isLikes ? 'Your reference library is full' : 'You’ve reached your board limit';
    const Icon = isLikes ? Heart : Layout;

    useEffect(() => {
        if (open) track('upgrade_prompt_viewed', { trigger: isLikes ? 'saved_reference_limit' : 'board_limit', source: 'limit_dialog' });
    }, [open, isLikes]);

    const handleAction = () => {
        onOpenChange(false);
        if (onUpgradeClick) {
            onUpgradeClick();
        } else if (onDonateClick) {
            onDonateClick();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-[#0b0914] border border-purple-500/30 text-white shadow-2xl rounded-3xl p-6">
                <DialogHeader className="text-center">
                    <div className="mx-auto w-14 h-14 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center mb-3 border border-purple-500/30 text-purple-400">
                        <Icon className="h-7 w-7" />
                    </div>
                    
                    <div className="inline-flex items-center gap-1 mx-auto px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px] font-mono uppercase tracking-widest font-bold border border-purple-500/25 mb-1">
                        <Sparkles className="h-3 w-3" />
                        <span>Pro Feature</span>
                    </div>

                    <DialogTitle className="text-center text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-zinc-300">
                        {title}
                    </DialogTitle>

                    <DialogDescription className="text-center text-zinc-400 pt-2 text-xs leading-relaxed">
                        Your {planName} includes {Number.isFinite(limit) ? limit : 'unlimited'} {noun}.{' '}
                        {isLikes
                            ? <>Upgrade to <strong className="text-purple-300">Pro</strong> to save unlimited references across every shot and project. Everything you’ve saved stays put.</>
                            : <>Upgrade to <strong className="text-purple-300">Pro</strong> for unlimited boards and private production workspaces. Your existing boards stay put.</>}
                    </DialogDescription>
                </DialogHeader>

                <div className="my-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs text-zinc-300">
                    <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 font-bold" />
                        <span>Unlimited Shot Boards & Guided Templates</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 font-bold" />
                        <span>Unlimited Saved References for Every Project</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 font-bold" />
                        <span>High-Resolution Boards, Contact Sheets & PDF Exports</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 font-bold" />
                        <span>Unlimited Portfolio Posts & Custom Showcase</span>
                    </div>
                </div>

                <DialogFooter className="mt-2 sm:justify-center">
                    <Button
                        onClick={handleAction}
                        className="w-full h-11 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                    >
                        <span>Upgrade to Pro — {price}</span>
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
