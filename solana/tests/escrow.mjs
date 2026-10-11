// Run with `anchor test` after building and syncing a LOCAL program identity.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import anchor from '@coral-xyz/anchor';
const {AnchorProvider,Program,BN,web3}=anchor;
const provider=AnchorProvider.env();anchor.setProvider(provider);
if(!/localhost|127\.0\.0\.1/.test(provider.connection.rpcEndpoint))throw new Error('These tests must use a local validator, never mainnet.');
const program=new Program(JSON.parse(readFileSync(new URL('../target/idl/rudown_escrow.json',import.meta.url),'utf8')),provider);
const organizer=provider.wallet.publicKey,recipient=web3.Keypair.generate(),alice=web3.Keypair.generate(),bob=web3.Keypair.generate(),stranger=web3.Keypair.generate();
const fund=async key=>{const signature=await provider.connection.requestAirdrop(key,web3.LAMPORTS_PER_SOL);await provider.connection.confirmTransaction(signature,'confirmed');};
const create=async()=>{
 const nonce=[...randomBytes(32)],hash=[...randomBytes(32)],deadline=new BN(Math.floor(Date.now()/1000)+600);
 const [escrow]=web3.PublicKey.findProgramAddressSync([Buffer.from('escrow'),organizer.toBuffer(),Buffer.from(nonce)],program.programId);
 await program.methods.initialize(nonce,hash,deadline,[alice.publicKey,bob.publicKey],[new BN(1000000),new BN(2000000)]).accounts({organizer,recipient:recipient.publicKey,escrow,systemProgram:web3.SystemProgram.programId}).rpc();
 return {escrow,hash};
};
const deposit=({escrow,hash},person)=>program.methods.deposit(hash).accounts({escrow,payer:person.publicKey,systemProgram:web3.SystemProgram.programId}).signers([person]).rpc();
const act=(name,{escrow,hash},person)=>program.methods[name](hash).accounts({escrow,member:person.publicKey}).signers([person]).rpc();
const release=({escrow,hash},target=recipient.publicKey)=>program.methods.release(hash).accounts({escrow,organizer,recipient:target}).rpc();
test('Devnet prototype local-validator lifecycle and authorization',async()=>{
 await Promise.all([alice,bob,stranger,recipient].map(p=>fund(p.publicKey)));
 const a=await create();
 await assert.rejects(()=>deposit(a,stranger));
 await assert.rejects(()=>act('approve',a,alice));
 await assert.rejects(()=>deposit({...a,hash:[...randomBytes(32)]},alice));
 await deposit(a,alice);await assert.rejects(()=>deposit(a,alice));await act('approve',a,alice);
 await assert.rejects(()=>release(a));await deposit(a,bob);await assert.rejects(()=>release(a));await act('approve',a,bob);
 await assert.rejects(()=>release(a,stranger.publicKey));
 const before=await provider.connection.getBalance(recipient.publicKey);await release(a);assert.equal(await provider.connection.getBalance(recipient.publicKey)-before,3000000);
 await assert.rejects(()=>release(a));await assert.rejects(()=>act('refund',a,alice));
 const b=await create();await deposit(b,alice);await deposit(b,bob);await act('approve',b,alice);await act('approve',b,bob);
 await assert.rejects(()=>act('cancel',b,stranger));await act('cancel',b,bob);await assert.rejects(()=>release(b));
 await act('refund',b,alice);await assert.rejects(()=>act('refund',b,alice));await act('refund',b,bob);
 const state=await program.account.escrow.fetch(b.escrow);assert.equal(state.state,1);assert.ok(state.entries.every(e=>e.deposited.eq(new BN(0))));
 const c=await create();await deposit(c,alice);await act('refund',c,alice);await assert.rejects(()=>deposit(c,bob));
});
