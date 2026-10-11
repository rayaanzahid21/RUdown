import {PublicKey,Transaction,SystemProgram,TransactionInstruction} from '@solana/web3.js';
import {approvalStatus,shares,type Session} from './planning';
export const DEVNET_RPC='https://solana-devnet.api.onfinality.io/public';
let networkChecked:Promise<void>|undefined;
export const MEMO_PROGRAM='MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
export function walletAddress(value:unknown):string{if(typeof value!=='string')throw new Error('Connect a Solana wallet.');const p=new PublicKey(value);if(!PublicKey.isOnCurve(p.toBytes()))throw new Error('Use a normal wallet address.');return p.toBase58();}
async function requestRpc(method:string,params:unknown[]){const r=await fetch(DEVNET_RPC,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error('Devnet RPC returned HTTP '+r.status+'. Retry verification before sending again.');const d=await r.json() as any;if(d.error)throw new Error('Devnet RPC '+method+' failed ('+d.error.code+'). Retry without signing another payment.');return d.result;}
export async function solanaRpc(method:string,params:unknown[]){networkChecked??=requestRpc('getGenesisHash',[]).then(hash=>{if(hash!=='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG')throw new Error('RPC network is not Solana Devnet.');}).catch(e=>{networkChecked=undefined;throw e;});await networkChecked;return requestRpc(method,params);}
export function solanaEligibility(s:Session,id:string){const cents=shares(s.expenses,s.members)[id]||0,issues:string[]=[];if(!s.selected)issues.push('Select a plan.');if(!s.schedule)issues.push('Set the outing date and time.');if(!s.solanaRecipient)issues.push('The organizer must set a receiving wallet.');if(!s.members.some(m=>m.id===id&&m.attending!==false))issues.push('Only attending members can contribute.');if(!approvalStatus(s).length||approvalStatus(s).some(a=>!a.approved))issues.push('Everyone must approve this exact plan.');if(Date.parse(s.deadline)<Date.now())issues.push('The planning deadline has passed.');if(cents<=0)issues.push('Your share is zero; no contribution is needed.');return {cents,lamports:cents*1000,issues};}
export type SolanaIntent={id:string;code:string;member:string;version:number;cents:number;lamports:number;sender:string;recipient:string;memo:string;signature:string|null;transaction_data?:string|null;last_valid_height?:number|null;created:number};
export function unsignedPayment(i:SolanaIntent,blockhash:string){const tx=new Transaction({feePayer:new PublicKey(i.sender),recentBlockhash:blockhash});tx.add(SystemProgram.transfer({fromPubkey:new PublicKey(i.sender),toPubkey:new PublicKey(i.recipient),lamports:i.lamports}),new TransactionInstruction({programId:new PublicKey(MEMO_PROGRAM),keys:[],data:Buffer.from(i.memo)}));return tx.serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64');}
export function verifyPayment(tx:any,i:SolanaIntent,signature:string){
 if(!tx||tx.meta?.err!==null||!tx.transaction?.signatures?.includes(signature))throw new Error('Transaction is not successfully confirmed yet. Retry verification.');
 const m=tx.transaction.message;
 if(!m.accountKeys?.some((k:any)=>k.pubkey===i.sender&&k.signer))throw new Error('The expected wallet did not sign.');
 const instructions=m.instructions||[];
 const transfers=instructions.filter((x:any)=>x.programId==='11111111111111111111111111111111'&&x.parsed?.type==='transfer');
 if(transfers.length!==1||transfers[0].parsed.info.source!==i.sender||transfers[0].parsed.info.destination!==i.recipient||transfers[0].parsed.info.lamports!==i.lamports)throw new Error('Transfer does not match this contribution.');
 if(!instructions.some((x:any)=>x.programId===MEMO_PROGRAM&&x.parsed===i.memo))throw new Error('Transaction does not identify this plan contribution.');
 if(!Number.isFinite(tx.blockTime)||tx.blockTime*1000<i.created-60000)throw new Error('Transaction predates this contribution.');
}
