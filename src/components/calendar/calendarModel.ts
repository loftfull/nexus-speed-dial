const cap=(value:string)=>value ? value[0].toLocaleUpperCase('ru-RU')+value.slice(1):value;
export interface CalendarDay { date:Date; day:number; inMonth:boolean; key:string }
export function buildMonthGrid(year:number,month:number){
 const first=new Date(year,month,1);const mondayOffset=(first.getDay()+6)%7;const start=new Date(year,month,1-mondayOffset);
 const days:Array<CalendarDay>=Array.from({length:42},(_,index)=>{const date=new Date(start);date.setDate(start.getDate()+index);return{date,day:date.getDate(),inMonth:date.getMonth()===month,key:`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`}});
 const parts=new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric'}).formatToParts(first);const monthLabel=parts.find(part=>part.type==='month')?.value??'';const yearLabel=parts.find(part=>part.type==='year')?.value??String(year);const label=`${cap(monthLabel)} ${yearLabel}`;
 return {year,month,label,days};
}
