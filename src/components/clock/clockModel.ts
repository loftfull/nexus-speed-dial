const cap=(value:string)=>value ? value[0].toLocaleUpperCase('ru-RU')+value.slice(1):value;
export function formatClock(now:Date,timeZone?:string){
 const time=new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone}).format(now);
 const parts=new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone}).formatToParts(now);
 const get=(type:Intl.DateTimeFormatPartTypes)=>parts.find(part=>part.type===type)?.value??'';
 return {time,date:`${cap(get('weekday'))}, ${get('day')} ${get('month')} ${get('year')}`};
}
