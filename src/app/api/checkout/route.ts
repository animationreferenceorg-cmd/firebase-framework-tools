import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';


export async function POST(req: Request) {
    try {
        const stripe = getStripe();

        const { amount, returnUrl, userId } = await req.json();

        if (!amount) {
            return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
        }

        // Define price data dynamically based on the amount
        // Note: In a production app with fixed plans, using Price IDs from the dashboard is better for analytics,
        // but this "ad-hoc" approach is the easiest setup as requested.
        const centAmount = parseFloat(amount) * 100;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            client_reference_id: userId,
            metadata: { userId },
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Animation Reference Support ($${amount})`,
                            description: `Monthly support for Animation Reference`,
                        },
                        unit_amount: centAmount,
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${returnUrl || req.headers.get('origin')}/?success=true`,
            cancel_url: `${returnUrl || req.headers.get('origin')}/?canceled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        console.error('Stripe Checkout Error:', err);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
