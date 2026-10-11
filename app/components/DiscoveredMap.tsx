'use client';
import {useEffect,useState} from 'react';
import type {Activity,Location} from '@/lib/planning';
export default function DiscoveredMap({activities,focus,onActivity}:{activities:Activity[];focus:Location;onActivity:(a:Activity)=>void}){
 const [selected,setSelected]=useState<string|null>(null);
 useEffect(()=>setSelected(null),[focus.lat,focus.lng]);
 const place=activities.find(a=>a.id===selected),q=place?place.name+' '+place.area:focus.lat+','+focus.lng;
 return <div className="discovered-map"><iframe title={place?'Google Maps: '+place.name:'Google Maps: '+focus.label} src={'https://maps.google.com/maps?q='+encodeURIComponent(q)+'&z=13&output=embed'} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/><p className="data-note">Choose a venue below to move the Google Maps pin.</p><div className="map-venue-buttons">{activities.map((a,i)=><button key={a.id} aria-pressed={selected===a.id} onClick={()=>setSelected(a.id)}>{i+1}. {a.name}</button>)}</div>{place&&<button className="button ghost" onClick={()=>onActivity(place)}>View {place.name}</button>}<a className="text-button" href={place?.venueSearch||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q)} target="_blank" rel="noreferrer">Open Google Maps ↗</a></div>;
}
