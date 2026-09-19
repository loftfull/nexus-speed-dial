import type { Category, Project, SiteGroup, SiteRecord } from './types';

/**
 * Палитра — единственное окно поиска в приложении. Оно ищет по всему хранилищу,
 * а не по текущему разделу, поэтому сайт находится, даже когда неизвестно,
 * в каком проекте он лежит.
 */
export type PaletteKind = 'site' | 'command' | 'section' | 'project' | 'category' | 'group' | 'web';

export type PaletteItem = {
  /** Уникален в пределах списка: `kind:ref`. */
  id: string;
  kind: PaletteKind;
  /** Идентификатор сущности, по которому приложение выполняет действие. */
  ref: string;
  title: string;
  /** Вторая строка: путь, адрес или пояснение к команде. */
  hint: string;
  /** Невидимый текст для поиска: адрес, теги, заметка, синонимы. */
  keywords: string;
  /** Показывается справа и учит горячей клавише. */
  shortcut?: string;
  /**
   * Ключ иконки строки. Домен остаётся без React: сопоставление ключа
   * с компонентом живёт в палитре.
   */
  icon?: string;
  /** Цвет узла — для кружка слева у проектов, категорий и групп. */
  color?: string;
  /** Для сайтов: чем рисовать знак и куда идти. */
  domain?: string;
  url?: string;
};

export type PaletteMatch = { score: number; positions: number[] };

const SEPARATORS = new Set([' ', '-', '–', '—', '_', '.', '/', ':', ',', '«', '»', '(', ')', '[', ']']);

/**
 * Совпадение по подпоследовательности: «tg sb» находит «Toggle Sidebar».
 * Оценка поощряет начало слова и подряд идущие буквы и штрафует пропуски,
 * поэтому точное начало названия всегда обходит разрозненные попадания.
 */
export function fuzzyMatch(text: string, query: string): PaletteMatch | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return { score: 0, positions: [] };
  const hay = text.toLowerCase();
  if (!hay) return null;

  const positions: number[] = [];
  let score = 0;
  let at = 0;
  let streak = 0;

  for (const char of needle) {
    const found = hay.indexOf(char, at);
    if (found < 0) return null;
    if (found === 0) score += 9;
    else if (SEPARATORS.has(hay[found - 1])) score += 7;
    if (positions.length && found === at) {
      streak += 1;
      score += 4 + streak;
    } else {
      streak = 0;
    }
    score -= Math.min(found - at, 6);
    positions.push(found);
    at = found + char.length;
  }

  // Короткая строка, покрытая запросом целиком, важнее длинной с тем же числом букв.
  score += Math.round((needle.length / hay.length) * 12);
  return { score, positions };
}

/** Насколько вид элемента интересен при прочих равных. */
const KIND_WEIGHT: Record<PaletteKind, number> = {
  site: 12, command: 10, section: 8, project: 7, category: 6, group: 5,
  // Веб-действие добавляется приложением последним и не участвует в ранжировании.
  web: 0,
};

/** Совпадение во второй строке или в скрытых словах слабее совпадения в названии. */
const HINT_PENALTY = 8;
const KEYWORD_PENALTY = 14;

export type RankedPaletteItem = PaletteItem & { score: number; positions: number[] };

export function rankPaletteItems(items: PaletteItem[], query: string, limit = 24): RankedPaletteItem[] {
  const needle = query.trim();
  if (!needle) return items.slice(0, limit).map(item => ({ ...item, score: 0, positions: [] }));

  const ranked: RankedPaletteItem[] = [];
  for (const item of items) {
    const byTitle = fuzzyMatch(item.title, needle);
    const byHint = byTitle ? null : fuzzyMatch(item.hint, needle);
    const byKeywords = byTitle || byHint ? null : fuzzyMatch(item.keywords, needle);
    const best = byTitle ?? byHint ?? byKeywords;
    if (!best) continue;
    const penalty = byTitle ? 0 : byHint ? HINT_PENALTY : KEYWORD_PENALTY;
    // Подсвечиваем только попадания в название: в подсказке и словах их не видно.
    ranked.push({ ...item, positions: byTitle ? best.positions : [], score: best.score + KIND_WEIGHT[item.kind] - penalty });
  }
  // Сортировка в JS устойчива, поэтому равные оценки сохраняют порядок сборки.
  return ranked.sort((a, b) => b.score - a.score).slice(0, limit);
}

export type PaletteCommand = { id: string; title: string; hint: string; shortcut?: string; keywords?: string; icon?: string };

export type PaletteSection = { id: string; label: string; shortcut?: string; icon?: string };

export type PaletteInput = {
  sites: SiteRecord[];
  projects: Project[];
  categories: Category[];
  groups: SiteGroup[];
  sections: PaletteSection[];
  commands: PaletteCommand[];
  /** Выключенный «Поиск по закладкам» убирает сайты из палитры. */
  includeSites?: boolean;
  /** Сколько недавних сайтов поднять в начало списка. */
  recentLimit?: number;
  colorOf?: (kind: 'project' | 'category' | 'group', id: string) => string | undefined;
};

const sitePath = (site: SiteRecord, categories: Category[], groups: SiteGroup[], projects: Project[]): string => {
  const category = categories.find(item => item.id === site.categoryId);
  const project = category ? projects.find(item => item.id === category.projectId) : undefined;
  const group = site.groupId ? groups.find(item => item.id === site.groupId) : undefined;
  return [project?.name, category?.name ?? site.category, group?.name].filter(Boolean).join(' → ');
};

const siteItem = (site: SiteRecord, path: string): PaletteItem => ({
  id: `site:${site.id ?? site.domain}`,
  kind: 'site',
  ref: site.id ?? site.domain,
  title: site.title,
  hint: [site.domain, path].filter(Boolean).join(' · '),
  keywords: [site.domain, site.url, site.desc, site.note, path, (site.tags ?? []).join(' ')].filter(Boolean).join(' '),
  domain: site.domain,
  url: site.url,
});

/**
 * Порядок сборки — это и порядок пустого запроса: сначала недавние сайты,
 * потом команды и разделы, затем дерево и остальные закладки.
 */
export function buildPaletteItems(input: PaletteInput): PaletteItem[] {
  const { sites, projects, categories, groups, sections, commands } = input;
  const includeSites = input.includeSites !== false;
  const recentLimit = input.recentLimit ?? 6;
  const color = input.colorOf ?? (() => undefined);

  const pathOf = new Map<SiteRecord, string>();
  for (const site of sites) pathOf.set(site, sitePath(site, categories, groups, projects));

  const recent = includeSites
    ? sites.filter(site => site.lastOpened).sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0)).slice(0, recentLimit)
    : [];
  const recentIds = new Set(recent);

  const items: PaletteItem[] = [];
  for (const site of recent) items.push(siteItem(site, pathOf.get(site) ?? ''));

  for (const command of commands) {
    items.push({
      id: `command:${command.id}`, kind: 'command', ref: command.id,
      title: command.title, hint: command.hint, shortcut: command.shortcut, icon: command.icon,
      keywords: [command.keywords, 'команда'].filter(Boolean).join(' '),
    });
  }

  for (const section of sections) {
    items.push({
      id: `section:${section.id}`, kind: 'section', ref: section.id,
      title: section.label, hint: 'Раздел', keywords: 'раздел перейти', shortcut: section.shortcut, icon: section.icon,
    });
  }

  for (const project of projects) {
    items.push({
      id: `project:${project.id}`, kind: 'project', ref: project.id,
      title: project.name, hint: 'Проект', keywords: 'проект переключить',
      color: color('project', project.id) ?? project.color,
    });
  }

  for (const category of categories) {
    const project = projects.find(item => item.id === category.projectId);
    items.push({
      id: `category:${category.id}`, kind: 'category', ref: category.id,
      title: category.name, hint: project ? `Категория · ${project.name}` : 'Категория',
      keywords: ['категория', project?.name].filter(Boolean).join(' '),
      color: color('category', category.id),
    });
  }

  for (const group of groups) {
    const category = categories.find(item => item.id === group.categoryId);
    const project = category ? projects.find(item => item.id === category.projectId) : undefined;
    items.push({
      id: `group:${group.id}`, kind: 'group', ref: group.id,
      title: group.name,
      hint: ['Группа', category?.name, project?.name].filter(Boolean).join(' · '),
      keywords: ['группа', category?.name, project?.name].filter(Boolean).join(' '),
      color: color('group', group.id),
    });
  }

  if (includeSites) {
    for (const site of sites) {
      if (recentIds.has(site)) continue;
      items.push(siteItem(site, pathOf.get(site) ?? ''));
    }
  }

  return items;
}

/** Похоже ли введённое на адрес, который надо открыть, а не искать. */
export function looksLikeUrl(value: string): boolean {
  const raw = value.trim();
  if (!raw || /\s/.test(raw)) return false;
  return /^https?:\/\//i.test(raw) || /^[\w-]+(\.[\w-]+)+(\/|$|\?|#)/.test(raw);
}
