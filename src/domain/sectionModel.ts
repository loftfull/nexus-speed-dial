import type { AppSection } from './types.ts';

export interface SectionPresentation { title: string; subtitle: string; }
export interface DownloadItem { id: string; name: string; source: string; size: string; status: 'active' | 'completed'; progress: number; }
export interface NoteItem { id: string; title: string; body: string; project: string; date: string; }
export interface RecentItem { id: string; siteId: string; when: string; group: 'Сегодня' | 'Вчера' | 'На этой неделе'; }

const sections: Record<AppSection, SectionPresentation> = {
  home: { title: 'Быстрый доступ', subtitle: 'Сохранённые сайты и категории' },
  favorites: { title: 'Избранное', subtitle: 'Важные сайты в одном месте' },
  recent: { title: 'Недавние', subtitle: 'Последние открытые сайты' },
  downloads: { title: 'Загрузки', subtitle: 'Активные и завершённые файлы' },
  notes: { title: 'Заметки', subtitle: 'Короткие записи рядом с вашими ссылками' },
  settings: { title: 'Настройки', subtitle: 'Внешний вид и поведение Nexus' },
};

export const seedDownloads: DownloadItem[] = [
  { id: 'report', name: 'Отчёт_май_2026.pdf', source: 'docs.google.com', size: '58,3 МБ', status: 'active', progress: 42 },
  { id: 'fig', name: 'Презентация_UI.fig', source: 'figma.com', size: '48,7 МБ', status: 'active', progress: 25 },
  { id: 'archive', name: 'Архив_проекта.zip', source: 'drive.google.com', size: '128 МБ', status: 'completed', progress: 100 },
  { id: 'table', name: 'Таблица_бюджет.xlsx', source: 'docs.google.com', size: '86 КБ', status: 'completed', progress: 100 },
];

export const seedNotes: NoteItem[] = [
  { id: 'plan', title: 'План по проекту', body: 'Проверить отчёт, обновить план задач и согласовать следующий этап.', project: 'Проект', date: '28 мая' },
  { id: 'ui', title: 'Идеи для интерфейса', body: 'Сохранить лёгкий glass, чёткую иерархию и быстрые реакции плиток.', project: 'Работа', date: '27 мая' },
  { id: 'services', title: 'Список сервисов', body: 'Проверить Figma, GitHub, Drive и Telegram перед следующей итерацией.', project: 'Дом', date: '26 мая' },
];

export const seedRecent: RecentItem[] = [
  { id: 'r1', siteId: 'github', when: '18:04', group: 'Сегодня' },
  { id: 'r2', siteId: 'youtube', when: '16:22', group: 'Сегодня' },
  { id: 'r3', siteId: 'telegram', when: '15:47', group: 'Сегодня' },
  { id: 'r4', siteId: 'drive', when: '13:18', group: 'Сегодня' },
  { id: 'r5', siteId: 'ozon', when: '21:16', group: 'Вчера' },
  { id: 'r6', siteId: 'metrika', when: '17:05', group: 'Вчера' },
];

export function getSectionPresentation(section: AppSection): SectionPresentation {
  return sections[section];
}
