import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirebase } from '@/firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function useDonate() {
    const { user } = useAuth();
    const { db } = useFirebase();
    const { toast } = useToast();
    const [isCheckingOut, setIsCheckingOut] = useState(false);

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
            const collectionRef = collection(db, 'customers', user.uid, 'checkout_sessions');

            const docRef = await addDoc(collectionRef, {
                price: priceId, // The extension expects 'price' (Price ID) or 'line_items'
                success_url: window.location.origin + '/?success=true',
                cancel_url: window.location.origin + '/?canceled=true',
                mode: 'subscription',
                allow_promotion_codes: true,
            });

            // Wait for the extension to attach the URL
            const unsubscribe = onSnapshot(docRef, (snap) => {
                const { error, url } = snap.data() || {};
                if (error) {
                    const errorMessage = error.message || JSON.stringify(error);
                    console.error('Stripe Extension Error:', errorMessage);
                    toast({ variant: 'destructive', title: 'Checkout Error', description: errorMessage });
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

    return { handleDonate, isCheckingOut };
}
