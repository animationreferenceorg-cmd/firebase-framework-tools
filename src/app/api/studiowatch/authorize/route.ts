import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse, requireFirebaseUser, getTrustedProfile } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';
import { codeDigest, GRANT_TTL, issueCode, publicProfile, validAuthorize } from '@/lib/studiowatch-connect';
export const runtime='nodejs';
export async function POST(request:NextRequest) {
  if(request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({message:'Open this connection on Animation Reference.'},{status:403});
  try{
    const user=await requireFirebaseUser(request);
    if(user.firebase?.sign_in_provider==='anonymous')return NextResponse.json({message:'Sign in to your creator account first.'},{status:401});
    const input=validAuthorize(await request.json());
    if(!input)return NextResponse.json({message:'This StudioWatch connection address is not enabled.'},{status:400});
    const profile=publicProfile(user.uid,await getTrustedProfile(user.uid),user.name);
    const code=issueCode();
    await getFirestore().collection('studiowatch_connect_grants').doc(codeDigest(code)).create({challenge:input.challenge,redirectUri:input.redirectUri,expiresAt:new Date(Date.now()+GRANT_TTL),profile});
    const redirect=new URL(input.redirectUri);redirect.search=new URLSearchParams({code,state:input.state}).toString();
    return NextResponse.json({redirect:redirect.href},{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }catch(error){return apiErrorResponse(error);}
}
