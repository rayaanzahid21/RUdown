import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/discovery-tests/',import.meta.url);mkdirSync(dir,{recursive:true});
function compile(name,path){const source=readFileSync(new URL(path,import.meta.url),'utf8').replace(/import\s*\{\s*env\s*\}\s*from 'cloudflare:workers';/,"const env=globalThis.__discoveryEnv;").replace(/from ['"](?:\.\/|@\/lib\/)(venue-search|places-discovery|local-data|nearby|planning|actions|calendar|calendar-server)['"]/g,"from './$1.mjs'");writeFileSync(new URL(name+'.mjs',dir),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);}
for(const n of ['venue-search','places-discovery','local-data','nearby','planning','actions','calendar','calendar-server'])compile(n,`../lib/${n}.ts`);compile('route','../app/api/discover/route.ts');compile('groups','../app/api/groups/route.ts');
const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE sessions(code TEXT PRIMARY KEY,data TEXT,revision INTEGER,created INTEGER);CREATE TABLE searches(query TEXT PRIMARY KEY,data TEXT,expires INTEGER);');
const DB={prepare(sql){return{bind(...values){const statement=sqlite.prepare(sql);return{async first(){return statement.get(...values)||null;},async run(){return{meta:{changes:Number(statement.run(...values).changes)}};}};}};}};
globalThis.__discoveryEnv={DB,GOOGLE_PLACES_API_KEY:'fixture'};
const {demoSession}=await import(new URL('planning.mjs',dir)),{digest}=await import(new URL('calendar-server.mjs',dir)),{mutate}=await import(new URL('actions.mjs',dir)),route=await import(new URL('route.mjs',dir)),groups=await import(new URL('groups.mjs',dir)),{placeActivity,storedSession}=await import(new URL('places-discovery.mjs',dir));
const provider={id:'ChIJ_fixture',displayName:{text:'A real fixture café'},formattedAddress:'10 Test St',location:{latitude:40.55,longitude:-74.28},rating:4.7,userRatingCount:400,types:['cafe'],businessStatus:'OPERATIONAL'};
const a=placeActivity(provider,'hangout',1500);assert.equal(a.category,'Food');assert.equal(a.rating.provider,'Google Maps');assert.equal(a.base[0].cents,1500);assert.throws(()=>placeActivity({...provider,businessStatus:'CLOSED_PERMANENTLY'},'hangout',0));
const s=demoSession();s.members[0].authHash=await digest('fixture-token');const origins=structuredClone(s.members.map(m=>m.location));assert.throws(()=>mutate(structuredClone(s),'you','select',{id:a.id}),/Choose a plan/);
sqlite.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(s.code,JSON.stringify(s),s.revision,Date.now());
let status=200,lastSearch;const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{if(init.body)lastSearch=JSON.parse(init.body);return Response.json(String(url).endsWith('searchNearby')?{places:[provider]}:provider,{status});};
try{
 let r=await route.GET(new Request('https://test/api/discover?lat=40.55&lng=-74.28&category=Food&type=hangout&allowance=1500'));assert.equal(r.status,200);assert.equal((await r.json()).activities[0].name,provider.displayName.text);assert.equal(lastSearch.locationRestriction.circle.center.latitude,40.55);assert.equal(r.headers.get('Cache-Control'),'no-store');
 assert.equal((await route.GET(new Request('https://test/api/discover?lat=999'))).status,400);
 r=await route.GET(new Request('https://test/api/discover?lat=40.55&lng=-74.28&category=Food&kind=Coffee%20shops&type=hangout'));assert.equal(r.status,200);assert.deepEqual(lastSearch.includedPrimaryTypes,['cafe','coffee_shop']);
 r=await route.GET(new Request('https://test/api/discover?lat=40.55&lng=-74.28&category=Food&kind=Restaurants&type=hangout'));assert.equal(r.status,200);assert.deepEqual(lastSearch.includedPrimaryTypes,['restaurant']);
 assert.equal((await route.GET(new Request('https://test/api/discover?lat=40&lng=-74&kind=__proto__'))).status,400);
 status=429;r=await route.GET(new Request('https://test/api/discover?lat=40&lng=-74'));assert.equal(r.status,429);assert.match((await r.json()).error,/Google Places returned/);status=200;
 const req=(p={})=>new Request('https://test/api/groups',{method:'POST',headers:{Authorization:'Bearer fixture-token',Origin:'https://test'},body:JSON.stringify({code:s.code,revision:s.revision,action:'select',id:a.id,allowanceCents:1500,...p})});
 r=await groups.POST(req({allowanceCents:-1}));assert.equal(r.status,400);
 r=await groups.POST(req());assert.equal(r.status,200);const selected=(await r.json()).session;assert.equal(selected.selectedActivity.name,provider.displayName.text);assert.deepEqual(selected.members.map(m=>m.location),origins);
 const saved=JSON.parse(sqlite.prepare('SELECT data FROM sessions WHERE code=?').get(s.code).data);assert.equal(saved.selectedExternal.placeId,provider.id);assert.equal(saved.selectedActivity,undefined);assert.ok(!JSON.stringify(saved).includes(provider.displayName.text));
 r=await groups.GET(new Request('https://test/api/groups?code='+s.code,{headers:{Authorization:'Bearer fixture-token'}}));assert.equal((await r.json()).session.selectedActivity.name,provider.displayName.text);
 status=403;r=await route.GET(new Request('https://test/api/discover?lat=40&lng=-74&category=Food&type=hangout&allowance=1500'));assert.equal(r.status,502);
}finally{globalThis.fetch=originalFetch;}
console.log('PASS live discovery query area, provider mapping, closed-place filtering, allowance validation, trusted selection, preserved origins, ID-only persistence, reload hydration and provider failures');
