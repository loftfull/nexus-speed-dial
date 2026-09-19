/**
 * Приветствие на главной.
 *
 * Часть суток берётся по местному времени пользователя. Границы выбраны
 * так, как их понимает русский язык: «утро» начинается в пять, а не в
 * полночь, и «ночь» тянется через полночь, а не обрывается на ней.
 */

export type DayPart = 'night' | 'morning' | 'day' | 'evening';

export function dayPart(hour: number): DayPart {
  const value = ((Math.floor(hour) % 24) + 24) % 24;
  if (value >= 5 && value < 12) return 'morning';
  if (value >= 12 && value < 18) return 'day';
  if (value >= 18 && value < 23) return 'evening';
  return 'night';
}

const HELLO: Record<DayPart, string> = {
  morning: 'Доброе утро',
  day: 'Добрый день',
  evening: 'Добрый вечер',
  night: 'Доброй ночи',
};

/**
 * Собирает строку приветствия. Имя необязательно: без него получается
 * «Добрый вечер!», а не «Добрый вечер, !» — пустое обращение выглядит
 * как недоделка, а имя спрашивать при установке никто не обязан.
 */
export function greetingLine(hour: number, name?: string): string {
  const hello = HELLO[dayPart(hour)];
  const who = (name ?? '').trim();
  return who ? `${hello}, ${who}!` : `${hello}!`;
}

const SUBTITLES: Record<DayPart, string> = {
  morning: 'Большие дела начинаются с маленьких шагов',
  day: 'Всё нужное — на расстоянии одного клика',
  evening: 'Самое время собрать мысли и закрыть день',
  night: 'Тихое время — лучшее для сосредоточенной работы',
};

export function greetingSubtitle(hour: number): string {
  return SUBTITLES[dayPart(hour)];
}
