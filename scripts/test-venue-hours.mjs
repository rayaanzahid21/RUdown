import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/hours-tests/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const n of ['venue-hours','venue-photos','places-discovery','planning','local-data']){
 const s=readFileSync(new URL('../lib/'+n+'.ts',import.meta.url),'utf8').replace(/from '\.\/(venue-photos|places-discovery|planning|local-data)'/g,"from './$1.mjs'");
 writeFileSync(new URL(n+'.mjs',dir),ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
}
const {catalog}=await import(new URL('planning.mjs',dir)),{fetchVenueHours}=await import(new URL('venue-hours.mjs',dir));
const a=catalog.find(a=>a.id==='legrand'),p={id:'ChIJ_fixture',displayName:{text:a.name},location:{latitude:a.location.lat,longitude:a.location.lng},currentOpeningHours:{openNow:false,weekdayDescriptions:['Monday: 7 AM–6 PM']}};
let calls=0;const f=async(url,init)=>{calls++;assert.ok(init.headers['X-Goog-FieldMask'].includes('currentOpeningHours'));return Response.json(String(url).endsWith('searchText')?{places:[{...p,displayName:{text:'Wrong venue'}},p]}:p);};
let result=await fetchVenueHours(a,'fixture',undefined,f);assert.equal(result.hours.openNow,false);assert.equal(result.placeId,p.id);
calls=0;result=await fetchVenueHours(a,'fixture',p.id,f);assert.equal(calls,1);assert.deepEqual(result.hours.weekdays,['Monday: 7 AM–6 PM']);
result=await fetchVenueHours(a,'fixture',undefined,async()=>Response.json({places:[{...p,location:{latitude:0,longitude:0}}]}));assert.equal(result.hours,null);
await assert.rejects(fetchVenueHours(a,'fixture',undefined,async()=>Response.json({}, {status:429})),/rate limited/);
console.log('PASS saved venue hours matching, saved Place ID reuse, closed status, wrong-location rejection and provider failure');
