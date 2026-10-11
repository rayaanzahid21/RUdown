import {env} from 'cloudflare:workers';
import {catalog} from '@/lib/planning';
import {fetchVenuePhoto} from '@/lib/venue-photos';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 const config=env as unknown as Record<string,string>;
 const id=new URL(request.url).searchParams.get('id');
 if(!id)return reply({configured:!!config.GOOGLE_PLACES_API_KEY});
 const a=catalog.find(a=>a.id===id);if(!a)return reply({photo:null},404);
 if(!config.GOOGLE_PLACES_API_KEY)return reply({photo:null,configured:false},503);
 try{
  const db=env.DB as D1Database,day=new Date().toISOString().slice(0,10);
  // Limit public photo loading costs. Only curated IDs are accepted, never user URLs.
  const count=await db.prepare("INSERT INTO searches(query,data,expires) VALUES(?,'1',?) ON CONFLICT(query) DO UPDATE SET data=CAST(CAST(data AS INTEGER)+1 AS TEXT) WHERE CAST(data AS INTEGER)<300").bind('photo:quota:'+day,Date.now()+2*86400000).run();
  if(!count.meta.changes)return reply({photo:null,limited:true},429);
  const cacheKey='photo:place-id:'+a.id;
  const saved=await db.prepare('SELECT data FROM searches WHERE query=? AND expires>?').bind(cacheKey,Date.now()).first<{data:string}>();
  const result=await fetchVenuePhoto(a,config.GOOGLE_PLACES_API_KEY,saved?.data);
  // Only Place IDs may persist. Photo references, URLs and attributions stay transient.
  if(result.placeId)await db.prepare('INSERT INTO searches(query,data,expires) VALUES(?,?,?) ON CONFLICT(query) DO UPDATE SET data=excluded.data,expires=excluded.expires').bind(cacheKey,result.placeId,Date.now()+180*86400000).run();
  return reply({photo:result.photo,configured:true});
 }catch{return reply({photo:null,unavailable:true},503);}
}
