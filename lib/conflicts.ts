import { attending, catalog, money, recommendation, rideOptions, type Session } from './planning';

export const reasons = {time:'The time doesn’t work',budget:'It costs too much',distance:'It’s too far away',transport:'I need transportation',activity:'This activity isn’t for me',other:'Something else'} as const;

// All prices and constraint checks stay deterministic. AI may explain these
// results, but cannot alter costs, attendance, approvals, or the saved plan.
export function rebuildSuggestions(s:Session,now=Date.now()) {
 const members=attending(s.members);
 const responses=members.flatMap(m=>s.conflicts?.[m.id]?[{member:m,...s.conflicts[m.id]}]:[]);
 const options=catalog.filter(a=>a.type===s.type).map(a=>{
  const r=recommendation(a,members);
  const blockers=[...r.issues,...r.travel.flatMap(t=>[...(t.over?[`${t.name} is ${money(t.over)} over budget.`]:[]),...(t.extra?[`${t.name} is ${t.extra.toFixed(1)} miles over their travel limit.`]:[])])];
  return {id:a.id,name:a.name,costs:r.costs,matched:r.matched,common:r.common,blockers,score:r.score,withinLimits:!blockers.length,current:a.id===s.selected};
 }).sort((a,b)=>Number(b.withinLimits)-Number(a.withinLimits)||b.score-a.score);
 const supplied=members.filter(m=>(s.conflicts?.[m.id]?.windows.length||0)>0);
 let overlaps:{start:number;end:number}[]=[];
 for(const [index,m] of supplied.entries()) {
  const windows=s.conflicts![m.id].windows.map(w=>({start:Math.max(now,Date.parse(w.start)),end:Date.parse(w.end)})).filter(w=>w.end>w.start);
  overlaps=index===0?windows:overlaps.flatMap(a=>windows.map(b=>({start:Math.max(a.start,b.start),end:Math.min(a.end,b.end)}))).filter(w=>w.end>w.start);
 }
 const duration=s.schedule?Date.parse(s.schedule.end)-Date.parse(s.schedule.start):3600000;
 const times=overlaps.filter(w=>w.end-w.start>=duration).sort((a,b)=>a.start-b.start).filter((w,i,all)=>all.findIndex(x=>x.start===w.start&&x.end===w.end)===i).slice(0,3).map(w=>({start:new Date(w.start).toISOString(),end:new Date(w.start+duration).toISOString()}));
 const missing=members.filter(m=>!supplied.some(x=>x.id===m.id)).map(m=>m.name);
 const advice:string[]=[];
 if(responses.some(r=>r.reason==='time'))advice.push(supplied.length&&!times.length?'The submitted availability has no overlap long enough for this trip. Ask for more dates.':missing.length?`Ask ${missing.join(', ')} to add exact availability before agreeing on a new time.`:'The proposed times fit submitted windows; everyone still needs to confirm the date and venue hours.');
 if(responses.some(r=>r.reason==='budget'))advice.push('Budgets have been updated. Choose an affordable option or edit optional expenses; everyone must approve their new share.');
 if(responses.some(r=>r.reason==='transport'))advice.push(rideOptions(s).length?'Review the carpool suggestions below. Both the driver and rider must accept.':'No eligible carpool match is available. Ask someone to offer a ride or choose a closer activity.');
 if(responses.some(r=>r.reason==='activity'||r.reason==='distance'))advice.push('Compare the alternate activities and travel limits below. A preference match does not resolve a person’s concern automatically.');
 if(responses.some(r=>r.reason==='other'))advice.push('Read the written responses together. Calculated suggestions cannot interpret free-text concerns; connected AI can help propose adjustments.');
 return {options,times,missing,advice,responses:responses.map(r=>({memberId:r.member.id,name:r.member.name,reason:r.reason,note:r.note})),allAvailabilityKnown:supplied.length===members.length&&members.length>0};
}

export function aiPlanningInput(s:Session) {
 const result=rebuildSuggestions(s),members=attending(s.members);
 // Pseudonyms, no group name, invite code, auth hashes, locations or calendar data.
 const label=(id:string)=>`Person ${members.findIndex(m=>m.id===id)+1}`;
 return {
  people:members.map(m=>({person:label(m.id),budgetCents:m.budget,preferences:m.categories})),
  feedback:result.responses.map(r=>({person:label(r.memberId),reason:r.reason,note:r.note})),
  options:result.options.map(o=>({id:o.id,name:o.name,withinLimits:o.withinLimits,matched:o.matched,costs:members.map(m=>({person:label(m.id),cents:o.costs[m.id]})),unresolvedConstraintCount:o.blockers.length})),
  candidateTimes:result.times,allAvailabilityKnown:result.allAvailabilityKnown,
  missingAvailability:result.missing.length,
 };
}
