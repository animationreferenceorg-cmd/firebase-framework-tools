export interface PortfolioEmbedItem {id:string;title:string;kind:'image'|'video'|'external'|'link';image?:string;player?:string;href:string;}
export interface PortfolioEmbedData {name:string;headline:string;bio:string;avatar?:string;url:string;items:PortfolioEmbedItem[];}
export function isPublicEmbedRecord(data:Record<string,unknown>) {
  return data.isPrivate!==true&&data.isPublic!==false&&data.isPublished!==false&&data.isDraft!==true&&data.portfolioPublished!==false&&data.embedEnabled!==false&&!data.deletedAt&&!data.takenDownAt&&(!data.status||data.status==='published')&&(!data.visibility||data.visibility==='public');
}
export function httpsMedia(value:unknown):string|undefined {
  if(typeof value!=='string'||value.length>4000)return;
  try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password)return url.href;}catch{/* Not public media. */}
}
export function externalVideo(value:string):string|undefined {
  try{
    const url=new URL(value),host=url.hostname.toLowerCase(),parts=url.pathname.split('/').filter(Boolean);
    if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(host)){
      const id=host==='youtu.be'?parts[0]:['embed','shorts'].includes(parts[0])?parts[1]:url.searchParams.get('v');
      if(id&&/^[\w-]{11}$/.test(id))return 'https://www.youtube-nocookie.com/embed/'+id;
    }
    if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)){
      const id=parts[0]==='video'?parts[1]:parts[0];if(id&&/^\d{5,12}$/.test(id))return 'https://player.vimeo.com/video/'+id;
    }
  }catch{/* Link-only fallback. */}
}
export function publicEmbedItem(id:string,data:Record<string,unknown>,profileUrl:string):PortfolioEmbedItem|null {
  if(!/^[\w-]{1,200}$/.test(id)||data.type!=='portfolio'||!isPublicEmbedRecord(data))return null;
  const media=httpsMedia(data.mediaUrl),poster=httpsMedia(data.thumbnailUrl);
  if(!media)return null;
  const base={id,title:typeof data.title==='string'?data.title.slice(0,160):'Portfolio work',href:profileUrl+'?item='+encodeURIComponent(id)};
  if(data.mediaType==='image'||data.mediaType==='gif')return {...base,kind:'image',image:media};
  if(/\.(mp4|webm|m4v|mov|m3u8)$/i.test(new URL(media).pathname))return {...base,kind:'video',image:poster,player:'/embed/portfolio/'+encodeURIComponent(id)};
  const player=externalVideo(media);if(player)return {...base,kind:'external',image:poster,player};
  return {...base,kind:'link',image:poster};
}
