
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
import { DonateDialog } from './DonateDialog';

export default function AuthHeader() {
  const { user, loading } = useAuth();
  const { db, auth } = useFirebase();
  const { toast } = useToast();
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

  if (loading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 md:gap-4">
      {user ? (
        <>
          <DonateDialog>
            <div className="animated-gradient-border p-[2px]">
              <Button variant="outline" className="relative z-10 bg-background hover:bg-background/80">Donate</Button>
            </div>
          </DonateDialog>

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
        <div className="flex items-center gap-2 md:gap-4">
          <DonateDialog>
            <div className="animated-gradient-border p-[2px]">
              <Button variant="outline" className="relative z-10 bg-background hover:bg-background/80">Donate</Button>
            </div>
          </DonateDialog>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div >
      )
      }
    </div >
  );
}
