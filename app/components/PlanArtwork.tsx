'use client';
import {useEffect,useRef,useState} from 'react';
import {MapPin,Ticket,Landmark,Trees} from 'lucide-react';
import type {VenuePhoto} from '@/lib/venue-photos';
import type {Activity} from '@/lib/planning';
let configuration:Promise<boolean>|undefined;
const configured=()=>configuration??=fetch('/api/venue-photo').then(r=>r.json()).then((d:any)=>!!d.configured).catch(()=>false);
export default function PlanArtwork({activity:a}:{activity:Activity}){
 const ref=useRef<HTMLDivElement>(null),[photo,setPhoto]=useState<VenuePhoto|null>(null),[loaded,setLoaded]=useState(false);
 useEffect(()=>{let active=true;setPhoto(null);setLoaded(false);const controller=new AbortController();
  async function load(){if(!await configured()||!active)return;try{const r=await fetch('/api/venue-photo?id='+encodeURIComponent(a.id),{signal:controller.signal,cache:'no-store'});const d=await r.json() as {photo:VenuePhoto|null};if(active&&r.ok)setPhoto(d.photo);}catch{}}
  const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer?.disconnect();void load();}});
  if(observer&&ref.current)observer.observe(ref.current);else void load();
  return()=>{active=false;controller.abort();observer?.disconnect();};
 },[a.id]);
 const Icon=a.category==='Entertainment'?Ticket:a.category==='Outdoors'?Trees:Landmark;
 return <div ref={ref} className={'venue-image '+(loaded?'has-photo':'')}><div className="venue-art" aria-label={a.name}><div className="venue-art-grid"/><Icon size={48} strokeWidth={1}/><span>{a.category.toUpperCase()}</span><strong>{a.name}</strong><small><MapPin size={11}/>{a.area.split(' · ')[0]}</small></div>{photo&&<><img className="venue-real-photo" src={photo.url} alt={a.name+' — venue photo'} referrerPolicy="no-referrer" onLoad={()=>setLoaded(true)} onError={()=>{setPhoto(null);setLoaded(false);}}/>{loaded&&<div className="venue-photo-credit"><a className="maps-attribution" translate="no" href={photo.mapsUrl} target="_blank" rel="noreferrer">Google Maps</a>{photo.authors.map((author,i)=><span key={i}> · {author.url?<a href={author.url} target="_blank" rel="noreferrer">{author.name}</a>:author.name}</span>)}</div>}</>}</div>;
}
