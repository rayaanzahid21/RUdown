import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/feedback-ui/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const [name,path] of [['planning','lib/planning.ts'],['conflicts','lib/conflicts.ts'],['calendar','lib/calendar.ts'],...['UI','CalendarPanel','ConflictPanel','Plan'].map(n=>[n,`app/components/${n}.tsx`])]) {
 let source=readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/from ['"](?:\.\/|@\/lib\/)(planning|conflicts|calendar|UI|CalendarPanel|ConflictPanel)['"]/g,"from './$1.mjs'");
 writeFileSync(new URL(name+'.mjs',dir),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText);
}
const {demoSession,expensesFor,catalog}=await import(new URL('planning.mjs',dir)),{default:Plan}=await import(new URL('Plan.mjs',dir));
const s=demoSession();s.selected='picnic';s.expenses=expensesFor(catalog[0],s.members);
const render=()=>renderToStaticMarkup(createElement(Plan,{session:s,me:s.members[0],busy:false,action:async()=>true,openModal:()=>{},discover:()=>{},setError:()=>{}}));
let html=render();assert.match(html,/This doesn’t work for me/);assert.ok(html.indexOf('This doesn’t work for me')<html.indexOf('The itinerary'));
s.conflicts={you:{reason:'other',note:'<script>alert(1)</script>',windows:[],version:s.version}};
html=render();assert.match(html,/My concern is resolved/);assert.match(html,/CALCULATED SUGGESTIONS/);assert.match(html,/NOT CONNECTED/);assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(html.includes('&lt;script&gt;'));
s.members[0].attending=false;s.selected=null;html=render();assert.match(html,/Rejoin and rebuild the plan/);
console.log('PASS rendered feedback: prominent response button, open-concern controls, AI status, escaped notes and rejoin access without a selected plan');
