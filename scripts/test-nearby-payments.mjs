import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/payment-tests/',import.meta.url);mkdirSync(dir,{recursive:true});
function compile(name,path){const source=readFileSync(new URL(path,import.meta.url),'utf8').replace(/import \{\s*env\s*\} from 'cloudflare:workers';/,"const env=globalThis.__paymentEnv;").replace(/from ['"](?:\.\/|@\/lib\/)(places-discovery|local-data|planning|nearby|actions|calendar|calendar-server|card-payments)['"]/g,"from './$1.mjs'");writeFileSync(new URL(name+'.mjs',dir),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText);}
for(const name of ['places-discovery','local-data','planning','nearby','actions','calendar','calendar-server','card-payments'])compile(name,`../lib/${name}.ts`);
compile('payments','../app/api/payments/route.ts');compile('PaymentOptions','../app/components/PaymentOptions.tsx');
const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE sessions(code TEXT PRIMARY KEY,data TEXT,revision INTEGER);');sqlite.exec(readFileSync(new URL('../drizzle/0002_unusual_red_wolf.sql',import.meta.url),'utf8'));
const DB={prepare(sql){return{bind(...values){const statement=sqlite.prepare(sql);return{async first(){return statement.get(...values)||null;},async run(){return{meta:{changes:Number(statement.run(...values).changes)}};}};}};}};
globalThis.__paymentEnv={DB};
const {demoSession,selectedActivity,catalog}=await import(new URL('planning.mjs',dir)),{groupActivities}=await import(new URL('nearby.mjs',dir)),{mutate}=await import(new URL('actions.mjs',dir)),{digest}=await import(new URL('calendar-server.mjs',dir)),{calendarEvent}=await import(new URL('calendar.mjs',dir)),route=await import(new URL('payments.mjs',dir));
let s=demoSession();assert.ok(catalog.length>=22);assert.ok(groupActivities(s.members).filter(a=>a.type==='hangout').length>3);
// Unsupported areas must not fabricate local businesses or use the crew's home as a venue.
s.members.forEach(m=>{m.location={label:'Oakland, CA',lat:37.8044,lng:-122.2712};m.miles=20;});
const local=groupActivities(s.members);assert.equal(local.length,0);
s=demoSession();s.members.forEach(m=>{m.location={label:'Woodbridge NJ',lat:40.55,lng:-74.28};});
const coffee=groupActivities(s.members).find(a=>a.id==='legrand');assert.equal(coffee.name,'LeGrand Coffee House');assert.equal(coffee.rating.value,4.6);assert.match(coffee.area,/10 Green Street/);
assert.ok(groupActivities(s.members).every(a=>!a.localTemplate));
mutate(s,'you','select',{id:coffee.id});const savedLocation=structuredClone(selectedActivity(s).location);
mutate(s,'you','preferences',{...s.members[0],location:{label:'Seattle, WA',lat:47.6062,lng:-122.3321}});
assert.deepEqual(selectedActivity(s).location,savedLocation,'selected itinerary stays pinned when origins change');
assert.throws(()=>mutate(s,'you','select',{id:'local-forged'}),/Choose a plan/);
s.schedule={start:new Date(Date.now()+86400000).toISOString(),end:new Date(Date.now()+90000000).toISOString(),timeZone:'America/Los_Angeles'};
assert.ok(JSON.stringify(calendarEvent(s,'you')).includes('LeGrand'));
s=demoSession();s.members[0].authHash=await digest('test-token');mutate(s,'you','select',{id:'picnic'});
const save=()=>sqlite.prepare('INSERT INTO sessions VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET data=excluded.data,revision=excluded.revision').run(s.code,JSON.stringify(s),s.revision);save();
const req=(body={},token='test-token',origin='https://example.test')=>new Request('https://example.test/api/payments',{method:'POST',headers:{Authorization:'Bearer '+token,Origin:origin},body:JSON.stringify({code:s.code,version:s.version,...body})});
const get=()=>new Request('https://example.test/api/payments?code='+s.code,{headers:{Authorization:'Bearer test-token'}});
assert.equal((await route.POST(req({},'wrong'))).status,401);assert.equal((await route.POST(req({},'test-token','https://evil.test'))).status,403);
assert.equal((await route.GET(get()).then(r=>r.json())).configured,false);assert.equal((await route.POST(req())).status,503);
globalThis.__paymentEnv.STRIPE_SECRET_KEY='sk_live_not-allowed';assert.equal((await route.GET(get()).then(r=>r.json())).configured,false);
globalThis.__paymentEnv.STRIPE_SECRET_KEY='sk_test_fixture';assert.equal((await route.POST(req())).status,400);
for(const m of s.members)mutate(s,m.id,'approve',{version:s.version,acknowledge:true});save();
assert.equal((await route.POST(req({version:s.version-1}))).status,409);
const originalFetch=globalThis.fetch;let creates=0,paid=false,badAmount=false,providerDown=false,changeDuringCreate=false,lastFields;
globalThis.fetch=async(url,init={})=>{
 if(providerDown)return new Response('{}',{status:503});
 const fields=init.body instanceof URLSearchParams?init.body:null;
 if(String(url).endsWith('/expire'))return Response.json({livemode:false,status:'expired'});
 if(fields){creates++;lastFields=fields;assert.equal(fields.get('line_items[0][price_data][unit_amount]'),'1600');assert.equal(init.headers['Idempotency-Key'],fields.get('metadata[contribution]'));if(changeDuringCreate){mutate(s,'you','revoke',{});save();}}
 return Response.json({livemode:false,id:'cs_test_fixture',currency:'usd',amount_total:badAmount?1:1600,metadata:{contribution:lastFields?.get('metadata[contribution]')},status:paid?'complete':'open',payment_status:paid?'paid':'unpaid',url:'https://checkout.stripe.com/c/pay/cs_test_fixture'});
};
try{
 const first=await route.POST(req({amount:1,cents:1}));assert.equal(first.status,200);assert.match((await first.json()).url,/checkout.stripe.com/);assert.equal(creates,1);
 assert.equal((await route.POST(req())).status,200);assert.equal(creates,1,'duplicate click reuses checkout');
 assert.equal((await route.GET(get()).then(r=>r.json())).receipt.paid,false);
 paid=true;assert.equal((await route.GET(get()).then(r=>r.json())).receipt.paid,true);assert.equal((await route.POST(req()).then(r=>r.json())).paid,true);assert.equal(creates,1);
 badAmount=true;assert.equal((await route.GET(get())).status,502);badAmount=false;
 providerDown=true;assert.equal((await route.GET(get())).status,502);providerDown=false;
 mutate(s,'you','expense',{name:'Extra snack',cents:100,basis:'person',members:['maya']});for(const m of s.members)mutate(s,m.id,'approve',{version:s.version,acknowledge:true});save();
 assert.equal((await route.POST(req())).status,409,'earlier paid plan blocks duplicate contribution');
 sqlite.exec('DELETE FROM card_checkouts');paid=false;changeDuringCreate=true;
 assert.equal((await route.POST(req())).status,409,'withdrawn approval expires just-created checkout');
}finally{globalThis.fetch=originalFetch;}
const {default:PaymentOptions}=await import(new URL('PaymentOptions.mjs',dir));
const html=renderToStaticMarkup(createElement(PaymentOptions,{session:s,memberId:'you'},createElement('p',null,'Solana controls')));
assert.ok(html.indexOf('>Solana<')<html.indexOf('Credit / debit card'));assert.match(html,/Why Solana\?/);assert.match(html,/aria-pressed="true"/);assert.match(html,/refunds and releases are not automated/);
console.log('PASS nearby locations, catalog coverage, selected-plan stability, calendar location, card auth/CSRF, test-only keys, approvals, server-priced checkout, duplicate prevention, verified receipts, Stripe failures, stale approvals and Solana-first markup');
