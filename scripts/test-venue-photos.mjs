import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/photo-tests/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const name of ['local-data','planning','venue-photos']){const source=readFileSync(new URL(`../lib/${name}.ts`,import.meta.url),'utf8').replace(/from '\.\/(local-data|planning)'/g,"from './$1.mjs'");writeFileSync(new URL(name+'.mjs',dir),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);}
const {catalog}=await import(new URL('planning.mjs',dir)),{fetchVenuePhoto,matchesVenue,googleUrl}=await import(new URL('venue-photos.mjs',dir));
const a=catalog.find(a=>a.id==='legrand');
const p={id:'ChIJ_test',displayName:{text:'LeGrand Coffee House'},location:{latitude:a.location.lat,longitude:a.location.lng},googleMapsUri:'https://maps.google.com/?cid=1',photos:[{name:'places/ChIJ_test/photos/photo_ref',authorAttributions:[{displayName:'A Photographer',uri:'//maps.google.com/maps/contrib/123'}]}]};
assert.ok(matchesVenue(a,p));assert.equal(matchesVenue(a,{...p,location:{latitude:40.4,longitude:-74.1}}),false);assert.equal(matchesVenue(a,{...p,displayName:{text:'Unrelated café'}}),false);
assert.equal(googleUrl('https://googleusercontent.com.evil.test/x',true),undefined);assert.equal(googleUrl('javascript:alert(1)'),undefined);
const calls=[];let responsePlace=p,mediaUri='https://lh3.googleusercontent.com/fixture',fail=false;
const fetcher=async(url,options)=>{calls.push({url,options});if(fail)return new Response('{}',{status:403});return Response.json(url.includes('/media?')?{photoUri:mediaUri}:url.endsWith('searchText')?{places:[responsePlace]}:responsePlace);};
let result=await fetchVenuePhoto(a,'fake-server-key',undefined,fetcher);assert.equal(result.photo.authors[0].name,'A Photographer');assert.equal(result.photo.authors[0].url,'https://maps.google.com/maps/contrib/123');assert.equal(result.placeId,p.id);assert.ok(!JSON.stringify(result).includes('fake-server-key'));assert.equal(calls[0].options.headers['X-Goog-Api-Key'],'fake-server-key');
calls.length=0;await fetchVenuePhoto(a,'fake-server-key',p.id,fetcher);assert.match(calls[0].url,/v1\/places\/ChIJ_test$/);assert.match(calls[1].url,/maxWidthPx=900/);
responsePlace={...p,displayName:{text:'Different business'}};assert.equal((await fetchVenuePhoto(a,'key',undefined,fetcher)).photo,null);
responsePlace={...p,photos:[]};assert.equal((await fetchVenuePhoto(a,'key',undefined,fetcher)).photo,null);
responsePlace=p;mediaUri='https://evil.test/photo';assert.equal((await fetchVenuePhoto(a,'key',undefined,fetcher)).photo,null);fail=true;await assert.rejects(()=>fetchVenuePhoto(a,'key',undefined,fetcher),/unavailable/);
console.log('PASS venue identity/distance matching, wrong-business rejection, fresh photo references, photographer attribution, safe URLs, server key isolation, missing photos and provider errors');
