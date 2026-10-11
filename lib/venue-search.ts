import {attending,type Session,type Location} from './planning';
export const venueKinds:Record<string,{category:string;types:string[]}>= {
 'Coffee shops':{category:'Food',types:['cafe','coffee_shop']},
 'Restaurants':{category:'Food',types:['restaurant']},
 'Parks & trails':{category:'Outdoors',types:['park','hiking_area']},
 'Museums & attractions':{category:'Culture',types:['museum','art_gallery','tourist_attraction']},
 'Arcades & entertainment':{category:'Entertainment',types:['amusement_center','bowling_alley','movie_theater']},
 'Hotels':{category:'All vibes',types:['hotel']}
};
export function crewSearch(s:Session,kind:string):{center:Location;category:string}{
 if(!Object.hasOwn(venueKinds,kind))throw new Error('Choose a place category.');
 const crew=attending(s.members).filter(m=>m.ready&&Number.isFinite(m.location.lat)&&Number.isFinite(m.location.lng));
 if(!crew.length)throw new Error('Save at least one member’s location and preferences first.');
 const lat=crew.reduce((n,m)=>n+m.location.lat,0)/crew.length;
 // Circular longitude mean keeps groups near the date line in the same area.
 const lng=Math.atan2(crew.reduce((n,m)=>n+Math.sin(m.location.lng*Math.PI/180),0),crew.reduce((n,m)=>n+Math.cos(m.location.lng*Math.PI/180),0))*180/Math.PI;
 return {center:{label:'your crew’s approximate center',lat:Number(lat.toFixed(2)),lng:Number(lng.toFixed(2))},category:venueKinds[kind].category};
}
