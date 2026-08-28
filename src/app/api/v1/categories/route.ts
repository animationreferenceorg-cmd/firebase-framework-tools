import { after, NextResponse, type NextRequest } from 'next/server';
import {
  partnerCors,
  partnerErrorResponse,
  partnerResponse,
  preflightCors,
  recordUsage,
  requirePartnerKey,
  type PartnerKeyRecord,
} from '@/lib/partner-api';
import { listPartnerCategories } from '@/lib/partner-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: preflightCors(request) });
}

/** GET /api/v1/categories - every published category with its video count. */
export async function GET(request: NextRequest) {
  let key: PartnerKeyRecord | null = null;
  try {
    key = await requirePartnerKey(request);
    const categories = await listPartnerCategories();

    const response = partnerResponse({ data: categories, pagination: { total: categories.length } }, key, request, { maxAge: 900 });

    const record = key;
    after(() => recordUsage(record, 'categories.list'));
    return response;
  } catch (error) {
    return partnerErrorResponse(error, partnerCors(request, key));
  }
}
