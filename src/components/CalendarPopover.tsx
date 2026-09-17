import { useEffect, useRef, useState, type RefObject } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export function CalendarPopover({ onClose, trigger }: { onClose: () => void; trigger?: RefObject<HTMLElement | null> }) {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const first = new Date(year, month, 1).getDay() || 7; const last = new Date(year, month + 1, 0).getDate();
  const monthName = cursor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const calendarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      // The toggle button closes the popover itself, so ignore pointerdown on it.
      if (calendarRef.current?.contains(target) || trigger?.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer);
  }, [onClose, trigger]);
  return <div ref={calendarRef} className="calendar glass" role="dialog" aria-label="Календарь"><div className="cal-head"><div><b>{monthName[0].toUpperCase()+monthName.slice(1)}</b><span>{selected.toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}</span></div><div><button aria-label="Предыдущий месяц" onClick={()=>setCursor(new Date(year,month-1,1))}><ChevronLeft size={16}/></button><button aria-label="Следующий месяц" onClick={()=>setCursor(new Date(year,month+1,1))}><ChevronRight size={16}/></button></div></div><div className="week">{days.map(day=><span key={day}>{day}</span>)}</div><div className="days">{Array.from({length:first-1},(_,i)=><i key={'empty'+i}/>)}{Array.from({length:last},(_,i)=>{const day=i+1;const active=selected.getFullYear()===year&&selected.getMonth()===month&&selected.getDate()===day;return <button className={active?'today':''} key={day} onClick={()=>setSelected(new Date(year,month,day))}>{day}</button>})}</div><div className="cal-note"><div className="note-dot"/><span><b>{selected.getDate()===new Date().getDate()&&selected.getMonth()===new Date().getMonth()?'Сегодня':'Выбранный день'}</b><small>Нет запланированных событий</small></span><ChevronRight size={16}/></div><button className="close-cal" onClick={onClose} aria-label="Закрыть календарь"><X size={14}/></button></div>;
}
