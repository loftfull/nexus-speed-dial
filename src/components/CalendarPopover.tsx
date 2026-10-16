import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from '../app/icons.generated';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const sameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate();

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Календарь у часов в доке.
 *
 * Разметка переведена в пространство `nx-`. Прежние имена — `calendar`,
 * `week`, `days`, `today`, `close-cal` — лежали в общем листе стилей без
 * всякого пространства имён: `.today` или `.days` столкнулись бы с любым
 * новым блоком, который захочет так назваться. Заодно ушло двойное описание:
 * цвета календаря задавались дважды, в своём блоке и ещё раз под `.nx-root`.
 */
export function CalendarPopover({ onClose }: { onClose: () => void }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const popover = useRef<HTMLDivElement>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  // getDay() считает воскресенье нулём, а неделя здесь начинается с понедельника.
  const firstWeekday = new Date(year, month, 1).getDay() || 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = useMemo(
    () => capitalize(cursor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })),
    [cursor],
  );
  const selectedName = useMemo(
    () => capitalize(selected.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })),
    [selected],
  );

  useEffect(() => {
    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      // Каждая кнопка, открывающая календарь, закрывает его сама, поэтому
      // нажатие на неё не должно считаться нажатием снаружи.
      const element = target instanceof Element ? target : target.parentElement;
      if (popover.current?.contains(target) || element?.closest('[data-calendar-trigger]')) return;
      onClose();
    };
    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer);
  }, [onClose]);

  return (
    <div ref={popover} className="nx-cal" role="dialog" aria-label="Календарь">
      <div className="nx-cal-head">
        <div>
          <b>{monthName}</b>
          <span>{selectedName}</span>
        </div>
        <div>
          <button type="button" aria-label="Предыдущий месяц"
            onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft size={16} /></button>
          <button type="button" aria-label="Следующий месяц"
            onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="nx-cal-week">
        {WEEKDAYS.map(day => <span key={day}>{day}</span>)}
      </div>

      <div className="nx-cal-days">
        {/* Пустые клетки до первого числа: месяц начинается не с понедельника. */}
        {Array.from({ length: firstWeekday - 1 }, (_, index) => <i key={`empty-${index}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const date = new Date(year, month, day);
          const picked = sameDay(selected, date);
          return (
            <button key={day} type="button" className={picked ? 'on' : undefined}
              aria-pressed={picked} onClick={() => setSelected(date)}>{day}</button>
          );
        })}
      </div>

      <div className="nx-cal-note">
        <div className="nx-cal-dot" />
        <span>
          <b>{sameDay(selected, new Date()) ? 'Сегодня' : 'Выбранный день'}</b>
          <small>Нет запланированных событий</small>
        </span>
        <ChevronRight size={16} />
      </div>

      <button type="button" className="nx-cal-close" onClick={onClose} aria-label="Закрыть календарь">
        <X size={14} />
      </button>
    </div>
  );
}
