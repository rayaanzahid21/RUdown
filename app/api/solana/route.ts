import {calendarDb,calendarMember,digest,readGroup} from '@/lib/calendar-server';
import {env} from 'cloudflare:workers';
import {Transaction} from '@solana/web3.js';
import {solanaRpc,solanaEligibility,walletAddress,unsignedPayment,verifyPayment,type SolanaIntent} from '@/lib/solana-payments';
export const dynamic='force-dynamic';
const rpc=(method:string,params:unknown[])=>solanaRpc(method,params,(env as unknown as Record<string,string>).SOLANA_DEVNET_RPC_URL||undefined);
const reply=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}});
async function intent(id:string){return calendarDb().prepare('SELECT * FROM solana_contributions WHERE id=?').bind(id).first<SolanaIntent>();}
export async function GET(request:Request){try{const {s,member}=await calendarMember(request,new URL(request.url).searchParams.get('code')||'');const rows=await calendarDb().prepare('SELECT member,version,cents,lamports,signature,recipient FROM solana_contributions WHERE code=? AND signature IS NOT NULL ORDER BY created DESC').bind(s.code).all();return reply({...solanaEligibility(s,member.id),recipient:s.solanaRecipient,receipts:rows.results,network:'devnet'});}catch{return reply({error:'Could not load contributions. Join the group and retry.'},503);}}
export async function POST(request:Request){
 if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'Invalid request origin.'},403);
 try{const raw=await request.text();if(raw.length>2500)return reply({error:'Request too large.'},413);const p=JSON.parse(raw);const {s,member}=await calendarMember(request,p.code);
  if(p.action==='prepare'){
   const eligible=solanaEligibility(s,member.id);if(s.version!==p.version)return reply({error:'The plan changed. Review it first.'},409);if(eligible.issues.length)return reply({error:eligible.issues[0]},400);
   const sender=walletAddress(p.sender),recipient=walletAddress(s.solanaRecipient);if(sender===recipient)return reply({error:'Use a different contributor wallet from the receiving wallet. A self-transfer is not a contribution.'},400);
   const id=await digest('rudown-devnet:'+s.code+':'+member.id+':'+s.version),db=calendarDb();
   const older=await db.prepare('SELECT id FROM solana_contributions WHERE code=? AND member=? AND version<>? AND signature IS NOT NULL LIMIT 1').bind(s.code,member.id,s.version).first();if(older)return reply({error:'An earlier plan already has your contribution. Resolve that transfer with the recipient before paying again; no automatic refunds are available.'},409);
   const memo='RUdown Devnet '+id;
   await db.prepare('INSERT INTO solana_contributions(id,code,member,version,cents,lamports,sender,recipient,memo,created) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,s.code,member.id,s.version,eligible.cents,eligible.lamports,sender,recipient,memo,Date.now()).run();
   const i=(await intent(id))!;if(i.signature)return reply({paid:true,signature:i.signature});if(i.sender!==sender||i.recipient!==recipient||i.cents!==eligible.cents)return reply({error:'This contribution belongs to another wallet or plan. Reconnect the original wallet.'},409);
   const {value}=await rpc('getLatestBlockhash',[{commitment:'confirmed'}]);const fresh=await readGroup(s.code);if(fresh.version!==s.version||solanaEligibility(fresh,member.id).issues.length)return reply({error:'The group changed. Review before signing.'},409);
   await db.prepare('UPDATE solana_contributions SET transaction_data=?,last_valid_height=? WHERE id=? AND transaction_data IS NULL').bind(unsignedPayment(i,value.blockhash),value.lastValidBlockHeight,id).run();
   const prepared=(await intent(id))!;
   const height=await rpc('getBlockHeight',[{commitment:'confirmed'}]);if(height>prepared.last_valid_height!)return reply({error:'The unsigned transaction expired. If you sent it, verify its signature. Otherwise revise and reapprove the plan before another attempt.'},409);
   return reply({id,transaction:prepared.transaction_data,lamports:i.lamports,recipient,memo,network:'devnet'});
  }
  if(p.action==='submit'){
   const i=typeof p.id==='string'?await intent(p.id):null;
   if(!i||i.code!==s.code||i.member!==member.id||!i.transaction_data)return reply({error:'Contribution not found.'},404);
   if(i.signature)return reply({signature:i.signature,paid:true});
   if(i.version!==s.version||solanaEligibility(s,member.id).issues.length)return reply({error:'The plan changed. Do not send this transaction.'},409);
   if(typeof p.transaction!=='string'||p.transaction.length>1800)return reply({error:'Invalid signed transaction.'},400);
   const signed=Transaction.from(Buffer.from(p.transaction,'base64')),prepared=Transaction.from(Buffer.from(i.transaction_data,'base64'));
   if(!signed.verifySignatures()||!signed.serializeMessage().equals(prepared.serializeMessage()))return reply({error:'Signed transaction does not match the approved contribution.'},400);
   const signature=await rpc('sendTransaction',[signed.serialize().toString('base64'),{encoding:'base64',preflightCommitment:'confirmed'}]);
   return reply({signature});
  }
  if(p.action==='verify'){
   const i=typeof p.id==='string'?await intent(p.id):null;if(!i||i.code!==s.code||i.member!==member.id)return reply({error:'Contribution not found.'},404);
   if(typeof p.signature!=='string'||! /^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(p.signature))return reply({error:'Invalid transaction signature.'},400);
   if(i.signature&&i.signature!==p.signature)return reply({error:'This contribution already has a receipt. Do not send again.'},409);
   const tx=await rpc('getTransaction',[p.signature,{commitment:'confirmed',encoding:'jsonParsed',maxSupportedTransactionVersion:0}]);verifyPayment(tx,i,p.signature);
   await calendarDb().prepare('UPDATE solana_contributions SET signature=? WHERE id=? AND (signature IS NULL OR signature=?)').bind(p.signature,i.id,p.signature).run();
   return reply({verified:true,signature:p.signature,version:i.version,currentPlan:i.version===s.version,notice:'Devnet test transfer verified. Not escrow, a USD payment, or a venue booking.'});
  }
  return reply({error:'Unknown contribution action.'},400);
 }catch(e){return reply({error:e instanceof Error?e.message:'Contribution failed.'},400);}
}
