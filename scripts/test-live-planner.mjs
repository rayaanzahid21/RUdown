import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/live-planner-tests/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const [name,path] of [...['local-data','planning','nearby','actions'].map(n=>[n,`lib/${n}.ts`]),['LivePlanner','app/components/LivePlanner.tsx']]){
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/from ['"](?:\.\/|@\/lib\/)(local-data|planning|nearby|actions)['"]/g,"from './$1.mjs'");
 writeFileSync(new URL(name+'.mjs',dir),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText);
}
const {demoSession,recommendation,compareRecommendations,shares}=await import(new URL('planning.mjs',dir)),{publishedLocalPlans}=await import(new URL('local-data.mjs',dir)),{mutate}=await import(new URL('actions.mjs',dir)),{default:LivePlanner}=await import(new URL('LivePlanner.mjs',dir));
let s=demoSession();const rank=()=>publishedLocalPlans.map(a=>({a,r:recommendation(a,s.members)})).sort((a,b)=>compareRecommendations(a.r,b.r));
assert.equal(rank()[0].a.id,'rutgers-cinema');assert.equal(rank()[0].r.feasible,true);
assert.deepEqual(rank()[0].r.costs,{you:1650,maya:1350,alex:1150,jordan:1950});
mutate(s,'maya','preferences',{...s.members[1],budget:800});assert.notEqual(rank()[0].a.id,'rutgers-cinema');assert.equal(rank()[0].r.feasible,true);assert.equal(rank()[0].r.costs.maya,200);
mutate(s,'maya','preferences',{...s.members[1],budget:100});assert.ok(rank().every(x=>!x.r.feasible),'no affordable option is falsely marked a fit');
s=demoSession();mutate(s,'you','select',{id:'rutgers-cinema'});for(const m of s.members)mutate(s,m.id,'approve',{version:s.version,acknowledge:true});
mutate(s,'you','expense',{name:'Shared supplies',cents:1001,basis:'group',members:s.members.map(m=>m.id)});
const before=shares(s.expenses,s.members);mutate(s,'maya','preferences',{...s.members[1],localTravel:{mode:'custom',roundTripCents:600},allowanceCents:100});const after=shares(s.expenses,s.members);
assert.equal(after.maya-before.maya,500);assert.equal(after.you,before.you);assert.ok(s.expenses.some(e=>e.name==='Shared supplies'));assert.deepEqual(s.approvals,{});
assert.throws(()=>mutate(s,'you','expense',{id:s.expenses.find(e=>e.managed).id,name:'Free admission',cents:0,basis:'person',members:['you']}),/Published admission/);
assert.throws(()=>mutate(s,'you','removeExpense',{id:s.expenses.find(e=>e.managed).id}),/Published costs/);
assert.throws(()=>mutate(s,'you','preferences',{...s.members[0],localTravel:{mode:'rutgers',roundTripCents:-1}}),/Round-trip/);
assert.throws(()=>mutate(s,'you','preferences',{...s.members[0],localTravel:{mode:'walk',roundTripCents:500}}),/zero/);
mutate(s,'alex','participation',{attending:false});assert.equal(shares(s.expenses,s.members).alex,0);
s=demoSession();s.members[0].localTravel=undefined;assert.equal(recommendation(publishedLocalPlans.find(a=>a.id==='rutgers-cinema'),s.members).feasible,false);
s=demoSession();s.members[0].location={label:'New York',lat:40.7128,lng:-74.006};assert.ok(recommendation(publishedLocalPlans.find(a=>a.id==='rutgers-cinema'),s.members).issues.some(i=>i.includes('campus-bus access')));
const html=renderToStaticMarkup(createElement(LivePlanner,{compact:true,onOpen:()=>{}}));assert.match(html,/LIVE PLANNER/);assert.match(html,/Why this plan/);assert.match(html,/Official|Price sources/);assert.ok(!html.includes('images.unsplash.com'));assert.ok(html.includes('$61'));
console.log('PASS live planner: sourced admission, per-person transit/allowance, budget-driven re-ranking, infeasible fallback, custom-expense preservation, immutable published costs, approval invalidation, withdrawal and product rendering');
