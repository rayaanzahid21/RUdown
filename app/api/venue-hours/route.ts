import {env} from 'cloudflare:workers';
import {catalog} from '@/lib/planning';
import {fetchVenueHours} from '@/lib/venue-hours';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get('id'),a=catalog.find(a=>a.id===id);
 if(!a)return reply({error:'Unknown venue.'},404);
 const config=env as unknown as Record<string,string>;
 if(!config.GOOGLE_PLACES_API_KEY)return reply({error:'Google Places is not configured.'},503);
 try{
  const db=env.DB as D1Database,day=new Date().toISOString().slice(0,10);
  const count=await db.prepare("INSERT INTO searches(query,data,expires) VALUES(?,'1',?) ON CONFLICT(query) DO UPDATE SET data=CAST(CAST(data AS INTEGER)+1 AS TEXT) WHERE CAST(data AS INTEGER)<300").bind('hours:quota:'+day,Date.now()+2*86400000).run();
  if(!count.meta.changes)return reply({error:'Today’s hours lookup limit was reached. Use the venue’s Google Maps link.'},429);
  const cacheKey='photo:place-id:'+a.id;
  const saved=await db.prepare('SELECT data FROM searches WHERE query=? AND expires>?').bind(cacheKey,Date.now()).first<{data:string}>();
  const result=await fetchVenueHours(a,config.GOOGLE_PLACES_API_KEY,saved?.data);
  if(result.placeId)await db.prepare('INSERT INTO searches(query,data,expires) VALUES(?,?,?) ON CONFLICT(query) DO UPDATE SET data=excluded.data,expires=excluded.expires').bind(cacheKey,result.placeId,Date.now()+180*86400000).run();
  return reply({hours:result.hours});
 }catch(e){return reply({error:e instanceof Error?e.message:'Hours lookup failed. Try again.'},503);}
}
