'use client';
import {useEffect,useRef,useState} from 'react';
import {Clock3} from 'lucide-react';
import type {Activity} from '@/lib/planning';
export default function VenueHours({activity,compact=false}:{activity:Activity;compact?:boolean}){
 const ref=useRef<HTMLDivElement>(null),[loaded,setLoaded]=useState<Activity['openingHours']>(),[loading,setLoading]=useState(!activity.googlePlaceId&&!activity.openingHours),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  setLoaded(undefined);setError('');
  if(activity.openingHours||activity.googlePlaceId){setLoading(false);return;}
  setLoading(true);let active=true;const ctrl=new AbortController();
  async function load(){try{const r=await fetch('/api/venue-hours?id='+encodeURIComponent(activity.id),{cache:'no-store',signal:ctrl.signal});const d=await r.json() as {hours?:Activity['openingHours'];error?:string};if(!r.ok)throw new Error(d.error||'Could not load hours.');if(active)setLoaded(d.hours||undefined);}catch(e){if(active)setError((e as Error).message);}finally{if(active)setLoading(false);}}
  const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer?.disconnect();void load();}});
  if(observer&&ref.current)observer.observe(ref.current);else void load();
  return()=>{active=false;ctrl.abort();observer?.disconnect();};
 },[activity.id,activity.openingHours,activity.googlePlaceId,retry]);
 const hours=activity.openingHours||loaded;
 if(loading)return <div ref={ref} className="venue-hours-missing" role="status"><Clock3 size={14}/> Loading opening hours…</div>;
 if(error)return <div className="venue-hours-missing" role="alert">{error} <button className="text-button" onClick={()=>setRetry(n=>n+1)}>Retry</button></div>;
 if(!hours)return <p className="venue-hours-missing"><Clock3 size={14}/> Hours not found for this listing — check with the venue.</p>;
 const status=hours.openNow===true?'Open when checked':hours.openNow===false?'Closed when checked':'Open/closed status unavailable';
 return <div className={'venue-hours'+(compact?' compact':'')}>
  <p className={'venue-hours-status '+(hours.openNow===true?'is-open':hours.openNow===false?'is-closed':'')}><Clock3 size={14}/>{status}</p>
  {hours.weekdays.length>0?<details><summary>{hours.current?'Hours for the next 7 days':'Regular weekly hours'}</summary><ul>{hours.weekdays.map((day,i)=><li key={i}>{day}</li>)}</ul><p>Times are local to the venue. Holiday hours may differ.</p></details>:<p>Weekly hours unavailable.</p>}
  <small>Google Maps · Checked <time dateTime={hours.checkedAt}>{hours.checkedAt.slice(0,16).replace('T',' ')} UTC</time></small>
  {!compact&&<p>Open status is a snapshot, not confirmation for your planned date. Confirm hours and availability before going. <a href={activity.venueSearch} target="_blank" rel="noreferrer">Check Google Maps ↗</a></p>}
 </div>;
}
