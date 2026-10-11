import type {Activity} from './planning';
import {matchesVenue} from './venue-photos';
import {placeHours,validPlaceId} from './places-discovery';
export async function fetchVenueHours(a:Activity,key:string,savedId?:string,fetcher:typeof fetch=fetch){
 const mask='id,displayName,location,currentOpeningHours,regularOpeningHours';
 async function request(url:string,body?:unknown){
  const r=await fetcher(url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':body?mask.split(',').map(f=>'places.'+f).join(','):mask},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error(r.status===429?'Google Places is temporarily rate limited. Try again later.':'Could not load hours from Google Places. Try again.');
  return r.json() as Promise<any>;
 }
 let place;
 if(validPlaceId(savedId)){const p=await request('https://places.googleapis.com/v1/places/'+savedId);if(matchesVenue(a,p))place=p;}
 if(!place){const d=await request('https://places.googleapis.com/v1/places:searchText',{textQuery:a.name+' '+a.area,pageSize:3});place=d.places?.find((p:any)=>matchesVenue(a,p));}
 return {hours:place?placeHours(place)||null:null,placeId:place?.id as string|undefined};
}
