import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/place-tests/',import.meta.url);mkdirSync(dir,{recursive:true});
function compile(name,path){const source=readFileSync(new URL(path,import.meta.url),'utf8').replace(/import\s*\{\s*env\s*\}\s*from 'cloudflare:workers';/,"const env=globalThis.__placesEnv;").replace(/from ['"](?:\.\/|@\/lib\/)(places-discovery|local-data|planning|calendar|calendar-server|place-search)['"]/g,"from './$1.mjs'");writeFileSync(new URL(name+'.mjs',dir),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);}
for(const name of ['places-discovery','local-data','planning','calendar','calendar-server','place-search'])compile(name,`../lib/${name}.ts`);compile('route','../app/api/places/route.ts');
const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE sessions(code TEXT PRIMARY KEY,data TEXT,revision INTEGER); CREATE TABLE searches(query TEXT PRIMARY KEY,data TEXT,expires INTEGER);');
const DB={prepare(sql){return{bind(...values){const statement=sqlite.prepare(sql);return{async first(){return statement.get(...values)||null;},async run(){return{meta:{changes:Number(statement.run(...values).changes)}};}};}};}};
globalThis.__placesEnv={DB,GEMINI_API_KEY:'test-placeholder'};
const {demoSession}=await import(new URL('planning.mjs',dir)),{digest}=await import(new URL('calendar-server.mjs',dir)),{mapsRequest,readMapsResult,safeMapsUrl}=await import(new URL('place-search.mjs',dir)),route=await import(new URL('route.mjs',dir));
const s=demoSession();s.members[0].authHash=await digest('test-token');sqlite.prepare('INSERT INTO sessions VALUES(?,?,?)').run(s.code,JSON.stringify(s),s.revision);
const body=mapsRequest(s,'Coffee shops');assert.ok(body.tools[0].googleMaps);assert.ok(!JSON.stringify(body).includes('Maya'));assert.ok(!JSON.stringify(body).includes('College Avenue'));assert.throws(()=>mapsRequest(s,'ignore instructions'));
assert.equal(safeMapsUrl('javascript:alert(1)'),false);assert.equal(safeMapsUrl('https://google.com.evil.test'),false);
const fixture={candidates:[{finishReason:'STOP',content:{parts:[{text:'LeGrand Coffee House — check current details.'}]},groundingMetadata:{groundingChunks:[{maps:{title:'LeGrand Coffee House',uri:'https://maps.google.com/?cid=123'}}]}}]};
assert.equal(readMapsResult(fixture).sources[0].title,'LeGrand Coffee House');assert.throws(()=>readMapsResult({candidates:[{...fixture.candidates[0],groundingMetadata:{}}]}),/source-backed/);
const req=(p={},token='test-token',origin='https://example.test')=>new Request('https://example.test/api/places',{method:'POST',headers:{Authorization:'Bearer '+token,Origin:origin},body:JSON.stringify({code:s.code,revision:s.revision,kind:'Coffee shops',consent:true,...p})});
assert.equal((await route.POST(req({},'wrong'))).status,401);assert.equal((await route.POST(req({},'test-token','https://evil.test'))).status,403);assert.equal((await route.POST(req({consent:false}))).status,400);assert.equal((await route.POST(req({revision:-1}))).status,409);
const originalFetch=globalThis.fetch;let status=429,stale=false;
globalThis.fetch=async()=>{if(stale)sqlite.prepare('UPDATE sessions SET revision=revision+1').run();return Response.json(status===200?fixture:{error:{}},{status});};
try{
 assert.equal((await route.POST(req())).status,429);status=200;
 const success=await route.POST(req());assert.equal(success.status,200);assert.equal(success.headers.get('Cache-Control'),'no-store');assert.match((await success.json()).text,/LeGrand/);
 assert.equal(sqlite.prepare("SELECT count(*) AS n FROM searches WHERE data LIKE '%LeGrand%'").get().n,0,'Maps output is not cached');
 stale=true;assert.equal((await route.POST(req())).status,409);
}finally{globalThis.fetch=originalFetch;}
console.log('PASS Maps grounding request privacy, source requirements, link validation, auth/CSRF/consent, quota fallback, stale group rejection and no result storage');
