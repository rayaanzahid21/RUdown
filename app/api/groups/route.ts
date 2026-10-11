import { env } from 'cloudflare:workers';
import {hydratePlace,resolvePlace,storedSession,validPlaceId} from '@/lib/places-discovery';
import { initialMember, invalidate, type Session } from '@/lib/planning';
import { mutate, textValue, InputError } from '@/lib/actions';
import { syncGroupCalendars } from '@/lib/calendar-server';
export const dynamic='force-dynamic';
const db=()=>env.DB as D1Database;
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const sha=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
function view(s:Session) {return {...s,members:s.members.map(({authHash,...m})=>m)};}
async function get(code:string,hydrate=true) {const row=await db().prepare('SELECT data,revision FROM sessions WHERE code=?').bind(code).first<{data:string;revision:number}>();if(!row)throw new InputError('Group not found. Check your invite code.');const s={...JSON.parse(row.data),revision:row.revision} as Session;return hydrate?hydratePlace(s,(env as unknown as Record<string,string>).GOOGLE_PLACES_API_KEY):s;}
async function authenticate(request:Request,s:Session) {const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token)throw new InputError('Please join this group on this device first.');const hash=await sha(token);const me=s.members.find(m=>m.authHash===hash);if(!me)throw new InputError('Your group access could not be verified. Rejoin with an invite.');return me;}
async function persist(s:Session) {const previous=s.revision;s.revision++;const r=await db().prepare('UPDATE sessions SET data=?,revision=? WHERE code=? AND revision=?').bind(JSON.stringify(storedSession(s)),s.revision,s.code,previous).run();if(!r.meta.changes)return false;return true;}
export async function GET(request:Request) {try {const code=new URL(request.url).searchParams.get('code')?.toUpperCase()||'';const s=await get(code,false);await authenticate(request,s);if(new URL(request.url).searchParams.get('revision')===String(s.revision))return reply({unchanged:true});await hydratePlace(s,(env as unknown as Record<string,string>).GOOGLE_PLACES_API_KEY);return reply({session:view(s)});}catch(e){return reply({error:e instanceof InputError?e.message:'Could not load the group. Please retry.'},e instanceof InputError?400:503);}}
export async function POST(request:Request) {
 try {
  if(request.headers.get('Origin')&&request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'Request origin is not allowed.'},403);
  const raw=await request.text();if(raw.length>30000)return reply({error:'Request too large.'},413);const p=JSON.parse(raw);const action=p.action;
  if(action==='create') {
   const name=textValue(p.name,'Group name',60);const displayName=textValue(p.displayName,'Your name',40);if(!['hangout','day','overnight'].includes(p.type))throw new InputError('Choose a trip type.');
   const deadline=new Date(p.deadline);if(!Number.isFinite(deadline.getTime())||deadline.getTime()<Date.now()+60000||deadline.getTime()>Date.now()+90*86400000)throw new InputError('Choose a deadline between one minute and 90 days from now.');
   const token=crypto.randomUUID()+crypto.randomUUID();const member={...initialMember(crypto.randomUUID(),displayName),authHash:await sha(token)};
   const code=Array.from(crypto.getRandomValues(new Uint8Array(8)),x=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x%32]).join('');
   const s:Session={code,name,type:p.type,deadline:deadline.toISOString(),owner:member.id,members:[member],selected:null,expenses:[],version:1,approvals:{},ideas:[],rides:[],revision:0};
   await db().prepare('INSERT INTO sessions(code,data,revision,created) VALUES(?,?,0,?)').bind(code,JSON.stringify(s),Date.now()).run();return reply({session:view(s),token,memberId:member.id});
  }
  const code=textValue(p.code,'Invite code',12).toUpperCase();const s=await get(code);
  if(action==='join') {
   if(s.members.length>=12)throw new InputError('This demo supports up to 12 people per group.');if(Date.parse(s.deadline)<Date.now())throw new InputError('This group’s planning deadline has passed.');
   const name=textValue(p.displayName,'Your name',40);if(s.members.some(m=>m.name.toLowerCase()===name.toLowerCase()))throw new InputError('That name is already in this group. Use a distinct display name.');
   const token=crypto.randomUUID()+crypto.randomUUID();const m={...initialMember(crypto.randomUUID(),name),authHash:await sha(token)};s.members.push(m);invalidate(s);s.selected=null;s.expenses=[];
   if(!await persist(s))return reply({error:'Someone joined at the same time. Please try again.'},409);await syncGroupCalendars(code).catch(()=>{});return reply({session:view(s),token,memberId:m.id});
  }
  const me=await authenticate(request,s);if(p.revision!==s.revision)return reply({error:'The group just changed. Refresh and try again.',session:view(s)},409);
  let trusted; if(action==='select'&&typeof p.id==='string'&&p.id.startsWith('google-')){if(me.id!==s.owner)throw new InputError('Only the organizer can select a venue.');if(!validPlaceId(p.id.slice(7))||!Number.isSafeInteger(p.allowanceCents)||p.allowanceCents<0||p.allowanceCents>10000000)throw new InputError('Choose a valid venue and allowance.');trusted=await resolvePlace(p.id.slice(7),s.type,p.allowanceCents,(env as unknown as Record<string,string>).GOOGLE_PLACES_API_KEY);} mutate(s,me.id,action,p,trusted);if(!await persist(s))return reply({error:'The group just changed. Refresh and try again.'},409);await syncGroupCalendars(code).catch(()=>{});return reply({session:view(s)});
 }catch(e){return reply({error:e instanceof InputError?e.message:e instanceof SyntaxError?'Invalid request.':'Could not save your changes. Please try again.'},e instanceof InputError||e instanceof SyntaxError?400:503);}
}
