import { NextResponse } from 'next/server';
import { getSocialPlatformConfig } from '@/lib/social/socialManager';

export async function GET() {
  try {
    const config = getSocialPlatformConfig();
    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch status' }, { status: 500 });
  }
}
