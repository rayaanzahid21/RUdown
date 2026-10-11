import {type Activity,type Session,type TripType,categories} from './planning';
export const validPlaceId=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,200}$/.test(v);
export const fieldMask='id,displayName,formattedAddress,location,rating,userRatingCount,googleMapsUri,types,businessStatus,currentOpeningHours,regularOpeningHours';
export const discoveryTypes:Record<string,string[]>={'All vibes':['cafe','restaurant','park','museum','tourist_attraction','bowling_alley'],Food:['cafe','restaurant'],Outdoors:['park'],Adventure:['hiking_area','park'],Culture:['museum','art_gallery','tourist_attraction'],Entertainment:['movie_theater','bowling_alley','amusement_center']};
export function placeHours(p:any):Activity['openingHours']{
 const current=p?.currentOpeningHours,regular=p?.regularOpeningHours;
 const clean=(v:any):string[]=>Array.isArray(v)?v.filter((x:any)=>typeof x==='string'&&x.length<=300).slice(0,7):[];
 const upcoming=clean(current?.weekdayDescriptions),normal=clean(regular?.weekdayDescriptions);
 const openNow=typeof current?.openNow==='boolean'?current.openNow:undefined;
 if(openNow===undefined&&!upcoming.length&&!normal.length)return undefined;
 return {openNow,weekdays:upcoming.length?upcoming:normal,current:upcoming.length>0,checkedAt:new Date().toISOString()};
}
export function placeActivity(p:any,type:TripType,allowance:number):Activity{
 if(!validPlaceId(p?.id)||!p.displayName?.text||!Number.isFinite(p.location?.latitude)||!Number.isFinite(p.location?.longitude)||p.businessStatus==='CLOSED_PERMANENTLY'||p.businessStatus==='CLOSED_TEMPORARILY')throw new Error('This place is unavailable. Choose another venue.');
 const types=p.types||[],category=types.some((t:string)=>['cafe','restaurant','coffee_shop'].includes(t))?'Food':types.includes('park')?'Outdoors':types.includes('hiking_area')?'Adventure':types.some((t:string)=>['museum','art_gallery','tourist_attraction'].includes(t))?'Culture':'Entertainment';
 const maps='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.displayName.text)+'&query_place_id='+encodeURIComponent(p.id);
 return {openingHours:placeHours(p),id:'google-'+p.id,googlePlaceId:p.id,name:p.displayName.text,area:p.formattedAddress||p.displayName.text,location:{label:p.formattedAddress||p.displayName.text,lat:p.location.latitude,lng:p.location.longitude},category,type,image:'',tagline:'Live Google Places result. Costs use your activity allowance, not a verified venue price. Confirm admission, hours, group capacity and any extra charges.',base:[{name:'Activity allowance — confirm actual venue prices',cents:allowance,basis:'person'}],capacity:12,slots:['Morning','Afternoon','Evening'],itinerary:['Confirm hours, availability and requirements with the venue','Replace the activity allowance with confirmed costs before approving','Agree on transport and a meeting time'],venueSearch:maps,...(Number.isFinite(p.rating)?{rating:{value:p.rating,source:maps,checkedOn:new Date().toISOString().slice(0,10),provider:'Google Maps',count:p.userRatingCount}}:{})};
}
export async function resolvePlace(placeId:string,type:TripType,allowance:number,key:string):Promise<Activity>{
 if(!validPlaceId(placeId))throw new Error('Invalid place.');
 const r=await fetch('https://places.googleapis.com/v1/places/'+placeId,{headers:{'X-Goog-Api-Key':key,'X-Goog-FieldMask':fieldMask},signal:AbortSignal.timeout(9000)});if(!r.ok)throw new Error('Google could not refresh this venue. Try again.');return placeActivity(await r.json(),type,allowance);
}
export async function hydratePlace(s:Session,key:string){if(s.selectedExternal&&s.selected==='google-'+s.selectedExternal.placeId){try{s.selectedActivity=await resolvePlace(s.selectedExternal.placeId,s.type,s.selectedExternal.allowanceCents,key);}catch{delete s.selectedActivity;}}return s;}
export function storedSession(s:Session){if(!s.selectedExternal)return s;const copy={...s};delete copy.selectedActivity;return copy;}
