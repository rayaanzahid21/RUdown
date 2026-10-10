import { type Session, type Member, type Expense, catalog, categories, slots, initialMember, invalidate, expensesFor, shares, recommendation, rideOptions } from './planning';
export class InputError extends Error {}
export function textValue(v:unknown,label:string,max=100):string { if(typeof v!=='string'||!v.trim()||v.length>max)throw new InputError(`${label} is required (up to ${max} characters).`);return v.trim(); }
export function integer(v:unknown,label:string,min:number,max:number):number { if(!Number.isSafeInteger(v)||Number(v)<min||Number(v)>max)throw new InputError(`${label} must be between ${min} and ${max}.`);return Number(v); }
export function mutate(s:Session,memberId:string,action:string,p:any):Session {
 const me=s.members.find(m=>m.id===memberId);if(!me)throw new InputError('Join this group first.');
 if(Date.parse(s.deadline)<Date.now())throw new InputError('The planning deadline has passed. Create a new group to continue planning.');
 const owner=()=>{if(s.owner!==memberId)throw new InputError('Only the group organizer can change the final plan.');};
 if(action==='preferences') {
  const loc=p.location;if(!loc||!Number.isFinite(loc.lat)||!Number.isFinite(loc.lng)||Math.abs(loc.lat)>90||Math.abs(loc.lng)>180)throw new InputError('Select a valid location from search results.');
  const validList=(v:any,allowed:string[])=>Array.isArray(v)&&v.length>0&&v.every(x=>allowed.includes(x));
  if(!validList(p.categories,categories)||!validList(p.availability,slots))throw new InputError('Choose at least one category and availability window.');
  if(!['own','offer','need'].includes(p.ride))throw new InputError('Choose a ride preference.');
  const safe:Partial<Member>={name:textValue(p.name,'Display name',40),location:{label:textValue(loc.label,'Location',200),lat:loc.lat,lng:loc.lng},budget:integer(p.budget,'Budget in cents',0,10000000),miles:integer(p.miles,'Travel limit',1,3000),categories:[...new Set(p.categories)] as string[],availability:[...new Set(p.availability)] as string[],dietary:typeof p.dietary==='string'?p.dietary.slice(0,250):'',accessibility:typeof p.accessibility==='string'?p.accessibility.slice(0,250):'',ride:p.ride,seats:p.ride==='offer'?integer(p.seats,'Passenger seats',1,8):0,ready:true};
  Object.assign(me,safe);invalidate(s);
 } else if(action==='schedule') {
  owner();
  const start=Date.parse(p.start),end=Date.parse(p.end);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<Date.now()||end<=start||end-start>14*86400000)throw new InputError('Choose a future start and an end within 14 days after it.');
  const timeZone=textValue(p.timeZone,'Time zone',80);
  try{new Intl.DateTimeFormat('en-US',{timeZone}).format();}catch{throw new InputError('Choose a valid time zone.');}
  s.schedule={start:new Date(start).toISOString(),end:new Date(end).toISOString(),timeZone};invalidate(s);
 } else if(action==='select') {
  owner(); const a=catalog.find(a=>a.id===p.id&&a.type===s.type);if(!a)throw new InputError('Choose a plan for this trip type.');s.selected=a.id;s.expenses=expensesFor(a,s.members);invalidate(s);
 } else if(action==='expense') {
  owner();if(!s.selected)throw new InputError('Select a plan first.');
  if(!Array.isArray(p.members)||!p.members.length||p.members.some((id:any)=>!s.members.some(m=>m.id===id)))throw new InputError('Select the participants sharing this expense.');
  if(!['person','group'].includes(p.basis))throw new InputError('Choose how to split this expense.');
  if(s.expenses.length>=50&&!p.id)throw new InputError('This demo supports 50 expenses per plan.');
  const expense:Expense={id:p.id||crypto.randomUUID(),name:textValue(p.name,'Expense name',80),cents:integer(p.cents,'Amount in cents',0,10000000),basis:p.basis,members:[...new Set(p.members)] as string[]};
  const i=s.expenses.findIndex(e=>e.id===expense.id);if(i<0)s.expenses.push(expense);else s.expenses[i]=expense;invalidate(s);
 } else if(action==='removeExpense') {owner();s.expenses=s.expenses.filter(e=>e.id!==p.id);invalidate(s);
 } else if(action==='idea') {if(s.ideas.length>=50)throw new InputError('This group already has 50 ideas.');s.ideas.push({id:crypto.randomUUID(),name:textValue(p.name,'Idea',100),description:typeof p.description==='string'?p.description.slice(0,400):'',author:me.id,votes:{[me.id]:true}});
 } else if(action==='vote') {const idea=s.ideas.find(i=>i.id===p.id);if(!idea)throw new InputError('Idea not found.');idea.votes[me.id]=!idea.votes[me.id];
 } else if(action==='approve') {
  if(!s.selected||p.version!==s.version)throw new InputError('The plan changed. Review it again before approving.');
  if(s.members.some(m=>!m.ready))throw new InputError('Everyone must finish their preferences before final approval.');
  const cents=shares(s.expenses,s.members)[me.id];if(cents>me.budget)throw new InputError('This plan exceeds your budget. Change your own budget or ask the organizer to adjust costs.');
  const a=catalog.find(a=>a.id===s.selected)!;const result=recommendation(a,s.members);const t=result.travel.find(t=>t.id===me.id)!;
  if(t.extra>0)throw new InputError('This plan exceeds your travel limit. Update your own limit before approving.');
  if(!p.acknowledge&&result.issues.length)throw new InputError('Acknowledge the listed requirements before approving.');
  s.approvals[me.id]={version:s.version,cents};
 } else if(action==='revoke') {delete s.approvals[me.id];
 } else if(action==='ride') {
  if(p.version!==s.version)throw new InputError('The plan changed. Review carpool options again.');
  if(me.id!==p.driver&&me.id!==p.rider)throw new InputError('Only the driver or rider can accept this carpool.');
  if(!rideOptions(s).some(x=>x.driver.id===p.driver&&x.rider.id===p.rider))throw new InputError('This carpool is no longer available.');
  let ride=s.rides.find(r=>r.driver===p.driver&&r.rider===p.rider&&r.version===s.version);
  if(!ride){ride={driver:p.driver,rider:p.rider,version:s.version,driverAccepted:false,riderAccepted:false};s.rides.push(ride);}
  if(me.id===ride.driver)ride.driverAccepted=!ride.driverAccepted;else ride.riderAccepted=!ride.riderAccepted;
  if(ride.driverAccepted&&ride.riderAccepted) {const driver=s.members.find(m=>m.id===ride!.driver)!;const confirmed=s.rides.filter(r=>r.version===s.version&&r.driverAccepted&&r.riderAccepted);if(confirmed.filter(r=>r.driver===driver.id).length>driver.seats)throw new InputError('This driver has no remaining seats.');if(confirmed.filter(r=>r.rider===ride!.rider).length>1)throw new InputError('This rider already accepted another carpool.');}
 } else {throw new InputError('Unknown action.');}
 return s;
}
