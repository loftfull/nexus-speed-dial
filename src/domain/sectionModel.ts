import type { AppSection } from './types.ts';

export interface SectionPresentation {
  title: string;
  subtitle: string;
}

const sections: Record<AppSection, SectionPresentation> = {
  home: { title: 'Быстрый доступ', subtitle: 'Сохранённые сайты и категории' },
  favorites: { title: 'Избранное', subtitle: 'Важные сайты в одном месте' },
  recent: { title: 'Недавние', subtitle: 'Последние открытые сайты' },
  downloads: { title: 'Загрузки', subtitle: 'Скачанные файлы появятся здесь' },
  notes: { title: 'Заметки', subtitle: 'Короткие записи рядом с вашими ссылками' },
  settings: { title: 'Настройки', subtitle: 'Внешний вид и поведение Nexus' },
};

export function getSectionPresentation(section: AppSection): SectionPresentation {
  return sections[section];
}
