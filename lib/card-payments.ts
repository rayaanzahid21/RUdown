import {env} from 'cloudflare:workers';
import {approvalStatus,shares,type Session} from './planning';
export function stripeKey(){const key=(env as unknown as Record<string,string>).STRIPE_SECRET_KEY||'';return key.startsWith('sk_test_')?key:'';}
export function cardEligibility(s:Session,memberId:string){
 const member=s.members.find(m=>m.id===memberId),cents=shares(s.expenses,s.members)[memberId]||0;
 const issues:string[]=[];
 if(!s.selected)issues.push('Select a plan first.');
 if(!member||member.attending===false)issues.push('Rejoin the trip before contributing.');
 if(!approvalStatus(s).length||approvalStatus(s).some(a=>!a.approved))issues.push('Everyone attending must approve the current plan and their exact share.');
 if(cents<50)issues.push(cents===0?'Your estimated share is $0. No payment is needed.':'Card checkout requires an estimated share of at least $0.50.');
 if(cents>99999999)issues.push('This share exceeds the card checkout limit.');
 if(Date.parse(s.deadline)<=Date.now())issues.push('This planning deadline has passed.');
 return {cents,issues};
}
export async function stripeRequest(path:string,body?:URLSearchParams,idempotency?:string){
 const key=stripeKey();if(!key)throw new Error('Card checkout is not connected yet.');
 const response=await fetch('https://api.stripe.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,'Stripe-Version':'2025-02-24.acacia',...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotency?{'Idempotency-Key':idempotency}:{})},body,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Stripe could not complete this request. Please try again.');
 const data=await response.json() as Record<string,any>;
 if(data.livemode!==false)throw new Error('Only Stripe test-mode checkout is supported.');
 return data;
}
