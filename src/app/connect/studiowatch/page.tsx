"use client";
import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Link2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function StudioWatchConnectPage(){
  const {user,loading}=useAuth();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [params,setParams]=useState<URLSearchParams|null>(null);
  useEffect(()=>{setParams(new URLSearchParams(window.location.search));},[]);
  useEffect(()=>{if(!loading&&(!user||user.isAnonymous))window.location.replace('/login?redirect='+encodeURIComponent('/connect/studiowatch'+window.location.search));},[loading,user]);
  const connect=async()=>{
    if(!user||!params)return;setBusy(true);setError('');
    try{const response=await fetch('/api/studiowatch/authorize',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await user.getIdToken()},body:JSON.stringify({redirect_uri:params.get('redirect_uri'),state:params.get('state'),code_challenge:params.get('code_challenge'),code_challenge_method:params.get('code_challenge_method')})});const result=await response.json();if(!response.ok||typeof result.redirect!=='string')throw new Error(result.message||'Could not connect. Start again from StudioWatch.');window.location.assign(result.redirect);}catch(e){setError(e instanceof Error?e.message:'Could not connect.');setBusy(false);}
  };
  return <main style={{maxWidth:560,margin:'64px auto',padding:28,border:'1px solid #8b5cf64d',borderRadius:20,background:'linear-gradient(135deg,#302043,#17151d)',color:'#f4f0fa'}}><div style={{display:'flex',alignItems:'center',gap:12,color:'#bea2ff',fontSize:13}}><Link2 size={22}/>ANIMATION REFERENCE × STUDIOWATCH</div><h1 style={{fontSize:32,lineHeight:1.2,margin:'28px 0 15px'}}>Bring your portfolio to your next opportunity.</h1>{loading||!user||user.isAnonymous?<p>Opening Animation Reference sign-in…</p>:<><p style={{color:'#cfc6dc',lineHeight:1.8}}>Continue as <strong>{user.displayName||'your Animation Reference account'}</strong>. StudioWatch will receive your display name, public profile link, headline, bio, and portfolio banner.</p><p style={{color:'#b9acc9',fontSize:13,lineHeight:1.8,marginTop:16}}>Your password, email, saved references, and private boards stay on Animation Reference.</p><div style={{display:'flex',gap:9,alignItems:'center',margin:'22px 0',fontSize:13,color:'#cdb6ff'}}><Check size={16}/>You control your portfolio on AnimRef.</div>{error&&<p role="alert" style={{color:'#ffb5b5',lineHeight:1.7}}>{error}</p>}<button disabled={busy||!params} onClick={connect} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,width:'100%',background:'#9b72ff',color:'#181220',borderRadius:9,padding:15,fontWeight:700,marginTop:24,opacity:busy?.6:1}}>{busy?'Connecting…':'Link my AnimRef portfolio'}<ArrowUpRight size={17}/></button><a href="/profile?tab=portfolio" style={{display:'block',textAlign:'center',marginTop:18,color:'#c5aaff',fontSize:13}}>Cancel and return to my portfolio</a></>}</main>;
}
