import {attending,type Session} from './planning';
export const placeKinds=['Coffee shops','Restaurants','Parks & trails','Museums & attractions','Arcades & entertainment','Hotels'] as const;
export type PlaceSources={title:string;uri:string}[];
export type PlaceResult={text:string;sources:PlaceSources;checkedOn:string};
export function mapsRequest(s:Session,kind:string){
 if(!placeKinds.includes(kind as typeof placeKinds[number]))throw new Error('Choose a place category.');
 const crew=attending(s.members).filter(m=>m.ready);
 if(!crew.length)throw new Error('Save at least one member’s location and preferences first.');
 // Approximate areas only: no names, exact home addresses, feedback, keys or calendars.
 const areas=crew.map(m=>({lat:Number(m.location.lat.toFixed(2)),lng:Number(m.location.lng.toFixed(2)),maxMiles:m.miles}));
 const lat=areas.reduce((n,a)=>n+a.lat,0)/areas.length,lng=areas.reduce((n,a)=>n+a.lng,0)/areas.length;
 return {contents:[{role:'user',parts:[{text:`Use Google Maps to find 3 to 5 actual ${kind.toLowerCase()} for a group of ${crew.length}. Prefer highly rated places with substantial review counts, close to these approximate starting areas: ${JSON.stringify(areas)}. Lowest total outing budget is $${Math.min(...crew.map(m=>m.budget))/100} per person. Interests: ${[...new Set(crew.flatMap(m=>m.categories))].join(', ')}. Consider every starting area, not only the first. Give each place's real name, street address, source-supported rating and review count when available, and a short reason to consider it. Link Google Maps sources. If a rating or price is unavailable, say so; never invent one. Do not quote user reviews or guarantee hours, affordability, booking availability, accessibility, discounts, travel fares or travel times. Prices are estimates unless supported by a current menu. Do not calculate a final group bill. Keep the response under 600 words.`}]}],tools:[{googleMaps:{}}],toolConfig:{retrievalConfig:{latLng:{latitude:lat,longitude:lng}}},generationConfig:{maxOutputTokens:2600}};
}
export function safeMapsUrl(value:unknown):value is string{
 if(typeof value!=='string')return false;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(['maps.google.com','www.google.com','google.com','maps.app.goo.gl','maps.googleusercontent.com'].includes(u.hostname)||u.hostname==='grounding-api-redirect.googleapis.com');}catch{return false;}
}
export function readMapsResult(data:any):PlaceResult{
 const candidate=data?.candidates?.[0];
 if(candidate?.finishReason!=='STOP')throw new Error('Search did not complete. Try again.');
 const text=candidate.content?.parts?.filter((p:any)=>typeof p.text==='string'&&!p.thought).map((p:any)=>p.text).join('\n');
 const sources:PlaceSources=[];
 for(const chunk of candidate.groundingMetadata?.groundingChunks||[]){
  const m=chunk.maps;if(!m)continue;
  if(safeMapsUrl(m.uri)&&typeof m.title==='string')sources.push({title:m.title,uri:m.uri});
  for(const review of m.placeAnswerSources?.reviewSnippets||[])if(safeMapsUrl(review.googleMapsUri))sources.push({title:review.title||review.authorAttribution?.displayName||'Review source',uri:review.googleMapsUri});
 }
 if(!text||text.length>18000||!sources.length)throw new Error('Google Maps did not return source-backed places. Try again; existing local plans are still available.');
 return {text,sources:sources.filter((s,i,a)=>a.findIndex(x=>x.uri===s.uri)===i),checkedOn:new Date().toISOString()};
}
