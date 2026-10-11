'use client';
import {useState,useEffect,useRef} from 'react';
import {MapPin,Sparkles,Loader2,ArrowUpRight} from 'lucide-react';
import {placeKinds,safeMapsUrl,type PlaceResult} from '@/lib/place-search';
import type {Session} from '@/lib/planning';
// React escapes all text. Only Google's HTTPS Maps links become anchors.
function textWithLinks(text:string){return text.split(/(\[[^\]\n]+\]\(https:\/\/[^\s)]+\))/g).map((part,i)=>{const match=part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);return match&&safeMapsUrl(match[2])?<a key={i} href={match[2]} target="_blank" rel="noreferrer">{match[1]}</a>:part;});}
export default function PlaceFinder({session,token,isDemo}:{session:Session;token?:string;isDemo:boolean}){
 const [kind,setKind]=useState<string>('Coffee shops'),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<PlaceResult|null>(null);
 const requestId=useRef(0);
 useEffect(()=>{requestId.current++;setResult(null);setError('');setBusy(false);},[session.code,session.revision,kind]);
 useEffect(()=>()=>{requestId.current++;},[]);
 async function search(){const id=++requestId.current;setBusy(true);setError('');setResult(null);try{
  const response=await fetch('/api/places',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({code:session.code,revision:session.revision,kind,consent})});const data=await response.json() as PlaceResult&{error?:string};
  if(requestId.current!==id)return;if(!response.ok)throw new Error(data.error||'Search could not finish.');setResult(data);
 }catch(e){if(requestId.current===id)setError((e as Error).message);}finally{if(requestId.current===id)setBusy(false);}}
 return <section className="place-finder"><div className="section-heading"><h2><MapPin size={20}/> Find places with Gemini</h2><span className="tiny-label">GOOGLE MAPS SOURCES</span></div><p>Find highly rated, named places around your crew’s saved areas. Check ratings, addresses and the reason each place could fit.</p><div className="place-search-controls"><label>What are you looking for?<select value={kind} onChange={e=>setKind(e.target.value)} disabled={busy}>{placeKinds.map(k=><option key={k}>{k}</option>)}</select></label><button className="button primary" onClick={search} disabled={busy||!consent||isDemo||!token}>{busy?<Loader2 className="spin" size={17}/>:<Sparkles size={17}/>} {busy?'Searching Google Maps…':'Find nearby places'}</button></div>{isDemo?<p className="data-note">Create or join a real group to run live Gemini searches. The named local plans below work in this demo.</p>:<label className="place-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Share approximate group areas, interests and the lowest budget with Google for this search.</label>}{error&&<p className="alert warning" role="alert">{error}</p>}{result&&<div aria-live="polite"><div className="grounded-answer">{textWithLinks(result.text)}</div><div className="maps-sources"><span translate="no" className="maps-attribution">Google Maps</span><div>{result.sources.map(s=><a href={s.uri} key={s.uri} target="_blank" rel="noreferrer">{s.title} <ArrowUpRight size={13}/></a>)}</div></div><p className="data-note">Searched {new Date(result.checkedOn).toLocaleDateString()}. Confirm current details with the venue. Search results are suggestions, not bookings or calculated group plans. Open a matching named plan below, or propose another place in Ideas & votes.</p></div>}</section>;
}
