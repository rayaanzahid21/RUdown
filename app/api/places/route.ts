import {env} from 'cloudflare:workers';
import {calendarMember,calendarDb,readGroup} from '@/lib/calendar-server';
import {mapsRequest,readMapsResult} from '@/lib/place-search';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function reserve(key:string,limit:number){
 const r=await calendarDb().prepare("INSERT INTO searches(query,data,expires) VALUES(?,'1',?) ON CONFLICT(query) DO UPDATE SET data=CAST(CAST(data AS INTEGER)+1 AS TEXT) WHERE CAST(data AS INTEGER)<?").bind(key,Date.now()+2*86400000,limit).run();return !!r.meta.changes;
}
export async function POST(request:Request){
 try{
  if(request.headers.get('Origin')&&request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'Request origin is not allowed.'},403);
  const raw=await request.text();if(raw.length>1500)return reply({error:'Request too large.'},413);
  let p;try{p=JSON.parse(raw);}catch{return reply({error:'Invalid request.'},400);}
  let context;try{context=await calendarMember(request,typeof p.code==='string'?p.code:'');}catch{return reply({error:'Create or join a group before searching with Gemini.'},401);}
  const {s}=context;
  if(s.revision!==p.revision)return reply({error:'Group preferences changed. Try again using the latest inputs.'},409);
  if(p.consent!==true)return reply({error:'Confirm sharing approximate group areas, interests and the lowest budget with Google.'},400);
  let payload;try{payload=mapsRequest(s,p.kind);}catch(e){return reply({error:(e as Error).message},400);}
  const config=env as unknown as Record<string,string>;
  if(!config.GEMINI_API_KEY)return reply({error:'Gemini is not connected. Browse the named local plans below.'},503);
  const day=new Date().toISOString().slice(0,10);
  if(!await reserve(`maps:group:${s.code}:${day}`,10)||!await reserve(`maps:site:${day}`,100))return reply({error:'Today’s RUdown place-search limit has been reached. Named local plans are still available.'},429);
  const model=config.GEMINI_MAPS_MODEL||config.GEMINI_PLANNING_MODEL||'gemini-3.5-flash-lite';
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':config.GEMINI_API_KEY},body:JSON.stringify(payload),signal:AbortSignal.timeout(40000)});
  if(response.status===429)return reply({error:'Google’s Gemini API quota is currently exhausted. The owner can check API limits/billing in Google AI Studio. Try later or use the named local plans below.'},429);
  if(!response.ok)return reply({error:'Gemini Maps search is unavailable for this API project or model. Named local plans are still available.'},502);
  let result;try{result=readMapsResult(await response.json());}catch(e){return reply({error:(e as Error).message},502);}
  if((await readGroup(s.code)).revision!==s.revision)return reply({error:'The group changed during search. Search again for the new locations and budgets.'},409);
  // Google Maps results are displayed for this request only, never persisted or cached.
  return reply({...result,revision:s.revision});
 }catch{return reply({error:'Place search could not finish. Please retry; named local plans are still available.'},503);}
}
