import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import type { CheckoutPlanId } from '@/lib/plans';

/**
 * Starts Pro checkout. The server picks the Stripe price for the requested
 * plan (see src/lib/plans.ts); the client only says monthly or annual.
 */
export function useDonate() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    const openPortal = async (idToken: string) => {
        const portalRes = await fetch('/api/portal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({}),
        });
        const portalData = await portalRes.json();
        if (!portalData.url) throw new Error(portalData.error || 'Failed to open billing portal');
        window.location.assign(portalData.url);
    };

    const startCheckout = async (plan: CheckoutPlanId, source = 'pricing_dialog') => {
        if (isCheckingOut) return;

        if (!user) {
            toast({
                variant: 'destructive',
                title: 'Sign in first',
                description: 'Sign in to your account to upgrade to Pro.',
            });
            return;
        }

        setIsCheckingOut(true);
        try {
            const idToken = await user.getIdToken();

            // Avoid double-subscribing: existing subscribers manage their plan in the portal.
            const checkRes = await fetch('/api/check-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({}),
            });
            const checkData = await checkRes.json().catch(() => ({}));
            if (checkData.hasActiveSubscription) {
                toast({
                    title: 'You already have a subscription',
                    description: 'Opening your billing portal to manage it…',
                });
                await openPortal(idToken);
                return;
            }

            track('checkout_started', { plan, source });
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ plan }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.url) throw new Error(data.message || 'Could not start checkout.');
            window.location.assign(data.url);
        } catch (error: any) {
            console.error('Error starting checkout:', error);
            toast({
                variant: 'destructive',
                title: 'Checkout unavailable',
                description: error.message || 'Could not start checkout.',
            });
            setIsCheckingOut(false);
        }
    };

    return { startCheckout, isCheckingOut };
}
