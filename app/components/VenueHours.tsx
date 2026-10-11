import {Clock3} from 'lucide-react';
import type {Activity} from '@/lib/planning';
export default function VenueHours({activity,compact=false}:{activity:Activity;compact?:boolean}){
 const hours=activity.openingHours;
 if(!hours)return <p className="venue-hours-missing"><Clock3 size={14}/> Opening hours unavailable — check with the venue.</p>;
 const status=hours.openNow===true?'Open when checked':hours.openNow===false?'Closed when checked':'Open/closed status unavailable';
 return <div className={'venue-hours'+(compact?' compact':'')}>
  <p className={'venue-hours-status '+(hours.openNow===true?'is-open':hours.openNow===false?'is-closed':'')}><Clock3 size={14}/>{status}</p>
  {hours.weekdays.length>0?<details><summary>{hours.current?'Hours for the next 7 days':'Regular weekly hours'}</summary><ul>{hours.weekdays.map((day,i)=><li key={i}>{day}</li>)}</ul><p>Times are local to the venue. Holiday hours may differ.</p></details>:<p>Weekly hours unavailable.</p>}
  <small>Google Maps · Checked <time dateTime={hours.checkedAt}>{hours.checkedAt.slice(0,16).replace('T',' ')} UTC</time></small>
  {!compact&&<p>Open status is a snapshot, not confirmation for your planned date. Confirm hours and availability before going. <a href={activity.venueSearch} target="_blank" rel="noreferrer">Check Google Maps ↗</a></p>}
 </div>;
}
