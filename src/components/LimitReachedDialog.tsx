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
import { Heart, Layout } from 'lucide-react';

interface LimitReachedDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feature: 'likes' | 'moodboards';
    onDonateClick: () => void;
}

export function LimitReachedDialog({ open, onOpenChange, feature, onDonateClick }: LimitReachedDialogProps) {
    const isLikes = feature === 'likes';
    const title = isLikes ? 'Like Limit Reached' : 'Moodboard Limit Reached';
    const Icon = isLikes ? Heart : Layout;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-[#0f0f16] border-purple-500/20 text-white">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                        <Icon className="h-6 w-6 text-purple-400" />
                    </div>
                    <DialogTitle className="text-center text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-center text-zinc-400 pt-2 leading-relaxed">
                        We are sorry! If you'd like to {isLikes ? 'save more references' : 'create more specific moodboards'}, please check out our donation page.
                        This helps us grow and develop more features and find more references to save for the community.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="mt-6 sm:justify-center">
                    <Button
                        onClick={() => {
                            onOpenChange(false);
                            onDonateClick();
                        }}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold shadow-lg shadow-purple-900/20"
                    >
                        View Donation Options
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
