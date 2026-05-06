
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function FeedbackModal() {
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [open, setOpen] = useState(false);
  const [honeypot, setHoneypot] = useState(''); // Anti-spam honeypot
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (honeypot) {
      // If honeypot is filled, it's likely a bot
      setSubmitted(true);
      return;
    }

    if (!feedback.trim()) return;

    // Check cooldown (60 seconds)
    const lastFeedback = localStorage.getItem('last_feedback_time');
    if (lastFeedback && Date.now() - parseInt(lastFeedback) < 60000) {
      toast({
        variant: "destructive",
        title: "Slow down!",
        description: "Please wait a minute before sending more feedback.",
      });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user?.uid || 'anonymous',
        userEmail: user?.email || 'anonymous',
        content: feedback,
        createdAt: serverTimestamp(),
        status: 'new',
      });

      localStorage.setItem('last_feedback_time', Date.now().toString());
      setSubmitted(true);
      toast({
        title: "Feedback Sent!",
        description: "Thank you for helping us improve.",
      });
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not send feedback. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSubmitted(false);
        setFeedback('');
      }, 300);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors group">
          <MessageSquare className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span>Send Feedback</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Found a bug? Have a feature request? Let us know!
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Thank You!</h3>
              <p className="text-zinc-400">Your feedback has been received.</p>
            </div>
            <Button onClick={() => setOpen(false)} variant="outline" className="mt-4">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Honeypot field (hidden from humans) */}
            <div className="absolute opacity-0 -z-50 pointer-events-none h-0 w-0 overflow-hidden">
              <input 
                type="text" 
                value={honeypot} 
                onChange={(e) => setHoneypot(e.target.value)} 
                tabIndex={-1} 
                autoComplete="off"
              />
            </div>

            <Textarea
              placeholder="What's on your mind?"
              className="min-h-[150px] bg-black/40 border-white/10 focus:border-primary/50 text-white placeholder:text-zinc-600"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={loading}
            />
            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={loading || !feedback.trim()}
                className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {loading ? "Sending..." : "Send Feedback"}
                <Send className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
