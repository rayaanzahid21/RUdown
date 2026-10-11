import {MapPin,Ticket,Landmark,Trees} from 'lucide-react';
import type {Activity} from '@/lib/planning';
export default function PlanArtwork({activity:a}:{activity:Activity}){
 const Icon=a.category==='Entertainment'?Ticket:a.category==='Outdoors'?Trees:Landmark;
 return <div className="venue-art" aria-label={a.name}><div className="venue-art-grid"/><Icon size={48} strokeWidth={1}/><span>{a.category.toUpperCase()}</span><strong>{a.name}</strong><small><MapPin size={11}/>{a.area.split(' · ')[0]}</small></div>;
}
