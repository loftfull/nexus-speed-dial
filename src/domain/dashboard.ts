/**
 * Раскладка «рабочий стол проектов».
 *
 * Экран собран не из плоской сетки плиток, а из колонок-папок: проект
 * раскрывается своими категориями, категория — своими группами. Это та же
 * иерархия «Проект › Категория › Группа › Сайт», что и в проводнике, просто
 * показанная целиком, а не по одной ветке за раз.
 *
 * Сборка вынесена из разметки, потому что здесь есть что проверять: что
 * пустые ветки не превращаются в пустые карточки, что счётчик считает все
 * сайты ветки, а не только показанные, и что порядок не пляшет.
 */

import type { Category, Project, SiteGroup, SiteRecord } from './types';

export type BoardColumn = {
  id: string;
  name: string;
  /** Сколько сайтов в ветке всего — счётчик в шапке карточки. */
  total: number;
  /** Сколько поместилось в карточку. */
  sites: SiteRecord[];
  /** Ветка, в которую уводит стрелка: категория или группа. */
  kind: 'category' | 'group';
};

export type ProjectCard = { project: Project; total: number };

/**
 * Сайты проекта.
 *
 * Принадлежность идёт через категории (site.categoryId → category.projectId),
 * а не через project.siteIds: этот список — отдельная ручная подборка, и по
 * нему счётчик на карточках выходил нулевым, хотя сайты в проекте были.
 * Здесь считается ровно то же, что показывает проводник слева.
 */
export function projectSites(projectId: string, categories: Category[], sites: SiteRecord[]): SiteRecord[] {
  const mine = new Set(categories.filter(category => category.projectId === projectId).map(category => category.id));
  return sites.filter(site => site.categoryId && mine.has(site.categoryId));
}

/** Карточки проектов для верхнего ряда, со счётчиком сайтов. */
export function projectCards(projects: Project[], categories: Category[], sites: SiteRecord[]): ProjectCard[] {
  return projects.map(project => ({ project, total: projectSites(project.id, categories, sites).length }));
}

export type BoardInput = {
  categories: Category[];
  groups: SiteGroup[];
  sites: SiteRecord[];
  projectId: string | null;
  /** Выбранная категория: тогда колонками становятся её группы. */
  categoryId?: string | null;
  /** Сколько сайтов помещается в одну карточку. */
  limit?: number;
};

/**
 * Колонки доски.
 *
 * Без выбранной категории колонки — категории проекта; с выбранной — её
 * группы плюс отдельная колонка для сайтов категории, не разложенных по
 * группам: иначе они просто исчезли бы с экрана.
 */
export function boardColumns(input: BoardInput): BoardColumn[] {
  const { categories, groups, sites, projectId, categoryId = null, limit = 4 } = input;
  const take = (list: SiteRecord[]): Pick<BoardColumn, 'total' | 'sites'> =>
    ({ total: list.length, sites: list.slice(0, Math.max(0, limit)) });

  if (categoryId) {
    const inCategory = sites.filter(site => site.categoryId === categoryId);
    const columns: BoardColumn[] = groups
      .filter(group => group.categoryId === categoryId)
      .map(group => ({
        id: group.id,
        name: group.name,
        kind: 'group' as const,
        ...take(inCategory.filter(site => site.groupId === group.id)),
      }));
    const loose = inCategory.filter(site => !site.groupId);
    if (loose.length) {
      columns.push({ id: `${categoryId}:loose`, name: 'Без группы', kind: 'category', ...take(loose) });
    }
    return columns;
  }

  return categories
    .filter(category => !projectId || category.projectId === projectId)
    .map(category => ({
      id: category.id,
      name: category.name,
      kind: 'category' as const,
      ...take(sites.filter(site => site.categoryId === category.id)),
    }));
}

/** Хлебные крошки под названием доски. */
export function boardCrumbs(names: { project?: string; category?: string; group?: string }): string[] {
  const crumbs: string[] = [];
  if (names.project) crumbs.push(names.project);
  if (names.category) crumbs.push(names.category);
  if (names.group) crumbs.push(names.group);
  return crumbs;
}
