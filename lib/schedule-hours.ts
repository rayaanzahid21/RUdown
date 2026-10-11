import type {Activity,Schedule} from './planning';
function localMinute(t:number,zone:string){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(t).map(x=>[x.type,x.value]));return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute)/60000;}
export function scheduleHours(hours:Activity['openingHours'],schedule?:Schedule):{state:'open'|'closed'|'unknown';message:string}{
 const unknown=(message:string)=>({state:'unknown' as const,message});
 if(!schedule)return unknown('Set your outing date and time to check venue hours.');
 if(!hours?.timeZone||!hours.intervals)return unknown('Hours for your planned time are unknown. Confirm with the venue.');
 const start=Date.parse(schedule.start),end=Date.parse(schedule.end),checked=Date.parse(hours.checkedAt);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>14*86400000)return unknown('Choose a valid outing time.');
 try{
  const day=Math.floor(localMinute(checked,hours.timeZone)/1440)*1440;
  const first=localMinute(start,hours.timeZone),last=localMinute(end-1,hours.timeZone);
  if(first<day||last>=day+7*1440)return unknown('This date is outside Google’s current seven-day hours. Confirm directly with the venue.');
  for(let t=start;t<end;t+=60000){const minute=localMinute(t,hours.timeZone);if(!hours.intervals.some(p=>minute>=p.start&&minute<p.end))return {state:'closed',message:'The venue is closed for part or all of your planned time according to Google. Choose another time or confirm an exception.'};}
  if(!hours.intervals.some(p=>last>=p.start&&last<p.end))return {state:'closed',message:'Your plan runs past the listed closing time.'};
  return {state:'open',message:'Your full outing fits the current listed hours. This is not a reservation; confirm availability with the venue.'};
 }catch{return unknown('Venue time zone could not be checked. Confirm directly.');}
}
