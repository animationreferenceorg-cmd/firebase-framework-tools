import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { apiErrorResponse, requireFirebaseUser } from '@/lib/api-auth';


const PLANS: Record<string, string> = {
    tier1: 'price_1SFgUc59QHehw05fc0lPRRf7',
    tier2: 'price_1SFgiV59QHehw05fc0lPRRf7',
    tier5: 'price_1SFgiq59QHehw05fy017h1gR',
};

export async function POST(req: NextRequest) {
    try {
        const stripe = getStripe();
        const identity = await requireFirebaseUser(req);
        const { plan } = await req.json();
        const price = PLANS[plan];
        if (!price) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        const origin = req.nextUrl.origin;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            client_reference_id: identity.uid,
            metadata: { userId: identity.uid },
            line_items: [{ price, quantity: 1 }],
            mode: 'subscription',
            success_url: `${origin}/profile?success=true`,
            cancel_url: `${origin}/profile?canceled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        if (err?.status) return apiErrorResponse(err);
        console.error('Stripe Checkout Error:', err);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
