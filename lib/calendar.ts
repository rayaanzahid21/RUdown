import { approvalStatus, catalog, money, shares, type Session } from './planning';

export function calendarReady(s:Session) {
 return !!s.schedule && !!s.selected && s.members.length>0 && approvalStatus(s).every(a=>a.approved);
}
export function calendarEvent(s:Session,memberId:string) {
 const activity=catalog.find(a=>a.id===s.selected);
 if(!activity||!s.schedule)throw new Error('Choose a plan and save its date and time first.');
 const totals=shares(s.expenses,s.members),ready=calendarReady(s);
 return {
  summary:`${ready?'':'[Draft] '}RUdown · ${activity.name}`,
  location:activity.area,
  description:[s.name,`Plan version ${s.version} · ${ready?'Everyone approved':'Draft — awaiting everyone’s approval'}`,`Your estimated share: ${money(totals[memberId]||0)}`,`Estimated group total: ${money(Object.values(totals).reduce((a,b)=>a+b,0))}`,'',...activity.itinerary.map((step,i)=>`${i+1}. ${step}`),'','Itinerary times are suggestions; the event start/end below are the group’s agreed schedule.','Prices and venue details are estimates. No booking or payment has been made.',`Directions: https://www.google.com/maps/search/?api=1&query=${activity.location.lat},${activity.location.lng}`].join('\n'),
  start:{dateTime:s.schedule.start,timeZone:s.schedule.timeZone},
  end:{dateTime:s.schedule.end,timeZone:s.schedule.timeZone},
  status:ready?'confirmed':'tentative',
 };
}
export function googleCalendarLink(s:Session,memberId:string) {
 const e=calendarEvent(s,memberId),stamp=(v:string)=>v.replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 return 'https://calendar.google.com/calendar/render?'+new URLSearchParams({action:'TEMPLATE',text:e.summary,dates:`${stamp(e.start.dateTime)}/${stamp(e.end.dateTime)}`,ctz:e.start.timeZone,details:e.description,location:e.location}).toString();
}
