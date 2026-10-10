import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../public/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.webmanifest',root),'utf8'));
assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');assert.equal(manifest.id,'/');assert.equal(manifest.short_name,'RUdown');
for(const icon of manifest.icons){const png=readFileSync(new URL(icon.src.slice(1),root));const [width,height]=icon.sizes.split('x').map(Number);assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height);}
const handlers={};let skip=false,claim=false;
const context=vm.createContext({URL,Response,self:{location:{origin:'https://example.test'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{skip=true;},clients:{claim:async()=>{claim=true;}}},fetch:async()=>{throw new Error('offline');}});
vm.runInContext(readFileSync(new URL('sw.js',root),'utf8'),context);
await new Promise(resolve=>handlers.install({waitUntil:p=>p.then(resolve)}));assert.ok(skip);
await new Promise(resolve=>handlers.activate({waitUntil:p=>p.then(resolve)}));assert.ok(claim);
function request(url,method='GET',mode='navigate'){let response;handlers.fetch({request:{url,method,mode},respondWith:p=>response=p});return response;}
let r=await request('https://example.test/?source=homescreen');assert.equal(r.status,503);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.match(await r.text(),/No changes or approvals are saved offline/);
for(const path of ['/api/groups','/api/calendar/callback','/signin-with-chatgpt','/callback'])assert.equal(request('https://example.test'+path),undefined);
assert.equal(request('https://example.test/','POST'),undefined);assert.equal(request('https://example.test/','GET','cors'),undefined);assert.equal(request('https://other.test/'),undefined);
const live=new Response('live page',{status:200});context.fetch=async()=>live;assert.equal(await request('https://example.test/'),live);
const denied=new Response('access denied',{status:403});context.fetch=async()=>denied;assert.equal(await request('https://example.test/'),denied);
console.log('PASS mobile: manifest, PNG sizes, standalone launch, offline fallback, auth/API exclusion, network-only navigation, and preserved access failures.');
