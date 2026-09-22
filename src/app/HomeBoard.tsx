import React from 'react';
import {
  Briefcase, ChevronRight, Clock3, CloudSun, Folder, GraduationCap, Home, Layers3,
  LayoutGrid, Plus, Search, ShoppingBag, Star,
} from './icons.generated';
import { SiteIcon } from './SiteIcon';
import { boardColumns, boardCrumbs, projectCards } from '../domain/dashboard';
import { projectColor } from '../domain/nodeColor';
import { sites as countSites } from '../domain/plural';
import type { Category, Project, SiteGroup, SiteRecord } from '../domain/types';

const PROJECT_GLYPHS = [Home, Briefcase, GraduationCap, Star, Layers3, ShoppingBag];

export type HomeBoardProps = {
  projects: Project[];
  categories: Category[];
  groups: SiteGroup[];
  sites: SiteRecord[];
  recent: SiteRecord[];
  activeProjectId: string | null;
  categoryId: string | null;
  time: string;
  dateLine: string;
  logos: boolean;
  /** Показания погоды для шапки; null — виджет выключен в настройках. */
  weather: { temp: string; city: string } | null;
  /** Сколько сайтов в хранилище всего — счётчик в шапке. */
  totalSites: number;
  /** Сколько строк помещается в одну карточку папки. */
  folderSites: number;
  onOpenSite: (site: SiteRecord) => void;
  onSelectProject: (id: string) => void;
  onSelectCategory: (id: string | null) => void;
  onAddProject: () => void;
  onAddCategory: () => void;
  onAddSite: () => void;
  onSearch: () => void;
  onOpenCalendar: () => void;
  onOpenForecast: () => void;
  calendarOpen: boolean;
  forecastOpen: boolean;
  onToggleLayout: () => void;
};

/**
 * Главный экран в раскладке «рабочий стол проектов».
 *
 * Отличие от сетки плиток не в оформлении, а в том, что показано: сверху
 * обращение и время, дальше ряд проектов, а основное место занимает доска
 * папок — каждая ветка со своими сайтами сразу на виду. Плоская сетка
 * отвечает на вопрос «куда зайти», доска — на вопрос «как у меня всё
 * устроено», и второй вопрос на стартовой странице задают чаще.
 *
 * Постоянной строки поиска здесь нет намеренно: поиск вызывается кнопкой
 * или Ctrl/⌘K, как и было решено раньше.
 */
export function HomeBoard(props: HomeBoardProps) {
  const {
    projects, categories, groups, sites, recent, activeProjectId, categoryId,
    time, dateLine, logos, weather, totalSites, folderSites,
    onOpenSite, onSelectProject, onSelectCategory, onAddProject, onAddCategory, onAddSite, onSearch, onOpenCalendar, onOpenForecast, calendarOpen, forecastOpen, onToggleLayout,
  } = props;

  const cards = projectCards(projects, categories, sites);
  const active = projects.find(project => project.id === activeProjectId) ?? projects[0] ?? null;
  const activeCategory = categories.find(category => category.id === categoryId) ?? null;
  const columns = boardColumns({
    categories, groups, sites,
    projectId: active?.id ?? null,
    categoryId: activeCategory?.id ?? null,
    limit: folderSites,
  });
  // Крошки показываются только на глубине: без выбранной категории строка
  // «Дом» под заголовком «Дом» — это повтор, а не навигация.
  const crumbs = activeCategory ? boardCrumbs({ project: active?.name, category: activeCategory.name }) : [];

  return (
    <div className="nx-board">
      {/* Слева — показания, справа — действия. Ни приветствия, ни девиза:
          на стартовой странице место стоит дорого, а «Добрый вечер!» не
          сообщает ничего, чего пользователь не знал бы и без него. */}
      <header className="nx-board-top">
        <div className="nx-board-facts">
          <button type="button" data-calendar-trigger className="nx-board-clock"
            aria-expanded={calendarOpen} aria-label={`Открыть календарь, сегодня ${dateLine}`}
            onClick={onOpenCalendar}>
            <b>{time}</b>
            <small>{dateLine}</small>
          </button>

          {weather && (
            <button type="button" data-forecast-trigger className="nx-board-weather"
              aria-expanded={forecastOpen} aria-label={`Прогноз на пять дней, сейчас ${weather.temp}`}
              onClick={onOpenForecast}>
              <CloudSun size={26} aria-hidden="true" />
              <span>
                <b>{weather.temp}</b>
                <small>{weather.city}</small>
              </span>
            </button>
          )}

          <span className="nx-board-total">
            <b>{totalSites}</b>
            <small>{countSites(totalSites).replace(/^\d+\s*/, '')}</small>
          </span>
        </div>

        <div className="nx-board-actions">
          <button type="button" className="nx-round" aria-label="Поиск и команды" title="Поиск и команды (Ctrl K)" onClick={onSearch}>
            <Search size={19} />
          </button>
          <button type="button" className="nx-round" aria-label="Сменить раскладку главной" title="Сменить раскладку главной" onClick={onToggleLayout}>
            <LayoutGrid size={19} />
          </button>
          <button type="button" className="nx-round" aria-label="Добавить сайт" title="Добавить сайт (Ctrl N)" onClick={onAddSite}>
            <Plus size={19} />
          </button>
        </div>
      </header>

      <nav className="nx-projects" aria-label="Проекты">
        {cards.map(({ project, total }, index) => {
          const Glyph = PROJECT_GLYPHS[index % PROJECT_GLYPHS.length];
          const on = project.id === active?.id;
          return (
            <button key={project.id} type="button"
              className={'nx-project-card' + (on ? ' on' : '')}
              style={{ '--nx-node': projectColor(project) } as React.CSSProperties}
              aria-current={on ? 'true' : undefined}
              aria-label={`Проект «${project.name}», ${countSites(total)}`}
              onClick={() => { onSelectProject(project.id); onSelectCategory(null); }}>
              <span className="nx-project-glyph" aria-hidden="true"><Glyph size={26} weight={on ? 'duotone' : 'regular'} /></span>
              <b>{project.name}</b>
              <small>{countSites(total)}</small>
            </button>
          );
        })}
        <button type="button" className="nx-project-card add" onClick={onAddProject} aria-label="Новый проект">
          <span className="nx-project-glyph" aria-hidden="true"><Plus size={26} /></span>
          <b>Новый проект</b>
        </button>
      </nav>

      <section className="nx-folders" aria-label="Папки проекта">
        <header className="nx-folders-top">
          <span className="nx-folders-mark" style={{ '--nx-node': active ? projectColor(active) : 'var(--nx-accent)' } as React.CSSProperties} aria-hidden="true">
            <Folder size={22} weight="duotone" />
          </span>
          <div className="nx-folders-title">
            <h2>{activeCategory?.name ?? active?.name ?? 'Проектов пока нет'}</h2>
            {crumbs.length > 0 && (
              <p className="nx-crumbs">
                {crumbs.map((crumb, index) => (
                  <React.Fragment key={crumb + index}>
                    {index > 0 && <ChevronRight size={12} aria-hidden="true" />}
                    {index === 0 && crumbs.length > 1
                      ? <button type="button" onClick={() => onSelectCategory(null)}>{crumb}</button>
                      : <span>{crumb}</span>}
                  </React.Fragment>
                ))}
              </p>
            )}
          </div>
          <button type="button" className="nx-round nx-folders-more" aria-label="Добавить сайт в проект" title="Добавить сайт в проект" onClick={onAddSite}>
            <Plus size={18} />
          </button>
        </header>

        {columns.length === 0 ? (
          <p className="nx-folders-empty">
            В этом проекте ещё нет категорий. Создайте первую — и сайты разложатся по папкам.
          </p>
        ) : (
          <div className="nx-folder-cols">
            {columns.map(column => (
              <article key={column.id} className="nx-folder">
                <header>
                  <span className="nx-folder-mark" aria-hidden="true"><Folder size={19} weight="duotone" /></span>
                  <span className="nx-folder-title">
                    <b>{column.name}</b>
                    <small>{countSites(column.total)}</small>
                  </span>
                  {column.kind === 'category' && column.total > 0 && (
                    <button type="button" className="nx-folder-open" aria-label={`Открыть «${column.name}»`}
                      title={`Открыть «${column.name}»`} onClick={() => onSelectCategory(column.id)}>
                      <ChevronRight size={16} />
                    </button>
                  )}
                </header>
                <ul>
                  {column.sites.map(site => (
                    <li key={site.id ?? site.domain}>
                      <button type="button" onClick={() => onOpenSite(site)} title={site.title}>
                        <SiteIcon title={site.title} domain={site.domain} color={site.color}
                          logos={logos} className="nx-dock-mark" />
                        <span>{site.title}</span>
                      </button>
                    </li>
                  ))}
                  {column.total > column.sites.length && (
                    <li className="nx-folder-rest">
                      <button type="button" onClick={() => onSelectCategory(column.kind === 'category' ? column.id : null)}>
                        Ещё {column.total - column.sites.length}
                      </button>
                    </li>
                  )}
                </ul>
                <button type="button" className="nx-folder-add" onClick={onAddSite}>
                  <Plus size={14} aria-hidden="true" /> Добавить сайт
                </button>
              </article>
            ))}
            {/* Призрачная колонка. Проект с двумя категориями иначе оставлял
                справа полосу пустой доски: это место всё равно принадлежит
                папкам, пусть оно предлагает завести следующую. */}
            <button type="button" className="nx-folder nx-folder-new" onClick={onAddCategory}>
              <span className="nx-folder-mark" aria-hidden="true"><Plus size={19} /></span>
              <b>Новая папка</b>
              <small>Разложить сайты по темам</small>
            </button>
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section className="nx-strip" aria-label="Недавние сайты">
          <header>
            <span className="nx-strip-mark" aria-hidden="true"><Clock3 size={19} weight="duotone" /></span>
            <h2>Недавние сайты</h2>
          </header>
          <div className="nx-strip-row">
            {recent.map(site => (
              <button key={site.id ?? site.domain} type="button" className="nx-strip-card"
                onClick={() => onOpenSite(site)} title={site.title}>
                <SiteIcon title={site.title} domain={site.domain} color={site.color}
                  logos={logos} className="nx-mark" />
                <span>{site.title}</span>
              </button>
            ))}
            <button type="button" className="nx-strip-card add" onClick={onAddSite} aria-label="Добавить сайт">
              <span className="nx-strip-plus" aria-hidden="true"><Plus size={22} /></span>
              <span>Добавить</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
