import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin';
import { approvedCallback, codeDigest, validGrant } from '@/lib/studiowatch-connect';
export const runtime='nodejs';
export async function POST(request:NextRequest) {
  try{
    const input=await request.json();
    const redirectUri=approvedCallback(input.redirect_uri);
    if(!redirectUri||typeof input.code!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(input.code)||typeof input.code_verifier!=='string')throw new Error('Invalid grant');
    const db=getFirestore();const ref=db.collection('studiowatch_connect_grants').doc(codeDigest(input.code));
    const profile=await db.runTransaction(async transaction=>{
      const snap=await transaction.get(ref);const grant=snap.data();
      if(!grant||!validGrant({redirectUri:grant.redirectUri,challenge:grant.challenge,expiresAt:grant.expiresAt?.toMillis?.()||0},input.code_verifier,redirectUri))throw new Error('Invalid grant');
      transaction.delete(ref);return grant.profile;
    });
    return NextResponse.json({profile},{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }catch{return NextResponse.json({message:'This connection expired or was already used. Start again from StudioWatch.'},{status:400,headers:{'Cache-Control':'no-store'}});}
}
