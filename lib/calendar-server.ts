import { env } from 'cloudflare:workers';
import { type Session } from './planning';
import { calendarEvent, calendarReady } from './calendar';

const settings=()=>env as unknown as Record<string,string>;
export const calendarDb=()=>env.DB as D1Database;
export function calendarConfig() {
 const e=settings();
 return {clientId:e.GOOGLE_CALENDAR_CLIENT_ID,clientSecret:e.GOOGLE_CALENDAR_CLIENT_SECRET,key:e.CALENDAR_ENCRYPTION_KEY,origin:e.CALENDAR_APP_ORIGIN};
}
export function calendarConfigured() {
 const c=calendarConfig();return !!(c.clientId&&c.clientSecret&&/^[a-f0-9]{64}$/i.test(c.key||'')&&/^https:\/\/[^/]+$/.test(c.origin||''));
}
export const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function readGroup(code:string):Promise<Session> {
 const row=await calendarDb().prepare('SELECT data,revision FROM sessions WHERE code=?').bind(code).first<{data:string;revision:number}>();
 if(!row)throw new Error('Group access could not be verified.');return {...JSON.parse(row.data),revision:row.revision};
}
export async function calendarMember(request:Request,code:string) {
 const s=await readGroup(code),token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!token)throw new Error('Group access could not be verified.');
 const hash=await digest(token),member=s.members.find(m=>m.authHash===hash);
 if(!member)throw new Error('Group access could not be verified.');return {s,member};
}
export const connectionId=(code:string,member:string)=>`${code}:${member}`;
export type Connection={id:string;code:string;member:string;refresh:string;event_id:string;synced:string|null;status:string;lease:number;updated:number};
export async function readConnection(id:string) {return calendarDb().prepare('SELECT * FROM calendar_connections WHERE id=?').bind(id).first<Connection>();}
async function encryptionKey() {
 const bytes=Uint8Array.from(calendarConfig().key.match(/.{2}/g)!,x=>parseInt(x,16));
 return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);
}
export async function seal(token:string,id:string) {
 const iv=crypto.getRandomValues(new Uint8Array(12)),data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(id)},await encryptionKey(),new TextEncoder().encode(token));
 return btoa(String.fromCharCode(...iv))+'.'+btoa(String.fromCharCode(...new Uint8Array(data)));
}
async function unseal(value:string,id:string) {
 const [a,b]=value.split('.'),decode=(v:string)=>Uint8Array.from(atob(v),x=>x.charCodeAt(0));
 const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(a),additionalData:new TextEncoder().encode(id)},await encryptionKey(),decode(b));return new TextDecoder().decode(data);
}
export async function googleToken(params:Record<string,string>) {
 const c=calendarConfig(),response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...params,client_id:c.clientId,client_secret:c.clientSecret}),signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error(response.status===400?'reconnect':'retry');
 return await response.json() as {access_token:string;refresh_token?:string;scope?:string};
}
async function eventRequest(token:string,method:string,path:string,body:unknown) {
 return fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events'+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
}
// A per-connection lease serializes updates. Each pass re-reads the saved plan,
// so a delayed request cannot overwrite a newer approved version permanently.
export async function syncConnection(id:string) {
 if(!calendarConfigured())return;
 const lease=Date.now()+90000;
 const lock=await calendarDb().prepare('UPDATE calendar_connections SET lease=? WHERE id=? AND lease<?').bind(lease,id,Date.now()).run();
 if(!lock.meta.changes)return;
 try {
  const row=await readConnection(id);if(!row)return;
  let token:string|undefined;
  for(let attempt=0;attempt<3;attempt++) {
   const s=await readGroup(row.code),absent=s.members.find(m=>m.id===row.member)?.attending===false,ready=calendarReady(s)&&!absent,fingerprint=`${s.version}:${absent?'absent':ready?'approved':'pending'}`;
   if(row.synced===fingerprint)break;
   if(!ready&&!row.synced){await calendarDb().prepare("UPDATE calendar_connections SET status='waiting' WHERE id=?").bind(id).run();break;}
   token ||= (await googleToken({grant_type:'refresh_token',refresh_token:await unseal(row.refresh,id)})).access_token;
   const body=ready?{...calendarEvent(s,row.member),transparency:'opaque'}:{summary:`[${absent?'Not attending':'Needs reapproval'}] RUdown · ${s.name}`,description:absent?'You are sitting this RUdown trip out. This event is retained as a reminder only and does not reserve your time. You can delete it in Google Calendar.':'This RUdown plan has changed or an approval was withdrawn. The previous date and location remain a placeholder. Open RUdown to review the current plan. This event will update when everyone approves.',status:'tentative',transparency:absent?'transparent':'opaque'};
   let response:Response;
   if(row.synced)response=await eventRequest(token,'PATCH','/'+row.event_id+'?sendUpdates=none',body);
   else {
    response=await eventRequest(token,'POST','?sendUpdates=none',{id:row.event_id,...body});
    // Caller-generated IDs make a timed-out insertion safe to retry.
    if(response.status===409)response=await eventRequest(token,'PATCH','/'+row.event_id+'?sendUpdates=none',body);
   }
   if(!response.ok)throw new Error([401,403,404,410].includes(response.status)?'reconnect':'retry');
   row.synced=fingerprint;
   await calendarDb().prepare('UPDATE calendar_connections SET synced=?,status=?,updated=? WHERE id=? AND lease=?').bind(fingerprint,ready?'synced':'waiting',Date.now(),id,lease).run();
  }
 }catch(e){await calendarDb().prepare('UPDATE calendar_connections SET status=? WHERE id=? AND lease=?').bind(e instanceof Error&&e.message==='reconnect'?'reconnect':'retry',id,lease).run();}
 finally{await calendarDb().prepare('UPDATE calendar_connections SET lease=0 WHERE id=? AND lease=?').bind(id,lease).run();}
}
export async function syncGroupCalendars(code:string) {
 if(!calendarConfigured())return;
 const rows=await calendarDb().prepare('SELECT id FROM calendar_connections WHERE code=?').bind(code).all<{id:string}>();
 await Promise.all(rows.results.map(row=>syncConnection(row.id)));
}
