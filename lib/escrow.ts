import {approvalStatus,attending,shares,type Session} from './planning';
export function escrowPreview(s:Session) {
 const members=attending(s.members),totals=shares(s.expenses,s.members),approved=approvalStatus(s);
 const issues:string[]=[];
 if(!s.selected)issues.push('Choose a plan first.');
 if(!s.schedule)issues.push('Save the outing date and time.');
 if(Date.parse(s.deadline)<=Date.now())issues.push('The planning deadline has passed.');
 if(!members.length||approved.some(a=>!a.approved))issues.push('Every attending member must approve the current plan.');
 const participants=members.map(m=>({memberId:m.id,name:m.name,estimatedUsdCents:totals[m.id],testLamports:1000000,approved:approved.find(a=>a.member.id===m.id)?.approved===true}));
 return {network:'devnet' as const,mode:'preview' as const,depositsEnabled:false as const,version:s.version,issues,participants,totalTestLamports:participants.length*1000000,notice:'Each person uses 0.001 test SOL for this demonstration, independently of their estimated USD share. This is not an exchange rate, deposit request, or payment.'};
}
export function escrowCommitmentInput(s:Session) {
 const preview=escrowPreview(s);
 return JSON.stringify({schema:'rudown-plan-v1',code:s.code,version:s.version,activity:s.selected,schedule:s.schedule||null,participants:preview.participants.map(p=>({memberId:p.memberId,estimatedUsdCents:p.estimatedUsdCents,testLamports:p.testLamports})).sort((a,b)=>a.memberId.localeCompare(b.memberId))});
}
