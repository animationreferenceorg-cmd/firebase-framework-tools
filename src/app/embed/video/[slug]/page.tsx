import type { Metadata } from 'next';
import { getFirestore } from '@/lib/firebase-admin';
import { PortfolioEmbed } from '@/components/embed/PortfolioEmbed';
import { httpsMedia, isPublicEmbedRecord, publicEmbedItem } from '@/lib/portfolio-embed-public';

export const dynamic='force-dynamic';
export const runtime='nodejs';
export const metadata:Metadata={title:{absolute:'AnimRef video preview'},robots:{index:false,follow:false}};

export default async function VideoEmbedPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(slug))return <PortfolioEmbed slug={slug} display="video-card" error="Use a public AnimRef portfolio link."/>;
  try{
    const db=getFirestore();
    const byUsername=await db.collection('users').where('username','==',slug.toLowerCase()).limit(1).get();
    const snapshot=byUsername.docs[0]||await db.collection('users').doc(slug).get();
    const profile=snapshot.data();
    if(!snapshot.exists||!profile||!isPublicEmbedRecord(profile))return <PortfolioEmbed slug={slug} display="video-card" error="This portfolio is unavailable, private, or has embedding disabled."/>;
    const uid=snapshot.id;
    const username=typeof profile.username==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(profile.username)?profile.username:'';
    const url='https://animationreference.org/'+(username?encodeURIComponent(username):'u/'+encodeURIComponent(uid));
    const work=await db.collection('portfolio_items').where('userId','==',uid).limit(48).get();
    const visible=work.docs.map(doc=>({id:doc.id,data:doc.data()})).filter(row=>publicEmbedItem(row.id,row.data,url));
    const takedowns=visible.length?await db.getAll(...visible.map(row=>db.collection('takedowns').doc(row.id))):[];
    const items=visible.filter((_,i)=>!takedowns[i].exists).map(row=>publicEmbedItem(row.id,row.data,url)!).slice(0,1);
    const text=(value:unknown,max:number)=>typeof value==='string'?value.slice(0,max):'';
    return <PortfolioEmbed slug={slug} display="video-card" data={{name:text(profile.displayName,100)||username||'Animation artist',headline:'',bio:'',avatar:undefined,url,items}}/>;
  }catch{return <PortfolioEmbed slug={slug} display="video-card" error="The featured video couldn’t be loaded. Please try again or open it on AnimRef."/>;}
}
