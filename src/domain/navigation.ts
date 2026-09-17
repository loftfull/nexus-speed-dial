export type ProductionSectionId =
  | 'quick'
  | 'favorites'
  | 'recent'
  | 'library'
  | 'projects'
  | 'tags'
  | 'notes';

export type ProductionSection = {
  id: ProductionSectionId;
  label: string;
  subtitle: string;
};

const PRODUCTION_SECTIONS: readonly ProductionSection[] = [
  { id: 'quick', label: 'Быстрый доступ', subtitle: 'Ваши любимые сайты в одном месте' },
  { id: 'favorites', label: 'Избранное', subtitle: 'Сайты, которые вы отметили звездой' },
  { id: 'recent', label: 'Недавние', subtitle: 'Сайты, которые вы открывали последними' },
  { id: 'library', label: 'Библиотека', subtitle: 'Все материалы с поиском, тегами и заметками' },
  { id: 'projects', label: 'Проекты', subtitle: 'Рабочие пространства и сохранённые сессии' },
  { id: 'tags', label: 'Теги', subtitle: 'Навигация по меткам ваших сайтов' },
  { id: 'notes', label: 'Заметки', subtitle: 'Заметки, прикреплённые к сайтам' },
] as const;

export function getProductionSections(): readonly ProductionSection[] {
  return PRODUCTION_SECTIONS;
}

export function isProductionSection(id: string): id is ProductionSectionId {
  return PRODUCTION_SECTIONS.some(section => section.id === id);
}

export function getProductionSectionByLabel(label: string): ProductionSection | undefined {
  return PRODUCTION_SECTIONS.find(section => section.label === label);
}
