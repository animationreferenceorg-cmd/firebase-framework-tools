'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Heart, Sparkles, Trophy, Check, CreditCard, ShieldCheck } from 'lucide-react';
import type { AnimationProject } from '@/lib/types';
import { recordProjectDonation } from '@/lib/project-service';

interface ProjectDonationModalProps {
  project: AnimationProject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDonationSuccess?: (newAmount: number) => void;
}

const PRESET_AMOUNTS = [5, 15, 30, 75, 150];

export function ProjectDonationModal({
  project,
  open,
  onOpenChange,
  onDonationSuccess,
}: ProjectDonationModalProps) {
  const { toast } = useToast();
  const [selectedAmount, setSelectedAmount] = useState<number>(15);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [backerName, setBackerName] = useState<string>('');
  const [backerNote, setBackerNote] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!project) return null;

  const funding = project.fundingGoal || {
    enabled: true,
    targetAmount: 1000,
    currentAmount: 0,
    currency: 'USD',
    description: 'Support production costs, sound design, and voice acting.',
  };

  const progressPercent = Math.min(100, Math.round(((funding.currentAmount || 0) / (funding.targetAmount || 1)) * 100));
  const finalAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

  const handlePledge = async () => {
    if (finalAmount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please select or enter a donation amount.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      await recordProjectDonation(project.id, finalAmount);
      const newTotal = (funding.currentAmount || 0) + finalAmount;
      toast({
        title: '🎉 Thank You for Your Support!',
        description: `You pledged $${finalAmount} to ${project.title}. Your support fuels independent animation!`,
      });
      onDonationSuccess?.(newTotal);
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Could not process donation pledge.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0e0a1a] border-pink-500/30 text-white p-6 md:p-8 rounded-3xl shadow-2xl backdrop-blur-3xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1.5 shadow-sm">
              <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-500/40" />
              Support Independent Animation
            </span>
          </div>

          <DialogTitle className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Fund {project.title}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs leading-relaxed">
            {funding.description}
          </DialogDescription>
        </DialogHeader>

        {/* Crowdfunding Progress Bar */}
        <div className="my-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
          <div className="flex items-baseline justify-between text-left">
            <div>
              <span className="text-2xl font-black text-white">${funding.currentAmount || 0}</span>
              <span className="text-xs text-zinc-400 ml-1.5 font-medium">raised of ${funding.targetAmount} goal</span>
            </div>
            <span className="text-xs font-mono font-bold text-pink-400">{progressPercent}%</span>
          </div>

          <Progress value={progressPercent} className="h-2 bg-white/10" />
        </div>

        {/* Amount Preset Buttons */}
        <div className="space-y-2 text-left">
          <label className="text-xs font-bold text-zinc-300">Choose Pledge Amount</label>
          <div className="grid grid-cols-5 gap-2">
            {PRESET_AMOUNTS.map((amt) => {
              const isSelected = selectedAmount === amt && !customAmount;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amt);
                    setCustomAmount('');
                  }}
                  className={`h-11 rounded-xl font-bold text-xs transition-all border ${
                    isSelected
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-400 shadow-lg shadow-pink-900/40 scale-105'
                      : 'bg-white/[0.04] text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  ${amt}
                </button>
              );
            })}
          </div>

          {/* Custom Amount Input */}
          <div className="pt-2">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-bold">$</span>
              <Input
                type="number"
                min="1"
                placeholder="Or enter custom amount..."
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="pl-8 bg-zinc-950 border-white/10 text-white h-11 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* Backer Details */}
        <div className="space-y-3 pt-2 text-left">
          <Input
            placeholder="Your name or handle (optional)"
            value={backerName}
            onChange={(e) => setBackerName(e.target.value)}
            className="bg-zinc-950 border-white/10 text-white h-10 rounded-xl text-xs"
          />
          <Textarea
            placeholder="Words of encouragement for the animation team..."
            value={backerNote}
            onChange={(e) => setBackerNote(e.target.value)}
            rows={2}
            className="bg-zinc-950 border-white/10 text-white rounded-xl text-xs"
          />
        </div>

        {/* Action Button */}
        <div className="pt-4 flex items-center justify-between gap-3 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white rounded-xl"
          >
            Cancel
          </Button>

          <Button
            onClick={handlePledge}
            disabled={isProcessing}
            className="h-12 px-6 rounded-xl bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-pink-950/60 flex items-center gap-2"
          >
            <Heart className="w-4 h-4 fill-white" />
            <span>Pledge ${finalAmount} to Project</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
