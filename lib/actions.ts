import {groupActivities} from './nearby';
import { type Activity, type Session, type Member, type Expense, type Conflict, attending, selectedActivity, refreshPublishedExpenses, categories, slots, initialMember, invalidate, expensesFor, shares, recommendation, rideOptions } from './planning';
export class InputError extends Error {}
export function textValue(v:unknown,label:string,max=100):string { if(typeof v!=='string'||!v.trim()||v.length>max)throw new InputError(`${label} is required (up to ${max} characters).`);return v.trim(); }
export function integer(v:unknown,label:string,min:number,max:number):number { if(!Number.isSafeInteger(v)||Number(v)<min||Number(v)>max)throw new InputError(`${label} must be between ${min} and ${max}.`);return Number(v); }
export function mutate(s:Session,memberId:string,action:string,p:any,trustedActivity?:Activity):Session {
 const me=s.members.find(m=>m.id===memberId);if(!me)throw new InputError('Join this group first.');
 if(!['reset','leave','transferOwner'].includes(action)&&Date.parse(s.deadline)<Date.now())throw new InputError('The planning deadline has passed. Create a new group to continue planning.');
 const owner=()=>{if(s.owner!==memberId)throw new InputError('Only the group organizer can change the final plan.');};
 if(action==='reset'){
  owner();if(p.confirm!==s.code)throw new InputError('Type the group code to confirm the reset.');
  const deadline=Date.parse(p.deadline);if(!Number.isFinite(deadline)||deadline<Date.now()+60000||deadline>Date.now()+90*86400000)throw new InputError('Choose a new planning deadline within 90 days.');
  s.deadline=new Date(deadline).toISOString();s.selected=null;delete s.selectedActivity;delete s.selectedExternal;delete s.schedule;s.expenses=[];s.conflicts={};invalidate(s);
 } else if(action==='leave'){
  if(s.owner===memberId)throw new InputError('Transfer organizer responsibility before leaving.');
  me.attending=false;delete me.authHash;if(s.conflicts)delete s.conflicts[me.id];invalidate(s);
 } else if(action==='transferOwner'){
  owner();if(!s.members.some(m=>m.id===p.memberId&&m.attending!==false&&m.id!==me.id&&m.authHash))throw new InputError('Choose another active member.');s.owner=p.memberId;invalidate(s);
 } else if(action==='recipient'){
  owner();if(typeof p.address!=='string'||! /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.address))throw new InputError('Enter a Solana receiving address.');s.solanaRecipient=p.address;invalidate(s);
 } else if(action==='travelEstimate'){
  if(!s.selected)throw new InputError('Select a plan first.');
  if(!['walk','bicycle','rutgers','bus','train','car','rideshare'].includes(p.mode))throw new InputError('Choose your transport mode.');
  me.travelEstimates||={};me.travelEstimates[s.selected]={mode:p.mode,minutes:integer(p.minutes,'One-way travel minutes',0,1440),roundTripCents:integer(p.roundTripCents,'Round-trip fare in cents',0,10000000)};me.maxTravelMinutes=integer(p.maxMinutes,'Maximum one-way minutes',1,1440);refreshPublishedExpenses(s);invalidate(s);
 } else if(action==='conflict') {
  if(me.attending===false)throw new InputError('Rejoin this trip before giving plan feedback.');
  if(!s.selected||p.version!==s.version)throw new InputError('The plan changed. Review it and send your response again.');
  if(!['time','budget','distance','transport','activity','other'].includes(p.reason))throw new InputError('Choose a reason.');
  const note=typeof p.note==='string'?p.note.trim():'';
  if(note.length>600)throw new InputError('Keep your response under 600 characters.');
  if(p.reason==='other'&&!note)throw new InputError('Tell the group what would help.');
  if(!Array.isArray(p.windows)||p.windows.length>3)throw new InputError('Add up to three availability windows.');
  const windows=p.windows.map((w:any)=>{const start=Date.parse(w?.start),end=Date.parse(w?.end);if(!Number.isFinite(start)||!Number.isFinite(end)||start<Date.now()||end<=start||end-start>14*86400000)throw new InputError('Availability must start in the future and end within 14 days.');return {start:new Date(start).toISOString(),end:new Date(end).toISOString()};});
  const budget=p.reason==='budget'?integer(p.budget,'Budget in cents',0,10000000):me.budget;
  me.budget=budget;invalidate(s);
  s.conflicts ||= {};s.conflicts[me.id]={reason:p.reason as Conflict['reason'],note,windows,version:s.version};
 } else if(action==='resolveConflict') {
  if(!s.conflicts?.[me.id])throw new InputError('You have no open response.');
  delete s.conflicts[me.id];invalidate(s);
 } else if(action==='participation') {
  if(typeof p.attending!=='boolean')throw new InputError('Choose whether you are joining this trip.');
  if(p.attending===false&&attending(s.members).length===1&&me.attending!==false)throw new InputError('At least one person must stay in the trip.');
  if((me.attending!==false)===p.attending)throw new InputError('Your attendance is already saved.');
  me.attending=p.attending;
  if(s.conflicts)delete s.conflicts[me.id];
  // Retain expense membership on withdrawal, so rejoining restores the same split.
  // Plans selected while absent did not include this person and need review first.
  if(p.attending){s.selected=null;s.expenses=[];}
  invalidate(s);
 } else if(action==='preferences') {
  const loc=p.location;if(!loc||!Number.isFinite(loc.lat)||!Number.isFinite(loc.lng)||Math.abs(loc.lat)>90||Math.abs(loc.lng)>180)throw new InputError('Select a valid location from search results.');
  const validList=(v:any,allowed:string[])=>Array.isArray(v)&&v.length>0&&v.every(x=>allowed.includes(x));
  if(!validList(p.categories,categories)||!validList(p.availability,slots))throw new InputError('Choose at least one category and availability window.');
  if(!['own','offer','need'].includes(p.ride))throw new InputError('Choose a ride preference.');
  let localTravel=me.localTravel;
  if(p.localTravel!==undefined){if(!p.localTravel||!['rutgers','walk','custom'].includes(p.localTravel.mode))throw new InputError('Choose a valid transport mode.');const cents=integer(p.localTravel.roundTripCents,'Round-trip transport',0,10000000);if(p.localTravel.mode!=='custom'&&cents!==0)throw new InputError('Walking and Rutgers bus fares must be zero.');localTravel={mode:p.localTravel.mode,roundTripCents:cents};}
  const allowanceCents=p.allowanceCents===undefined?(me.allowanceCents||0):integer(p.allowanceCents,'Optional allowance',0,10000000);
  const safe:Partial<Member>={name:textValue(p.name,'Display name',40),location:{label:textValue(loc.label,'Location',200),lat:loc.lat,lng:loc.lng},budget:integer(p.budget,'Budget in cents',0,10000000),miles:integer(p.miles,'Travel limit',1,3000),categories:[...new Set(p.categories)] as string[],availability:[...new Set(p.availability)] as string[],dietary:typeof p.dietary==='string'?p.dietary.slice(0,250):'',accessibility:typeof p.accessibility==='string'?p.accessibility.slice(0,250):'',ride:p.ride,seats:p.ride==='offer'?integer(p.seats,'Passenger seats',1,8):0,ready:true};
  Object.assign(me,safe,{localTravel,allowanceCents});refreshPublishedExpenses(s);invalidate(s);
 } else if(action==='schedule') {
  owner();
  const start=Date.parse(p.start),end=Date.parse(p.end);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<Date.now()||end<=start||end-start>14*86400000)throw new InputError('Choose a future start and an end within 14 days after it.');
  const timeZone=textValue(p.timeZone,'Time zone',80);
  try{new Intl.DateTimeFormat('en-US',{timeZone}).format();}catch{throw new InputError('Choose a valid time zone.');}
  s.schedule={start:new Date(start).toISOString(),end:new Date(end).toISOString(),timeZone};invalidate(s);
 } else if(action==='select') {
  owner(); const a=(trustedActivity&&trustedActivity.id===p.id&&trustedActivity.type===s.type?trustedActivity:groupActivities(s.members).find(a=>a.id===p.id&&a.type===s.type));if(!a)throw new InputError('Choose a plan for this trip type.');s.selected=a.id;s.selectedExternal=a.googlePlaceId?{placeId:a.googlePlaceId,allowanceCents:a.base[0].cents}:undefined;s.selectedActivity=structuredClone(a);s.expenses=expensesFor(a,s.members);invalidate(s);
 } else if(action==='expense') {
  owner();if(!s.selected)throw new InputError('Select a plan first.');
  if(!Array.isArray(p.members)||!p.members.length||p.members.some((id:any)=>!attending(s.members).some(m=>m.id===id)))throw new InputError('Select the participants sharing this expense.');
  if(!['person','group'].includes(p.basis))throw new InputError('Choose how to split this expense.');
  if(p.id&&s.expenses.some(e=>e.id===p.id&&e.managed))throw new InputError('Update your transport or allowance in preferences. Published admission comes from the venue.');
  if(s.expenses.length>=50&&!p.id)throw new InputError('This demo supports 50 expenses per plan.');
  const expense:Expense={id:p.id||crypto.randomUUID(),name:textValue(p.name,'Expense name',80),cents:integer(p.cents,'Amount in cents',0,10000000),basis:p.basis,members:[...new Set(p.members)] as string[]};
  const i=s.expenses.findIndex(e=>e.id===expense.id);if(i<0)s.expenses.push(expense);else s.expenses[i]=expense;invalidate(s);
 } else if(action==='removeExpense') {owner();if(s.expenses.some(e=>e.id===p.id&&e.managed))throw new InputError('Published costs are managed. Change your preferences or select another plan.');s.expenses=s.expenses.filter(e=>e.id!==p.id);invalidate(s);
 } else if(action==='idea') {if(s.ideas.length>=50)throw new InputError('This group already has 50 ideas.');s.ideas.push({id:crypto.randomUUID(),name:textValue(p.name,'Idea',100),description:typeof p.description==='string'?p.description.slice(0,400):'',author:me.id,votes:{[me.id]:true}});
 } else if(action==='vote') {const idea=s.ideas.find(i=>i.id===p.id);if(!idea)throw new InputError('Idea not found.');idea.votes[me.id]=!idea.votes[me.id];
 } else if(action==='approve') {
  if(me.attending===false)throw new InputError('You are sitting this trip out.');
  if(s.conflicts?.[me.id])throw new InputError('Mark your concern resolved before approving the revised plan.');
  if(!s.selected||p.version!==s.version)throw new InputError('The plan changed. Review it again before approving.');
  if(attending(s.members).some(m=>!m.ready))throw new InputError('Everyone must finish their preferences before final approval.');
  const cents=shares(s.expenses,s.members)[me.id];if(cents>me.budget)throw new InputError('This plan exceeds your budget. Change your own budget or ask the organizer to adjust costs.');
  const a=selectedActivity(s);if(!a)throw new InputError("Select an available plan first.");const result=recommendation(a,s.members);if((a.pricing||a.googlePlaceId)&&result.issues.some(i=>i.startsWith(me.name+': ')))throw new InputError('Confirm your transport choice and estimated cost in preferences before approving.');const t=result.travel.find(t=>t.id===me.id)!;
  if(t.overMinutes>0)throw new InputError('This route exceeds your travel-time limit. Adjust your own estimate or limit first.');
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
