import { createHash, randomBytes } from 'node:crypto';

export const GRANT_TTL=5*60*1000;
export const codeDigest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const pkceChallenge=(value:string)=>createHash('sha256').update(value).digest('base64url');
export const issueCode=()=>randomBytes(32).toString('base64url');
export function approvedCallback(value:unknown,configured=process.env.STUDIOWATCH_REDIRECT_URIS||''):string|null {
  if(typeof value!=='string'||!configured.split(',').map(s=>s.trim()).filter(Boolean).includes(value))return null;
  try{const u=new URL(value);return !u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/api/animref/callback'&&(u.protocol==='https:'||(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)))?u.href:null;}catch{return null;}
}
export function validAuthorize(value:unknown) {
  if(!value||typeof value!=='object')return null;
  const p=value as Record<string,unknown>;
  const redirectUri=approvedCallback(p.redirect_uri);
  return redirectUri&&p.code_challenge_method==='S256'&&typeof p.state==='string'&&/^[A-Za-z0-9_-]{43}$/.test(p.state)&&typeof p.code_challenge==='string'&&/^[A-Za-z0-9_-]{43}$/.test(p.code_challenge)?{redirectUri,state:p.state,challenge:p.code_challenge}:null;
}
export function validGrant(grant:{redirectUri:string;challenge:string;expiresAt:number},verifier:string,redirectUri:string,now=Date.now()) {
  return /^[A-Za-z0-9_-]{43}$/.test(verifier)&&grant.expiresAt>now&&grant.expiresAt<=now+GRANT_TTL&&grant.redirectUri===redirectUri&&pkceChallenge(verifier)===grant.challenge;
}
export function publicProfile(uid:string,profile:Record<string,unknown>,displayName?:string) {
  const text=(key:string,max:number)=>typeof profile[key]==='string'?(profile[key] as string).slice(0,max):'';
  const username=text('username',80);
  // Public profile routes reject periods and leading underscores. Fall back to
  // the direct ID route when the saved username cannot resolve there.
  const slug=/^[a-zA-Z0-9-][a-zA-Z0-9_-]{1,79}$/.test(username)?'/'+encodeURIComponent(username):'/'+encodeURIComponent(uid);
  const banner=text('bannerUrl',512);
  let coverArt:string|undefined;try{if(new URL(banner).protocol==='https:')coverArt=banner;}catch{/* No public cover. */}
  return {id:'animref-'+codeDigest('studiowatch:'+uid),name:text('displayName',80)||displayName?.slice(0,80)||username||'Animation artist',arHandle:username?'@'+username:'',arProfileUrl:'https://animationreference.org'+slug,roleTitle:text('headline',120)||'Animator',bio:text('bio',350),...(coverArt?{coverArt}:{})};
}
