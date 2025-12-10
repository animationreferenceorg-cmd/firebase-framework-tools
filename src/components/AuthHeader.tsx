
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
import { collection, addDoc, onSnapshot, doc, getDoc, type DocumentReference } from 'firebase/firestore';
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Heart className="h-6 w-6 text-primary" />
                        Support Animation Reference
                    </DialogTitle>
                    <DialogDescription>
                        Your donation helps the development of this app and keeps it running for all! Donating a monthly amount helps keep the site growing and keeping it free for all. With donations I am able to offer more features and resources to artists.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-3 gap-4">
                        {donationOptions.map(option => (
                             <Button 
                                key={option.amount}
                                variant={selectedAmount === option.amount ? 'default' : 'outline'}
                                onClick={() => setSelectedAmount(option.amount)}
                                className="h-20 flex-col gap-1"
                            >
                                <span className="text-2xl font-bold">${option.amount}</span>
                                <span className="text-xs text-muted-foreground">per month</span>
                             </Button>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button 
                        type="submit" 
                        className="w-full"
                        disabled={isCheckingOut}
                        onClick={() => handleDonate(donationOptions.find(o => o.amount === selectedAmount)?.priceId)}
                    >
                        {isCheckingOut ? 'Redirecting...' : (
                          <>
                            <DollarSign className="mr-2 h-4 w-4" />
                            Donate ${selectedAmount} per month
                          </>
                        )}
                    </Button>
                </DialogFooter>
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Heart className="h-6 w-6 text-primary" />
                        Support Animation Reference
                    </DialogTitle>
                    <DialogDescription>
                        Your donation helps the development of this app and keeps it running for all! Donating a monthly amount helps keep the site growing and keeping it free for all. With donations I am able to offer more features and resources to artists.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-3 gap-4">
                        {donationOptions.map(option => (
                             <Button 
                                key={option.amount}
                                variant={selectedAmount === option.amount ? 'default' : 'outline'}
                                onClick={() => setSelectedAmount(option.amount)}
                                className="h-20 flex-col gap-1"
                            >
                                <span className="text-2xl font-bold">${option.amount}</span>
                                <span className="text-xs text-muted-foreground">per month</span>
                             </Button>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button 
                        type="submit" 
                        className="w-full"
                        disabled={isCheckingOut}
                        onClick={() => handleDonate(donationOptions.find(o => o.amount === selectedAmount)?.priceId)}
                    >
                        {isCheckingOut ? 'Redirecting...' : (
                          <>
                            <DollarSign className="mr-2 h-4 w-4" />
                            Donate ${selectedAmount} per month
                          </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
