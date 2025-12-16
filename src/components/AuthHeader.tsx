
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
import { collection, addDoc, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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

  const handleDonate = async (priceId: string | undefined) => {
    if (isCheckingOut || !db) return;

    if (!user) {
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
        title: 'Price not configured',
        description: 'This donation amount has not been configured. Please add the Price ID to your .env file.',
      });
      return;
    }

    setIsCheckingOut(true);
    toast({ title: 'Creating checkout session...', description: 'Please wait while we redirect you to Stripe.' });

    try {
      const customerRef = doc(db, 'customers', user.uid);
      const customerSnap = await getDoc(customerRef);

      if (!customerSnap.exists()) {
        toast({
          variant: 'destructive',
          title: 'Account Not Ready',
          description: 'Your Stripe account is still being set up. Please try again in a moment.',
        });
        setIsCheckingOut(false);
        return;
      }

      const checkoutSessionData = {
        price: priceId,
        success_url: window.location.origin,
        cancel_url: window.location.origin,
      };

      const checkoutSessionRef = collection(db, 'customers', user.uid, 'checkout_sessions');
      addDoc(checkoutSessionRef, checkoutSessionData)
        .then(sessionDocRef => {
          const unsubscribe = onSnapshot(sessionDocRef, (snap) => {
            const { error, url } = snap.data() || {};
            if (error) {
              console.error(`An error occurred: ${error.message}`);
              toast({
                variant: 'destructive',
                title: 'Checkout Error',
                description: error.message || 'Could not create a checkout session. Please check your configuration and try again.',
              });
              setIsCheckingOut(false);
              unsubscribe();
            }
            if (url) {
              window.location.assign(url);
              unsubscribe();
            }
          });
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: `customers/${user.uid}/checkout_sessions`,
            operation: 'create',
            requestResourceData: checkoutSessionData,
          } satisfies SecurityRuleContext);

          errorEmitter.emit('permission-error', permissionError);
          setIsCheckingOut(false);
        });

    } catch (error: any) {
      // This outer catch is for issues like getDoc failing, not for the addDoc itself.
      console.error("Error preparing for checkout session:", error);
      toast({
        variant: 'destructive',
        title: 'Checkout Error',
        description: error.message || 'Could not create a checkout session. Please check your configuration and try again.',
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
