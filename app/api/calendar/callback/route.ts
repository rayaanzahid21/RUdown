import {calendarConfigured,calendarConfig,calendarDb,digest,googleToken,seal,connectionId,readGroup,readConnection,syncConnection} from '@/lib/calendar-server';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
 const finish=(status:string)=>new Response(null,{status:303,headers:{Location:'/?calendar='+status,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Set-Cookie':'rudown_calendar_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/api/calendar; Max-Age=0'}});
 try {
  if(!calendarConfigured())return finish('setup');
  const url=new URL(request.url),state=url.searchParams.get('state'),browser=request.headers.get('Cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith('rudown_calendar_oauth='))?.slice('rudown_calendar_oauth='.length);
  if(!state||!browser)return finish('failed');
  // Consume once, bound to the initiating browser, before exchanging the code.
  const row=await calendarDb().prepare('DELETE FROM calendar_oauth WHERE state=? AND browser=? AND expires>? RETURNING code,member').bind(await digest(state),await digest(browser),Date.now()).first<{code:string;member:string}>();
  if(!row)return finish('failed');
  if(url.searchParams.has('error'))return finish('cancelled');
  const code=url.searchParams.get('code');if(!code)return finish('failed');
  const s=await readGroup(row.code);if(!s.members.some(m=>m.id===row.member))return finish('failed');
  const token=await googleToken({code,grant_type:'authorization_code',redirect_uri:calendarConfig().origin+'/api/calendar/callback'});
  if(!token.refresh_token||!token.scope?.split(' ').some(v=>['https://www.googleapis.com/auth/calendar.events.owned','https://www.googleapis.com/auth/calendar.events','https://www.googleapis.com/auth/calendar'].includes(v)))return finish('failed');
  const id=connectionId(row.code,row.member),existing=await readConnection(id);
  if(existing&&existing.lease>Date.now())return finish('busy');
  const eventId=existing?.event_id||'cafe'+crypto.randomUUID().replace(/-/g,'');
  // Preserve the ID so reconnecting the same account does not duplicate events.
  await calendarDb().prepare('INSERT INTO calendar_connections(id,code,member,refresh,event_id,status) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET refresh=excluded.refresh,event_id=excluded.event_id,synced=NULL,status=excluded.status,lease=0,updated=0 WHERE calendar_connections.lease<?').bind(id,row.code,row.member,await seal(token.refresh_token,id),eventId,'pending',Date.now()).run();
  await syncConnection(id);return finish('connected');
 }catch{return finish('failed');}
}
