'use client';
import {useState} from 'react';
import {MapPin,Loader2} from 'lucide-react';
import {crewSearch,venueKinds} from '@/lib/venue-search';
import type {Session,Location} from '@/lib/planning';
export default function PlaceFinder({session,busy,onSearch}:{session:Session;busy:boolean;onSearch:(center:Location,kind:string,category:string)=>void}){
 const [kind,setKind]=useState('Coffee shops'),[consent,setConsent]=useState(false),[error,setError]=useState('');
 const selectedKind=session.type==='overnight'?'Hotels':kind;
 function search(){try{const query=crewSearch(session,selectedKind);setError('');onSearch(query.center,selectedKind,query.category);}catch(e){setError((e as Error).message);}}
 return <section className="place-finder"><div className="section-heading"><h2><MapPin size={20}/> Find nearby places</h2><span className="tiny-label">GOOGLE MAPS</span></div><p>Find real venues within 10 miles of the center of your crew's saved areas. Results update the cards and map below, ranked against everyone's preferences.</p><div className="place-search-controls"><label>What are you looking for?<select value={selectedKind} onChange={e=>setKind(e.target.value)} disabled={busy||session.type==='overnight'}>{Object.keys(venueKinds).filter(k=>session.type==='overnight'?k==='Hotels':k!=='Hotels').map(k=><option key={k}>{k}</option>)}</select></label><button className="button primary" onClick={search} disabled={busy||!consent}>{busy?<Loader2 className="spin" size={17}/>:<MapPin size={17}/>} {busy?'Finding places…':'Find nearby places'}</button></div><label className="place-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Use an approximate group center and the selected category to search Google Places. Names and budgets are not sent.</label>{error&&<p className="alert warning" role="alert">{error}</p>}<p className="data-note">Ratings are shown when available. Costs are your editable planning allowances; confirm prices, hours and availability with the venue. This search does not use Gemini.</p></section>;
}
