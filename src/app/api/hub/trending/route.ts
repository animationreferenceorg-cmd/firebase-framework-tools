import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin';
import type { Video } from '@/lib/types';

export const runtime = 'nodejs';
export const revalidate = 60; // 1 min ISR cache

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    const db = getFirestore();
    // Query items sorted by saveCount or trendingScore
    const snap = await db
      .collection('videos')
      .where('status', '==', 'published')
      .orderBy('saveCount', 'desc')
      .limit(limit)
      .get();

    const items: Video[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        title: data.title || 'Untitled Reference',
        description: data.description || '',
        thumbnailUrl: data.thumbnailUrl || data.posterUrl || '',
        posterUrl: data.posterUrl || data.thumbnailUrl || '',
        videoUrl: data.videoUrl || '',
        embedUrl: data.embedUrl || '',
        sourcePlatform: data.sourcePlatform || 'web',
        sourceUrl: data.sourceUrl || '',
        tags: data.tags || [],
        categoryIds: data.categoryIds || ['reference'],
        saveCount: data.saveCount || 0,
        repinCount: data.repinCount || 0,
        trendingScore: data.trendingScore || 0,
        likeCount: data.likeCount || 0,
        viewCount: data.viewCount || 0,
      } as Video);
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('Error fetching trending hub references:', error);
    return NextResponse.json({ items: [] });
  }
}
