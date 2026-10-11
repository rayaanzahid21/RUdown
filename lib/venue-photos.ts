import {distance,type Activity} from './planning';
export type VenuePhoto={url:string;mapsUrl:string;authors:{name:string;url?:string}[]};
export function googleUrl(raw:unknown,image=false):string|undefined{
 if(typeof raw!=='string')return;try{const u=new URL(raw.startsWith('//')?'https:'+raw:raw);if(u.protocol!=='https:'||u.username||u.password)return;
 const h=u.hostname;if(image?(h==='googleusercontent.com'||h.endsWith('.googleusercontent.com')):['www.google.com','maps.google.com','google.com','maps.app.goo.gl'].includes(h))return u.href;}catch{}
}
export function matchesVenue(a:Activity,p:any){
 if(!p?.id||!/^[\w-]+$/.test(p.id)||!Number.isFinite(p.location?.latitude)||!Number.isFinite(p.location?.longitude))return false;
 const words=(s:string)=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x.length>2&&!['the','and','picnic','coffee','downtown','walk'].includes(x));
 const expected=words(a.name),actual=new Set(words(p.displayName?.text||''));
 return expected.length>0&&expected.filter(x=>actual.has(x)).length/expected.length>=0.6&&distance(a.location,{label:'',lat:p.location.latitude,lng:p.location.longitude})<1;
}
export async function fetchVenuePhoto(a:Activity,key:string,placeId?:string,fetcher:typeof fetch=fetch):Promise<{photo:VenuePhoto|null;placeId?:string}>{
 const request=async(url:string,body?:unknown,mask?:string)=>{const r=await fetcher(url,{method:body?'POST':'GET',headers:{'X-Goog-Api-Key':key,...(mask?{'X-Goog-FieldMask':mask}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(9000)});if(!r.ok)throw new Error('Photo provider unavailable');return r.json() as Promise<any>;};
 let place;
 if(placeId&&/^[\w-]+$/.test(placeId)){place=await request('https://places.googleapis.com/v1/places/'+placeId,undefined,'id,displayName,location,photos,googleMapsUri');if(!matchesVenue(a,place))return {photo:null};}
 else{const data=await request('https://places.googleapis.com/v1/places:searchText',{textQuery:a.name+' '+a.area,pageSize:3},'places.id,places.displayName,places.location,places.photos,places.googleMapsUri');place=data.places?.find((p:any)=>matchesVenue(a,p));}
 if(!place)return {photo:null};
 const photo=place.photos?.find((p:any)=>typeof p.name==='string'&&p.name.startsWith('places/'+place.id+'/photos/')&&/^places\/[\w-]+\/photos\/[\w-]+$/.test(p.name));
 if(!photo)return {photo:null,placeId:place.id};
 const media=await request('https://places.googleapis.com/v1/'+photo.name+'/media?maxWidthPx=900&skipHttpRedirect=true');
 const url=googleUrl(media.photoUri,true),mapsUrl=googleUrl(place.googleMapsUri);if(!url||!mapsUrl)return {photo:null,placeId:place.id};
 const authors=(photo.authorAttributions||[]).map((x:any)=>({name:typeof x.displayName==='string'?x.displayName:'Photo contributor',url:googleUrl(x.uri)}));
 return {placeId:place.id,photo:{url,mapsUrl,authors}};
}
