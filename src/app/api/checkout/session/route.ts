import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { apiErrorResponse, requireFirebaseUser } from '@/lib/api-auth';

/**
 * Returns the status of a Stripe Checkout Session for verification on the return screen.
 */
export async function GET(req: NextRequest) {
    try {
        await requireFirebaseUser(req);
        const sessionId = req.nextUrl.searchParams.get('session_id');
        if (!sessionId) {
            return NextResponse.json(
                { error: 'MISSING_SESSION_ID', message: 'session_id query parameter is required.' },
                { status: 400 }
            );
        }

        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        return NextResponse.json({
            status: session.status,
            paymentStatus: session.payment_status,
            customerEmail: session.customer_details?.email ?? null,
            customerName: session.customer_details?.name ?? null,
        });
    } catch (err: any) {
        if (err?.status) return apiErrorResponse(err);
        console.error('Session retrieval error:', err);
        return NextResponse.json(
            { error: 'SESSION_RETRIEVAL_FAILED', message: err?.message || 'Could not retrieve session status.' },
            { status: 500 }
        );
    }
}
