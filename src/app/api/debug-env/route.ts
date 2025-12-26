
import { NextResponse } from 'next/server';

export async function GET() {
    // Return status of sensitive keys without revealing them
    return NextResponse.json({
        hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
        hasStripeWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
        hasFirebaseProject: !!process.env.FIREBASE_PROJECT_ID,
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
}
