import type { NextRequest } from 'next/server';
import { getSocialPlatformConfig } from '@/lib/social/socialManager';
import { apiErrorResponse, requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const config = getSocialPlatformConfig();
    return Response.json({ success: true, config });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
