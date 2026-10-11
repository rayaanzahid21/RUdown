export const dynamic='force-dynamic';
// Retire the old Gemini Maps endpoint: stale tabs must not consume Gemini quota.
export async function POST(){return Response.json({error:'Nearby search now uses Google Places. Refresh RUdown, then choose Find nearby places.'},{status:410,headers:{'Cache-Control':'no-store'}});}
