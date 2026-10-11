import {calendarMember,digest} from '@/lib/calendar-server';
import {escrowPreview,escrowCommitmentInput} from '@/lib/escrow';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
 try {
  const {s}=await calendarMember(request,new URL(request.url).searchParams.get('code')||'');
  return Response.json({...escrowPreview(s),planCommitment:await digest(escrowCommitmentInput(s))},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Join this group to view its escrow preview.'},{status:401,headers:{'Cache-Control':'no-store'}});}
}
