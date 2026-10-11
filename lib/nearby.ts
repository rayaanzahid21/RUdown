import {attending,catalog,distance,type Activity,type Member} from './planning';

// These are planning templates, not invented venue listings. A saved snapshot
// keeps an already selected location stable when a member edits their origin.
export function groupActivities(members:Member[]):Activity[] {
 const crew=attending(members).filter(m=>m.ready);
 const hubs=crew.map(m=>m.location).filter((l,i,all)=>all.findIndex(x=>distance(x,l)<2)===i)
  .sort((a,b)=>Math.max(...crew.map(m=>distance(m.location,a)))-Math.max(...crew.map(m=>distance(m.location,b)))).slice(0,3);
 const local=hubs.flatMap((location)=>{
  const position=location.lat.toFixed(4)+','+location.lng.toFixed(4);let hash=2166136261;for(const c of position)hash=Math.imul(hash^c.charCodeAt(0),16777619);
  const placeId=(hash>>>0).toString(36);
  const town=location.label.split(',').slice(0,2).join(',');
  const templates=[
   {key:'coffee',name:'Coffee & catch-up',category:'Food',type:'hangout',cost:1200,query:'cafes',image:'photo-1501339847302-ac426a4a7cbb',steps:['Choose a café together using the map search','Confirm opening hours, seating, and dietary needs','Meet for coffee and an unhurried catch-up']},
   {key:'walk',name:'A neighborhood wander',category:'Outdoors',type:'hangout',cost:0,query:'public parks walking trails',image:'photo-1441974231531-c6227db76b6e',steps:['Choose a public park or walking route on the map','Confirm public access and an accessible meeting point','Bring water from home and explore together']},
   {key:'dinner',name:'Dinner close to the crew',category:'Food',type:'hangout',cost:3000,query:'restaurants',image:'photo-1414235077428-338989a2e8c0',steps:['Shortlist nearby restaurants on the map','Check menu prices, dietary needs, and book if needed','Meet for dinner; update the estimate with actual prices']},
   {key:'explore',name:'Be a tourist nearby',category:'Culture',type:'day',cost:2800,query:'museums attractions',image:'photo-1449824913935-59a10b8d2000',steps:['Choose a nearby attraction and confirm admission','Explore the area at the group’s pace','Find lunch together and leave time for a coffee stop']},
   {key:'trail',name:'A fresh-air day',category:'Adventure',type:'day',cost:1500,query:'parks hiking trails',image:'photo-1551632811-561732d1e306',steps:['Choose a trail suitable for everyone and check conditions','Agree on transport, water, and a meeting point','Walk together, pause for a packed lunch, and head back']},
   {key:'stay',name:'A little local getaway',category:'Culture',type:'overnight',cost:15000,query:'hotels',image:'photo-1449158743715-0a90ebb6d2d8',steps:['Compare nearby accommodation and confirm capacity and cancellation terms','Update the lodging, meal, and travel estimates before approving','Check in, explore the neighborhood, and enjoy breakfast together']},
  ];
  return templates.map(t=>({id:`local-${t.key}-${placeId}`,name:t.name,area:town,location:{...location,label:town},category:t.category,type:t.type as Activity['type'],tagline:`A starting idea around ${town}, based on your crew’s saved locations.`,image:`https://images.unsplash.com/${t.image}?auto=format&fit=crop&w=1000&q=85`,base:[{name:t.cost===0?'Bring your own water; no paid activities planned':t.type==='overnight'?'Lodging, meals & transport allowance':'Food / activity allowance; confirm transport separately',cents:t.cost,basis:'person' as const}],itinerary:t.steps,capacity:12,slots:t.key==='dinner'?['Afternoon','Evening']:t.type==='overnight'?['Morning','Afternoon','Evening']:['Morning','Afternoon'],venueSearch:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.query+' near '+town+' '+location.lat+','+location.lng)}`,localTemplate:true}));
 });
 const nearbyCatalog=crew.length?catalog.filter(a=>crew.some(m=>distance(m.location,a.location)<=Math.max(m.miles,a.type==='overnight'?250:a.type==='day'?100:50))):catalog;
 return [...nearbyCatalog,...local];
}
