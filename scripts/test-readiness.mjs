import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
import {Keypair,Transaction} from '@solana/web3.js';
const dir=new URL('../.sites-runtime/readiness-tests/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const n of ['planning','actions','nearby','local-data','schedule-hours','solana-payments']){
 const s=readFileSync(new URL('../lib/'+n+'.ts',import.meta.url),'utf8').replace(/from '\.\/(planning|nearby|local-data)'/g,"from './$1.mjs'");writeFileSync(new URL(n+'.mjs',dir),ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
}
const {demoSession,shares}=await import(new URL('planning.mjs',dir)),{mutate}=await import(new URL('actions.mjs',dir)),{scheduleHours}=await import(new URL('schedule-hours.mjs',dir)),{verifyPayment,unsignedPayment,MEMO_PROGRAM}=await import(new URL('solana-payments.mjs',dir));
const s=demoSession();s.members.forEach(m=>m.authHash='fixture');mutate(s,'you','select',{id:'rutgers-gardens'});mutate(s,'you','travelEstimate',{mode:'bus',minutes:45,roundTripCents:500,maxMinutes:30});assert.equal(shares(s.expenses,s.members).you,1000);assert.throws(()=>mutate(s,'you','approve',{version:s.version,acknowledge:true}),/travel-time/);
assert.throws(()=>mutate(s,'maya','reset',{confirm:s.code,deadline:new Date(Date.now()+86400000).toISOString()}),/organizer/);
mutate(s,'you','reset',{confirm:s.code,deadline:new Date(Date.now()+86400000).toISOString()});assert.equal(s.selected,null);assert.equal(s.members.length,4);assert.deepEqual(s.expenses,[]);
assert.throws(()=>mutate(s,'you','leave',{}),/Transfer/);mutate(s,'you','transferOwner',{memberId:'maya'});mutate(s,'you','leave',{});assert.equal(s.members[0].authHash,undefined);assert.equal(s.members[0].attending,false);
const day=Date.UTC(2026,9,11)/60000,h={checkedAt:'2026-10-11T14:00:00Z',timeZone:'America/New_York',weekdays:[],current:true,intervals:[{start:day+9*60,end:day+17*60},{start:day+20*60,end:day+25*60}]};
const schedule=(start,end)=>({start,end,timeZone:'America/New_York'});
assert.equal(scheduleHours(h,schedule('2026-10-11T14:00:00Z','2026-10-11T20:00:00Z')).state,'open');
assert.equal(scheduleHours(h,schedule('2026-10-11T20:00:00Z','2026-10-11T22:00:00Z')).state,'closed');
assert.equal(scheduleHours(h,schedule('2026-10-12T00:00:00Z','2026-10-12T04:30:00Z')).state,'open');
assert.equal(scheduleHours(h,schedule('2026-10-25T14:00:00Z','2026-10-25T16:00:00Z')).state,'unknown');
assert.equal(scheduleHours(undefined,schedule('2026-10-11T14:00:00Z','2026-10-11T20:00:00Z')).state,'unknown');
const sender=Keypair.generate(),recipient=Keypair.generate();const i={id:'test',code:'QA',member:'member',version:2,cents:1000,lamports:1000000,sender:sender.publicKey.toBase58(),recipient:recipient.publicKey.toBase58(),memo:'RUdown Devnet fixture',signature:null,created:Date.now()};
const serialized=unsignedPayment(i,Keypair.generate().publicKey.toBase58()),tx=Transaction.from(Buffer.from(serialized,'base64'));assert.equal(tx.instructions.length,2);tx.sign(sender);assert.ok(tx.verifySignatures());
const fixture={blockTime:Math.floor(Date.now()/1000),meta:{err:null},transaction:{signatures:['fixture'],message:{accountKeys:[{pubkey:i.sender,signer:true}],instructions:[{programId:'11111111111111111111111111111111',parsed:{type:'transfer',info:{source:i.sender,destination:i.recipient,lamports:i.lamports}}},{programId:MEMO_PROGRAM,parsed:i.memo}]}}};verifyPayment(fixture,i,'fixture');
for(const mutateFixture of [x=>x.meta.err={failed:true},x=>x.transaction.message.instructions[0].parsed.info.lamports++,x=>x.transaction.message.instructions[1].parsed='wrong',x=>x.transaction.message.accountKeys[0].signer=false]){const x=structuredClone(fixture);mutateFixture(x);assert.throws(()=>verifyPayment(x,i,'fixture'));}
console.log('PASS reset/leave/transfer authorization, route-specific costs/time limits, dated hours including overnight, signed transaction construction and receipt tamper rejection');
