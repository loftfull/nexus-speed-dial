/** Russian plural agreement: plural(1,'сайт','сайта','сайтов') -> 'сайт'. */
export function pluralForm(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(Math.trunc(count));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Counted noun with its number, e.g. "3 сайта". */
export function plural(count: number, one: string, few: string, many: string): string {
  return `${count} ${pluralForm(count, one, few, many)}`;
}

export const sites = (n: number) => plural(n, 'сайт', 'сайта', 'сайтов');
export const items = (n: number) => plural(n, 'материал', 'материала', 'материалов');
export const projects = (n: number) => plural(n, 'проект', 'проекта', 'проектов');
export const sessions = (n: number) => plural(n, 'сессия', 'сессии', 'сессий');
export const tabs = (n: number) => plural(n, 'вкладка', 'вкладки', 'вкладок');
