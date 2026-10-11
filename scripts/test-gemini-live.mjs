// Uses only a fictional fixture. Credentials never appear in output.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
process.loadEnvFile('.env.local');
if(!process.env.GEMINI_API_KEY?.trim())throw new Error('GEMINI_API_KEY is missing.');
if(process.argv.includes('--models')){
 const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models',{headers:{'x-goog-api-key':process.env.GEMINI_API_KEY.trim()}});
 const data=await response.json();console.log(JSON.stringify({status:response.status,models:data.models?.filter(m=>m.supportedGenerationMethods?.includes('generateContent')).map(m=>m.name),error:data.error?.status}));process.exit(response.ok?0:1);
}
const dir=new URL('../.sites-runtime/gemini-live/',import.meta.url);mkdirSync(dir,{recursive:true});
function compile(name,path){const source=readFileSync(new URL(path,import.meta.url),'utf8').replace("import { env } from 'cloudflare:workers';","const env=globalThis.__geminiTestEnv;").replace(/from ['"](?:\.\/|@\/lib\/)(nearby|planning|conflicts|actions|calendar|calendar-server)['"]/g,"from './$1.mjs'");writeFileSync(new URL(name+'.mjs',dir),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);}
for(const name of ['nearby','planning','conflicts','actions','calendar','calendar-server'])compile(name,`../lib/${name}.ts`);
compile('recommendations','../app/api/recommendations/route.ts');
const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE sessions(code TEXT PRIMARY KEY,data TEXT,revision INTEGER);CREATE TABLE searches(query TEXT PRIMARY KEY,data TEXT,expires INTEGER);');
const DB={prepare(sql){return{bind(...values){const stmt=sqlite.prepare(sql);return{async first(){return stmt.get(...values)||null;},async run(){return{meta:{changes:Number(stmt.run(...values).changes)}};}};}};}};
globalThis.__geminiTestEnv={DB,GEMINI_API_KEY:process.env.GEMINI_API_KEY.trim()};
const {demoSession}=await import(new URL('planning.mjs',dir)),{mutate}=await import(new URL('actions.mjs',dir)),{digest}=await import(new URL('calendar-server.mjs',dir)),{POST}=await import(new URL('recommendations.mjs',dir));
const s=demoSession();s.members[0].authHash=await digest('fictional-test-token');mutate(s,'you','select',{id:'picnic'});mutate(s,'maya','conflict',{version:s.version,reason:'other',note:'Could we choose an indoor activity in case it rains?',windows:[]});
sqlite.prepare('INSERT INTO sessions VALUES(?,?,?)').run(s.code,JSON.stringify(s),s.revision);
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(...args)=>{const r=await nativeFetch(...args);if(!r.ok){const error=await r.clone().json().catch(()=>({}));console.log(JSON.stringify({providerHttpStatus:r.status,providerStatus:error.error?.status,message:typeof error.error?.message==='string'?error.error.message.replaceAll(process.env.GEMINI_API_KEY,'[redacted]'):undefined,reasons:error.error?.details?.map(d=>d.reason).filter(Boolean)}));}return r;};
const response=await POST(new Request('https://example.test/api/recommendations',{method:'POST',headers:{Authorization:'Bearer fictional-test-token',Origin:'https://example.test'},body:JSON.stringify({code:s.code,revision:s.revision,consent:true})}));
const result=await response.json();
if(response.status!==200){console.log(JSON.stringify({status:response.status,error:result.error}));process.exitCode=1;}
else {assert.equal(typeof result.summary,'string');assert.ok(result.summary.length>0);assert.ok(Array.isArray(result.adjustments));console.log(JSON.stringify({status:200,model:'gemini-3.5-flash-lite',schemaValidated:true,summary:result.summary,adjustmentCount:result.adjustments.length}));}
sqlite.close();
