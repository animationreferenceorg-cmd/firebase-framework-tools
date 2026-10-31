import type { NextRequest } from 'next/server';
import { ApiError, apiErrorResponse, getTrustedProfile, requireFirebaseUser } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const identity = await requireFirebaseUser(request);
    const profile = await getTrustedProfile(identity.uid);
    if (identity.admin !== true && profile.role !== 'admin') {
      throw new ApiError(403, 'FORBIDDEN', 'Admin access required.');
    }

    const db = getFirestore();
    const statsDoc = await db.collection('partner_stats').doc('anim_works').get();
    const statsData = statsDoc.data() || {};

    // Get recent clicks from subcollection
    const recentClicksSnap = await db
      .collection('partner_stats')
      .doc('anim_works')
      .collection('clicks')
      .orderBy('timestamp', 'desc')
      .limit(30)
      .get();

    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    let clicksToday = 0;
    let clicksThisWeek = 0;

    const recentClicks: Array<{
      id: string;
      source: string;
      itemTitle: string;
      targetUrl: string;
      userType: string;
      timestamp: number;
    }> = [];

    recentClicksSnap.forEach((doc) => {
      const data = doc.data();
      const ts = data.timestamp || 0;
      if (ts >= startOfToday && data.source !== 'sidebar_tab') clicksToday++;
      if (ts >= sevenDaysAgo && data.source !== 'sidebar_tab') clicksThisWeek++;

      recentClicks.push({
        id: doc.id,
        source: data.source || 'marketplace_banner',
        itemTitle: data.itemTitle || 'Anim.works',
        targetUrl: data.targetUrl || 'https://anim.works/',
        userType: data.userType || 'guest',
        timestamp: ts,
      });
    });

    return Response.json(
      {
        partner: 'anim_works',
        totalOutboundClicks: statsData.totalOutboundClicks || 0,
        marketplaceTabClicks: statsData.marketplaceTabClicks || 0,
        bannerClicks: statsData.bannerClicks || 0,
        productClicks: statsData.productClicks || 0,
        memberClicks: statsData.memberClicks || 0,
        guestClicks: statsData.guestClicks || 0,
        clicksToday,
        clicksThisWeek,
        recentClicks,
        lastClickAt: statsData.lastClickAt || null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

