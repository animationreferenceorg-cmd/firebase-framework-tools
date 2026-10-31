import type { NextRequest } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, any> = {};
    try {
      body = await request.json();
    } catch {
      // In case navigator.sendBeacon sent string
      const text = await request.text();
      body = JSON.parse(text || '{}');
    }

    const {
      partner = 'anim_works',
      targetUrl = 'https://anim.works/',
      source = 'marketplace_banner',
      itemTitle = 'Anim.works',
      userType = 'guest',
      userId = null,
    } = body;

    const db = getFirestore();
    const statsDocRef = db.collection('partner_stats').doc(partner);

    const isTabClick = source === 'sidebar_tab';
    const isBannerClick = source === 'marketplace_banner';
    const isProductClick = source === 'marketplace_product';

    // 1. Update Aggregate Counters
    await statsDocRef.set(
      {
        partner,
        totalOutboundClicks: FieldValue.increment(isTabClick ? 0 : 1),
        marketplaceTabClicks: FieldValue.increment(isTabClick ? 1 : 0),
        bannerClicks: FieldValue.increment(isBannerClick ? 1 : 0),
        productClicks: FieldValue.increment(isProductClick ? 1 : 0),
        memberClicks: FieldValue.increment(userType === 'member' ? 1 : 0),
        guestClicks: FieldValue.increment(userType === 'guest' ? 1 : 0),
        lastClickAt: Date.now(),
      },
      { merge: true }
    );

    // 2. Append event to subcollection for recent audits
    await statsDocRef.collection('clicks').add({
      partner,
      targetUrl,
      source,
      itemTitle: String(itemTitle).slice(0, 100),
      userType: userType === 'member' ? 'member' : 'guest',
      userId: userId || null,
      timestamp: Date.now(),
      createdAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // Analytics ingestion should never fail noisily
    console.warn('[partner-click] Error recording partner click:', error);
    return Response.json({ ok: false }, { status: 200 });
  }
}

