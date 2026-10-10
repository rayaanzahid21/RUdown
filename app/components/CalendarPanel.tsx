'use client';
import {useEffect,useState} from 'react';
import {CalendarDays,ExternalLink,RefreshCw,Link2,CheckCircle2} from 'lucide-react';
import {type Session,type Member} from '@/lib/planning';
import {calendarReady,googleCalendarLink} from '@/lib/calendar';

type Status={configured:boolean;connected:boolean;status?:string;updated?:number};
export default function CalendarPanel({session:s,me,token,busy,action}:{session:Session;me:Member;token?:string;busy:boolean;action:(name:string,p?:any)=>Promise<boolean>}) {
 const [status,setStatus]=useState<Status|null>(null),[error,setError]=useState(''),[working,setWorking]=useState(false),[editing,setEditing]=useState(false);
 const localZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
 const toLocal=(v:string)=>{const d=new Date(v);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
 const load=async()=>{
  if(!token)return;
  const r=await fetch('/api/calendar?'+new URLSearchParams({code:s.code}),{headers:{Authorization:`Bearer ${token}`}}),p=await r.json() as Status&{error?:string};
  if(!r.ok)throw new Error(p.error||'Could not load calendar status.');setStatus(p);
 };
 useEffect(()=>{let active=true;if(token)fetch('/api/calendar?'+new URLSearchParams({code:s.code}),{headers:{Authorization:`Bearer ${token}`}}).then(async r=>{if(!r.ok)throw new Error();return await r.json() as Status;}).then(p=>{if(active)setStatus(p);}).catch(()=>{if(active)setError('Calendar status is unavailable. Try again shortly.');});return()=>{active=false;};},[token,s.code,s.revision]);
 async function calendarAction(name:string) {
  if(!token)return;setWorking(true);setError('');
  try{const r=await fetch('/api/calendar',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({code:s.code,action:name})}),p=await r.json() as {url?:string;error?:string};if(!r.ok)throw new Error(p.error||'Calendar request failed.');if(p.url){window.location.assign(p.url);return;}await load();}catch(e){setError(e instanceof Error?e.message:'Calendar request failed.');}finally{setWorking(false);}
 }
 const format=(v:string)=>new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:s.schedule?.timeZone}).format(new Date(v));
 const pending=!calendarReady(s);
 return <section className="panel calendar-panel">
  <div className="section-heading"><h2><CalendarDays size={21}/> Make it a date</h2><span className="badge neutral">GOOGLE CALENDAR</span></div>
  <p className="muted">A real time to get together. This is separate from your planning deadline.</p>
  {s.schedule&&<div className="calendar-date"><strong>{format(s.schedule.start)}</strong><span>to {format(s.schedule.end)}</span><small>{s.schedule.timeZone}</small></div>}
  {s.owner===me.id&&(!s.schedule||editing)?<form className="form-stack" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(await action('schedule',{start:new Date(String(f.get('start'))).toISOString(),end:new Date(String(f.get('end'))).toISOString(),timeZone:localZone}))setEditing(false);}}>
   <div className="form-grid"><label>Outing starts<input type="datetime-local" name="start" required defaultValue={s.schedule?toLocal(s.schedule.start):''}/></label><label>Outing ends<input type="datetime-local" name="end" required defaultValue={s.schedule?toLocal(s.schedule.end):''}/></label></div>
   <small className="muted">Enter times in your device’s time zone: {localZone}. Saving clears prior approvals.</small>
   <div className="calendar-actions"><button className="button primary" disabled={busy}>Save outing time</button>{s.schedule&&<button type="button" className="button ghost" onClick={()=>setEditing(false)}>Cancel</button>}</div>
  </form>:s.owner===me.id?<button className="text-button" onClick={()=>setEditing(true)}>Change date & time</button>:!s.schedule?<p className="empty-inline">Your organizer needs to set the outing date and time.</p>:null}
  <div className="calendar-options">
   <div><h3>One-click add</h3><p className="muted">Open a filled-in event, then press Save in Google Calendar.</p>{s.schedule?<a className="button ghost" href={googleCalendarLink(s,me.id)} target="_blank" rel="noreferrer"><ExternalLink size={16}/>Add {pending?'draft to':'to'} Google Calendar</a>:<button className="button ghost" disabled>Set an outing time first</button>}<p className="data-note">A snapshot, not a live connection. Repeated saves can create duplicates. {pending?'This plan is still awaiting approval.':''}</p></div>
   <div><h3>Keep my event in sync</h3><p className="muted">Opt in once for this group. RUdown updates one event in your primary calendar after everyone approves, even when you close the app.</p>
    {!token?<p className="calendar-status">Create a real group to connect your calendar.</p>:!status?<button className="button ghost" onClick={()=>load().catch(()=>setError('Calendar status is unavailable.'))}>Check connection</button>:!status.configured?<><span className="calendar-status">App setup required</span><p className="data-note">The app owner must configure Google OAuth before connections are available. One-click add works without setup.</p></>:status.connected?<>
     <p className="calendar-status"><CheckCircle2 size={16}/>{status.status==='synced'?'Connected · latest approved plan synced':status.status==='waiting'?'Connected · waiting for everyone’s approval':status.status==='reconnect'?'Connection needs attention':status.status==='retry'?'Update failed · retry available':'Connected · sync pending'}</p>
     {status.updated? <p className="data-note">Last event update: {new Date(status.updated).toLocaleString()}</p>:null}
     <div className="calendar-actions"><button className="button ghost" disabled={working} onClick={()=>calendarAction('sync')}><RefreshCw size={15}/>Retry sync</button><button className="text-button" disabled={working} onClick={()=>calendarAction('disconnect')}>Disconnect</button></div>
     {status.status==='reconnect'&&<p className="data-note">Disconnect, then connect again to restore access or replace a deleted event.</p>}
     <p className="data-note">Disconnecting stops updates and leaves the event in Google Calendar. You can delete it there.</p>
    </>:<><button className="button primary" disabled={working} onClick={()=>calendarAction('connect')}><Link2 size={16}/>Connect & enable sync</button><p className="data-note">By connecting, you allow RUdown to maintain your event for this group. Google will ask for calendar event permission. No guests are invited.</p></>}
   </div>
  </div>
  <p className="data-note">If an approved plan changes, its connected event becomes “Needs reapproval” and keeps the previous time until everyone approves again. Use either one-click add or sync to avoid two events.</p>
  {error&&<p role="alert" className="field-error">{error}</p>}
 </section>;
}
