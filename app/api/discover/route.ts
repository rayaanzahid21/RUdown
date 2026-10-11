import {env} from 'cloudflare:workers';
import {discoveryTypes,fieldMask,placeActivity} from '@/lib/places-discovery';
import type {TripType} from '@/lib/planning';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 const q=new URL(request.url).searchParams,lat=Number(q.get('lat')),lng=Number(q.get('lng')),kind=q.get('category')||'All vibes',type=q.get('type')||'hangout',allowance=Number(q.get('allowance'));
 if(!q.has('lat')||!q.has('lng')||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||!discoveryTypes[kind]||!['hangout','day','overnight'].includes(type)||!Number.isSafeInteger(allowance)||allowance<0||allowance>10000000)return reply({error:'Choose a valid area, category and activity allowance.'},400);
 const config=env as unknown as Record<string,string>;if(!config.GOOGLE_PLACES_API_KEY)return reply({error:'Google Places is not configured.'},503);
 try{
  const db=env.DB as D1Database,day=new Date().toISOString().slice(0,10);
  const reserved=await db.prepare("INSERT INTO searches(query,data,expires) VALUES(?,'1',?) ON CONFLICT(query) DO UPDATE SET data=CAST(CAST(data AS INTEGER)+1 AS TEXT) WHERE CAST(data AS INTEGER)<200").bind('discovery:quota:'+day,Date.now()+2*86400000).run();
  if(!reserved.meta.changes)return reply({error:'Today’s venue-search limit has been reached. Reset to browse saved local suggestions.'},429);
  const r=await fetch('https://places.googleapis.com/v1/places:searchNearby',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':config.GOOGLE_PLACES_API_KEY,'X-Goog-FieldMask':fieldMask.split(',').map(f=>'places.'+f).join(',')},body:JSON.stringify({includedPrimaryTypes:type==='overnight'?['hotel']:discoveryTypes[kind],maxResultCount:20,rankPreference:'POPULARITY',locationRestriction:{circle:{center:{latitude:lat,longitude:lng},radius:16093.44}}}),signal:AbortSignal.timeout(12000)});
  if(!r.ok)return reply({error:r.status===429?'Google’s place-search quota was reached. Try later.':'Google Places could not search this area. Check Places API access or try again.'},502);
  const data=await r.json() as any;const activities=(data.places||[]).flatMap((p:any)=>{try{return [placeActivity(p,type as TripType,allowance)];}catch{return [];}});
  return reply({activities,radiusMiles:10});
 }catch{return reply({error:'Search timed out or is unavailable. Try again.'},503);}
}
