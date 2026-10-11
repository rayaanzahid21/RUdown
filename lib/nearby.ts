import {attending,catalog,distance,type Activity,type Member} from './planning';

// Recommend real destinations only. Never turn a saved home/ZIP into a business pin.
export function groupActivities(members:Member[]):Activity[] {
 const crew=attending(members).filter(m=>m.ready);
 return crew.length?catalog.filter(a=>crew.some(m=>distance(m.location,a.location)<=Math.max(m.miles,a.type==='overnight'?250:a.type==='day'?100:50))):catalog;
}
