import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/place-tests/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const name of ['local-data','planning','venue-search']){
 const source=readFileSync(new URL('../lib/'+name+'.ts',import.meta.url),'utf8').replace(/from '\.\/(planning|local-data)'/g,"from './$1.mjs'");
 writeFileSync(new URL(name+'.mjs',dir),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
}
const {demoSession}=await import(new URL('planning.mjs',dir)),{crewSearch}=await import(new URL('venue-search.mjs',dir));
const s=demoSession();s.members[0].location={label:'Private address',lat:40.50,lng:-74.20};s.members[1].location={label:'Other address',lat:40.60,lng:-74.40};s.members[2].attending=false;s.members[3].ready=false;
const before=JSON.stringify(s),q=crewSearch(s,'Coffee shops');assert.equal(q.center.lat,40.55);assert.equal(q.center.lng,-74.30);assert.equal(q.category,'Food');assert.equal(JSON.stringify(s),before);assert.ok(!JSON.stringify(q).includes('Private address'));assert.ok(!JSON.stringify(q).includes('budget'));assert.throws(()=>crewSearch(s,'__proto__'));
s.members.forEach(m=>m.ready=false);assert.throws(()=>crewSearch(s,'Restaurants'),/Save at least/);
writeFileSync(new URL('retired.mjs',dir),ts.transpileModule(readFileSync(new URL('../app/api/places/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText);
const {POST}=await import(new URL('retired.mjs',dir));const original=globalThis.fetch;globalThis.fetch=()=>{throw new Error('Retired endpoint must not call Google');};
try{const r=await POST();assert.equal(r.status,410);assert.match((await r.json()).error,/Refresh RUdown/);}finally{globalThis.fetch=original;}
console.log('PASS group center uses ready attending members, preserves origins, excludes names/budgets, rejects invalid input, and retired Gemini endpoint makes no provider call');
