
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { DollarSign, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { useEffect } from 'react';
import { onSnapshot, doc, collection, addDoc } from 'firebase/firestore';

export default function AuthHeader() {
  const { user, loading } = useAuth();
  const { db, auth } = useFirebase();
  const { toast } = useToast();
  const [selectedAmount, setSelectedAmount] = useState('5');
  const donationOptions = [
    { amount: '1', label: '$1 / month', priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_1_DOLLAR },
    { amount: '2', label: '$2 / month', priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_2_DOLLARS },
    { amount: '5', label: '$5 / month', priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_5_DOLLARS },
  ];
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  // Listen for user premium status
  useEffect(() => {
    if (!user || !db) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      setIsPremium(!!doc.data()?.isPremium);
    });
    return () => unsub();
  }, [user, db]);

  const handlePortal = async () => {
    if (isCheckingOut) return;
    setIsCheckingOut(true);
    try {
      const response = await fetch('/api/portal', {
        method: 'POST',
        body: JSON.stringify({ userId: user?.uid, returnUrl: window.location.href }),
      });
      const data = await response.json();
      if (data.url) window.location.assign(data.url);
      else throw new Error(data.error);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsCheckingOut(false);
    }
  }

  const handleDonate = async (priceId: string | undefined) => {
    if (isCheckingOut) return;

    if (!user || !db) {
      toast({
        variant: 'destructive',
        title: 'Not signed in',
        description: 'You must be signed in to make a donation.',
      });
      return;
    }

    if (!priceId) {
      toast({
        variant: 'destructive',
        title: 'Configuration Error',
        description: 'Price ID is missing for this selection.',
      });
      return;
    }

    setIsCheckingOut(true);
    toast({ title: 'Starting checkout...', description: 'Redirecting to Stripe...' });

    try {
      // Create a checkout session in Firestore (Stripe Extension listens to this)
      const collectionRef = collection(db, 'users', user.uid, 'checkout_sessions');
      const docRef = await addDoc(collectionRef, {
        price: priceId, // The extension expects 'price' (Price ID) or 'line_items'
        success_url: window.location.origin + '/?success=true',
        cancel_url: window.location.origin + '/?canceled=true',
        mode: 'subscription', // or 'payment' for one-time
        allow_promotion_codes: true,
      });

      // Wait for the extension to attach the URL
      const unsubscribe = onSnapshot(docRef, (snap) => {
        const { error, url } = snap.data() || {};
        if (error) {
          console.error('Stripe Extension Error:', error);
          toast({ variant: 'destructive', title: 'Checkout Error', description: error.message });
          setIsCheckingOut(false);
          unsubscribe();
        }
        if (url) {
          window.location.assign(url);
          unsubscribe();
        }
      });

    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not start checkout.',
      });
      setIsCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {user ? (
        <>
          <Dialog>
            <DialogTrigger asChild>
              <div className="animated-gradient-border p-[2px]">
                <Button variant="outline" className="relative z-10 bg-background hover:bg-background/80">Donate</Button>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-gradient-to-b from-[#1a1528] to-[#0a0814] border-white/10 shadow-[0_0_50px_-10px_rgba(109,40,217,0.3)] backdrop-blur-2xl text-white">
              <div className="absolute inset-0 bg-grid-white/5 mask-image-gradient-b pointer-events-none" />

              <div className="relative z-10 p-8 space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                  <div className="inline-flex p-3 rounded-full bg-white/5 border border-white/10 shadow-[0_0_30px_-5px_rgba(124,58,237,0.3)] mb-2">
                    <Heart className="h-8 w-8 text-purple-500 fill-purple-500/20 animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white">
                      Support Animation Reference
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400 text-base leading-relaxed max-w-sm mx-auto">
                      Your donation helps the development of this app and keeps it running for all! Donating a monthly amount helps keep the site growing and offering more features to artists.
                    </DialogDescription>
                  </div>
                </div>

                {/* Donation Options grid */}
                <div className="grid grid-cols-3 gap-4">
                  {donationOptions.map(option => (
                    <button
                      key={option.amount}
                      onClick={() => setSelectedAmount(option.amount)}
                      className={cn(
                        "group relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300",
                        selectedAmount === option.amount
                          ? "bg-gradient-to-br from-purple-900/50 to-purple-600/20 border-purple-500 ring-1 ring-purple-500 shadow-[0_0_30px_-5px_rgba(124,58,237,0.3)]"
                          : "bg-white/5 border-white/5 hover:border-purple-500/50 hover:bg-white/10"
                      )}
                    >
                      <span className={cn(
                        "text-2xl font-bold mb-1 transition-colors",
                        selectedAmount === option.amount ? "text-white scale-110" : "text-zinc-300 group-hover:text-white"
                      )}>
                        ${option.amount}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">per month</span>
                    </button>
                  ))}
                </div>

                {/* Footer Action */}
                <div className="space-y-4 pt-2">
                  <Button
                    type="submit"
                    className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.6)] border border-purple-400/20 transition-all duration-300 text-white shadow-xl"
                    disabled={isCheckingOut}
                    onClick={() => handleDonate(selectedAmount)}
                  >
                    {isCheckingOut ? 'Redirecting...' : (
                      <span className="flex items-center gap-2">
                        Donate <span className="underline decoration-white/30 underline-offset-4">${selectedAmount}</span> Now
                      </span>
                    )}
                  </Button>
                  <p className="text-center text-xs text-purple-200/50 animate-pulse">
                    Donate ${selectedAmount} per month to support new UI/UX features
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 cursor-pointer">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} data-ai-hint="user avatar" />
                <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-semibold">{user.displayName || 'Guest User'}</p>
                <p className="text-xs text-muted-foreground font-normal truncate">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/profile"><DropdownMenuItem>Profile</DropdownMenuItem></Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                auth?.signOut();
              }}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : (
        <div className="flex items-center gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <div className="animated-gradient-border p-[2px]">
                <Button variant="outline" className="relative z-10 bg-background hover:bg-background/80">Donate</Button>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-gradient-to-b from-[#1a1528] to-[#0a0814] border-white/10 shadow-[0_0_50px_-10px_rgba(109,40,217,0.3)] backdrop-blur-2xl text-white">
              <div className="absolute inset-0 bg-grid-white/5 mask-image-gradient-b pointer-events-none" />

              <div className="relative z-10 p-8 space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                  <div className="inline-flex p-3 rounded-full bg-white/5 border border-white/10 shadow-[0_0_30px_-5px_rgba(124,58,237,0.3)] mb-2">
                    <Heart className="h-8 w-8 text-purple-500 fill-purple-500/20 animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white">
                      Support Animation Reference
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400 text-base leading-relaxed max-w-sm mx-auto">
                      Your donation helps the development of this app and keeps it running for all! Donating a monthly amount helps keep the site growing and offering more features to artists.
                    </DialogDescription>
                  </div>
                </div>

                {/* Donation Options grid */}
                <div className="grid grid-cols-3 gap-4">
                  {donationOptions.map(option => (
                    <button
                      key={option.amount}
                      onClick={() => setSelectedAmount(option.amount)}
                      className={cn(
                        "group relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300",
                        selectedAmount === option.amount
                          ? "bg-gradient-to-br from-purple-900/50 to-purple-600/20 border-purple-500 ring-1 ring-purple-500 shadow-[0_0_30px_-5px_rgba(124,58,237,0.3)]"
                          : "bg-white/5 border-white/5 hover:border-purple-500/50 hover:bg-white/10"
                      )}
                    >
                      <span className={cn(
                        "text-2xl font-bold mb-1 transition-colors",
                        selectedAmount === option.amount ? "text-white scale-110" : "text-zinc-300 group-hover:text-white"
                      )}>
                        ${option.amount}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">per month</span>
                    </button>
                  ))}
                </div>

                {/* Footer Action */}
                <div className="space-y-4 pt-2">
                  <Button
                    type="submit"
                    className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.6)] border border-purple-400/20 transition-all duration-300 text-white shadow-xl"
                    disabled={isCheckingOut}
                    onClick={() => handleDonate(donationOptions.find(o => o.amount === selectedAmount)?.priceId)}
                  >
                    {isCheckingOut ? 'Redirecting...' : (
                      <span className="flex items-center gap-2">
                        Donate <span className="underline decoration-white/30 underline-offset-4">${selectedAmount}</span> Now
                      </span>
                    )}
                  </Button>
                  <p className="text-center text-xs text-purple-200/50 animate-pulse">
                    Donate ${selectedAmount} per month to support new UI/UX features
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div >
      )
      }
    </div >
  );
}
