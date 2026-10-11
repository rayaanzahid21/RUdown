import {calendarConfigured,calendarConfig,calendarDb,calendarMember,connectionId,readConnection,digest,syncConnection} from '@/lib/calendar-server';
import {calendarReady} from '@/lib/calendar';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
export async function GET(request:Request) {
 try{
  const code=new URL(request.url).searchParams.get('code')||'',{s,member}=await calendarMember(request,code);
  if(!calendarConfigured())return reply({configured:false,connected:false});
  const row=await readConnection(connectionId(code,member.id));
  const fingerprint=`${s.version}:${member.attending===false?'absent':calendarReady(s)?'approved':'pending'}`;
  const status=row&&row.synced!==fingerprint&&row.status==='synced'?'pending':row?.status;
  return reply({configured:true,connected:!!row,status:member.attending===false&&status==='waiting'?'not_attending':status,updated:row?.updated});
 }catch{return reply({error:'Could not verify calendar access.'},401);}
}
export async function POST(request:Request) {
 try {
  if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'Request origin is not allowed.'},403);
  const raw=await request.text();if(raw.length>2000)return reply({error:'Request too large.'},413);
  const p=JSON.parse(raw),{member}=await calendarMember(request,p.code),id=connectionId(p.code,member.id);
  if(!calendarConfigured())return reply({error:'Automatic sync needs Google Calendar setup by the app owner. One-click export is available now.'},503);
  if(p.action==='connect') {
   const state=crypto.randomUUID()+crypto.randomUUID(),browser=crypto.randomUUID()+crypto.randomUUID();
   await calendarDb().prepare('DELETE FROM calendar_oauth WHERE expires<?').bind(Date.now()).run();
   await calendarDb().prepare('INSERT INTO calendar_oauth(state,code,member,browser,expires) VALUES(?,?,?,?,?)').bind(await digest(state),p.code,member.id,await digest(browser),Date.now()+600000).run();
   const c=calendarConfig(),params=new URLSearchParams({client_id:c.clientId,redirect_uri:c.origin+'/api/calendar/callback',response_type:'code',scope:'https://www.googleapis.com/auth/calendar.events.owned',access_type:'offline',prompt:'consent',state});
   return reply({url:'https://accounts.google.com/o/oauth2/v2/auth?'+params},200,{'Set-Cookie':`rudown_calendar_oauth=${browser}; HttpOnly; Secure; SameSite=Lax; Path=/api/calendar; Max-Age=600`});
  }
  if(p.action==='disconnect') {
   const result=await calendarDb().prepare('DELETE FROM calendar_connections WHERE id=? AND lease<?').bind(id,Date.now()).run();
   if(!result.meta.changes&&await readConnection(id))return reply({error:'An update is in progress. Try disconnecting again in a moment.'},409);
   await calendarDb().prepare('DELETE FROM calendar_oauth WHERE code=? AND member=?').bind(p.code,member.id).run();
   return reply({connected:false});
  }
  if(p.action==='sync'){await syncConnection(id);return reply({ok:true});}
  return reply({error:'Unknown calendar action.'},400);
 }catch{return reply({error:'Calendar request failed. Please try again.'},400);}
}
