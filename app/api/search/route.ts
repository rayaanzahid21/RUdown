import { env } from 'cloudflare:workers';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
 const query=new URL(request.url).searchParams.get('q')?.trim();if(!query||query.length<2||query.length>160)return Response.json({error:'Enter a ZIP code, city, or place.'},{status:400});
 try {
  const db=env.DB as D1Database;const key=query.toLowerCase();const cached=await db.prepare('SELECT data FROM searches WHERE query=? AND expires>?').bind(key,Date.now()).first<{data:string}>();if(cached)return Response.json(JSON.parse(cached.data));
  const config=env as unknown as Record<string,string>;const endpoint=config.GEOCODER_URL||'https://photon.komoot.io/api/';const url=new URL(endpoint);url.searchParams.set('q',query);url.searchParams.set('limit','5');url.searchParams.set('lang','en');url.searchParams.set('lat','40.4862');url.searchParams.set('lon','-74.4518');
  const response=await fetch(url,{headers:{'Accept':'application/json'},signal:AbortSignal.timeout(9000)});if(!response.ok)throw new Error('Search unavailable');const data=await response.json() as any;
  const results=(data.features||[]).map((f:any)=>({label:[f.properties.name,f.properties.street,f.properties.city||f.properties.county,f.properties.state,f.properties.postcode,f.properties.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', '),lng:f.geometry.coordinates[0],lat:f.geometry.coordinates[1]}));
  const body={results,provider:'Photon / OpenStreetMap'};await db.prepare('INSERT INTO searches(query,data,expires) VALUES(?,?,?) ON CONFLICT(query) DO UPDATE SET data=excluded.data,expires=excluded.expires').bind(key,JSON.stringify(body),Date.now()+86400000).run();return Response.json(body);
 }catch{return Response.json({error:'Live location search is unavailable. Try again, or use the New Brunswick demo location.'},{status:503});}
}
