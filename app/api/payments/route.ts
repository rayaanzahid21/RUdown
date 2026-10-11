import {calendarMember,calendarDb,digest,readGroup} from '@/lib/calendar-server';
import {cardEligibility,stripeKey,stripeRequest} from '@/lib/card-payments';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
type Row={id:string;code:string;member:string;version:number;cents:number;stripe_id:string|null;status:string;created:number};
async function readPayment(id:string){return calendarDb().prepare('SELECT * FROM card_checkouts WHERE id=?').bind(id).first<Row>();}
async function inspect(row:Row){
 if(!row.stripe_id)return null;
 const data=await stripeRequest('checkout/sessions/'+encodeURIComponent(row.stripe_id));
 if(data.metadata?.contribution!==row.id||data.amount_total!==row.cents||data.currency!=='usd')throw new Error('Checkout details could not be verified.');
 const paid=data.payment_status==='paid'&&data.status==='complete';
 await calendarDb().prepare('UPDATE card_checkouts SET status=? WHERE id=?').bind(paid?'paid':data.status==='expired'?'expired':'open',row.id).run();
 return {paid,status:paid?'paid':data.status,url:data.url,version:row.version,cents:row.cents};
}
export async function GET(request:Request){
 let context;try{context=await calendarMember(request,new URL(request.url).searchParams.get('code')||'');}catch{return json({error:'Join this group to view card checkout.'},401);}
 const {s,member}=context,eligibility=cardEligibility(s,member.id);
 if(!stripeKey())return json({configured:false,testMode:true,...eligibility});
 try{
  const row=await calendarDb().prepare('SELECT * FROM card_checkouts WHERE code=? AND member=? ORDER BY created DESC LIMIT 1').bind(s.code,member.id).first<Row>();
  const receipt=row?await inspect(row):null;
  return json({configured:true,testMode:true,...eligibility,receipt});
 }catch{return json({error:'Could not verify your test checkout. Refresh before trying again.'},502);}
}
export async function POST(request:Request){
 const origin=new URL(request.url).origin;
 if(request.headers.get('Origin')!==origin)return json({error:'Invalid request origin.'},403);
 let body:any;try{const raw=await request.text();if(raw.length>2048)throw new Error();body=JSON.parse(raw);}catch{return json({error:'Invalid checkout request.'},400);}
 let context;try{context=await calendarMember(request,String(body.code||''));}catch{return json({error:'Join this group before checkout.'},401);}
 const {s,member}=context;
 if(!stripeKey())return json({error:'Credit-card checkout needs Stripe setup. No payment was taken.'},503);
 if(body.version!==s.version)return json({error:'The plan changed. Review it before checkout.'},409);
 const {cents,issues}=cardEligibility(s,member.id);if(issues.length)return json({error:issues[0]},400);
 try{
  // One contribution per member and plan, including concurrent clicks.
  const id=await digest(`stripe-test:${s.code}:${member.id}:${s.version}`),db=calendarDb();
  // Any older contribution must be reviewed before another test contribution.
  const previous=await db.prepare('SELECT * FROM card_checkouts WHERE code=? AND member=? AND id<>? ORDER BY created DESC LIMIT 1').bind(s.code,member.id,id).first<Row>();
  if(previous){if(!previous.stripe_id)return json({error:'An earlier checkout attempt needs review before another contribution. Ask the app owner to check Stripe.'},409);const prior=await inspect(previous);if(prior?.paid)return json({error:'You already made a test contribution for an earlier plan. Review it in Stripe; this app does not automatically refund changed plans.'},409);if(prior?.status==='open')await stripeRequest('checkout/sessions/'+previous.stripe_id+'/expire',new URLSearchParams());}
  await db.prepare("INSERT INTO card_checkouts(id,code,member,version,cents,stripe_id,status,created) VALUES(?,?,?,?,?,NULL,'pending',?) ON CONFLICT(id) DO NOTHING").bind(id,s.code,member.id,s.version,cents,Date.now()).run();
  const row=(await readPayment(id))!;
  if(row.cents!==cents)return json({error:'Contribution amount changed. Review the plan.'},409);
  if(row.stripe_id){const existing=await inspect(row);if(existing?.paid)return json({paid:true});if(existing?.status==='expired')return json({error:'This test checkout expired. Adjust and reapprove the plan to start a new checkout.'},409);if(existing?.url)return json({url:existing.url});}
  if(row.created<Date.now()-23*3600000)return json({error:'This checkout attempt expired. Adjust and reapprove the plan before retrying.'},409);
  const fields=new URLSearchParams({mode:'payment','payment_method_types[0]':'card','line_items[0][price_data][currency]':'usd','line_items[0][price_data][unit_amount]':String(cents),'line_items[0][price_data][product_data][name]':`RUdown test contribution · plan v${s.version}`,'line_items[0][quantity]':'1','metadata[contribution]':id,success_url:origin+'/?checkout=returned',cancel_url:origin+'/?checkout=cancelled','custom_text[submit][message]':'Test contribution only. This does not book an outing, pay a venue, or fund Solana escrow.'});
  const data=await stripeRequest('checkout/sessions',fields,id);
  if(!data.id?.startsWith('cs_test_')||typeof data.url!=='string'||new URL(data.url).hostname!=='checkout.stripe.com')throw new Error();
  await db.prepare('UPDATE card_checkouts SET stripe_id=?,status=? WHERE id=?').bind(data.id,'open',id).run();
  const fresh=await readGroup(s.code);
  if(fresh.version!==s.version||cardEligibility(fresh,member.id).issues.length){await stripeRequest('checkout/sessions/'+data.id+'/expire',new URLSearchParams());return json({error:'The plan changed during checkout. Review the updated plan.'},409);}
  return json({url:data.url});
 }catch{return json({error:'Could not open test checkout. Your app has not confirmed a payment; refresh to check status before retrying.'},502);}
}
