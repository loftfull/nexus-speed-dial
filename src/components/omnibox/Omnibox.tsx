import { Grid2X2, List, Search, Settings2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { resolveOmnibox, suggestSites } from '../../domain/omnibox.ts';
import type { Site } from '../../domain/types.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import styles from './Omnibox.module.css';

export function Omnibox() {
  const [query, setQuery] = useState('');
  const sites = useAppStore(state => state.sites);
  const spaces = useAppStore(state => state.spaces);
  const categories = useAppStore(state => state.categories);
  const layoutMode = useAppStore(state => state.layoutMode);
  const recordVisit = useAppStore(state => state.recordVisit);
  const setLayoutMode = useAppStore(state => state.setLayoutMode);
  const setSettingsOpen = useAppStore(state => state.setSettingsOpen);
  const suggestions = useMemo(() => suggestSites(query, sites), [query, sites]);
  const resolution = useMemo(() => resolveOmnibox(query, sites), [query, sites]);

  const go = (url: string) => window.location.assign(url);
  const siteSpaceId = (site: Site) => site.spaceId ?? site.projectId;
  const contextFor = (site: Site) => {
    const spaceId = siteSpaceId(site);
    const space = spaces.find(item => item.id === spaceId)?.name ?? 'Пространство';
    const category = site.categoryId ? categories.find(item => item.id === site.categoryId)?.name : undefined;
    return category ? `${space} / ${category}` : space;
  };
  const openSite = (site: Site) => {
    recordVisit(site.id);
    go(site.url);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (resolution.kind === 'site') openSite(resolution.site);
    else if (resolution.kind === 'url' || resolution.kind === 'search') go(resolution.url);
  };

  return <header className={styles.bar}>
    <div className={styles.searchArea}>
      <form onSubmit={submit}>
        <GlassSurface role="control" className={styles.box}>
          <Search size={18}/>
          <input
            aria-label="Найти сайт или ввести адрес"
            placeholder="Найти сайт или ввести адрес…"
            value={query}
            onChange={event => setQuery(event.target.value)}
            autoComplete="off"
          />
        </GlassSurface>
      </form>
      {suggestions.length > 0 && <GlassSurface role="popover" className={styles.suggestions} data-testid="omnibox-suggestions">
        {suggestions.map(site => <button key={site.id} type="button" onClick={() => openSite(site)}>
          <span className={styles.initial}>{site.title.slice(0, 1).toUpperCase()}</span>
          <span className={styles.suggestionText}>
            <strong>{site.title}</strong>
            <small>{site.domain}</small>
            <em>{contextFor(site)}</em>
          </span>
        </button>)}
      </GlassSurface>}
    </div>
    <GlassSurface role="control" className={styles.tools} aria-label="Вид и настройки">
      <button type="button" aria-label="Сетка" className={layoutMode === 'grid' ? styles.active : ''} onClick={() => setLayoutMode('grid')}><Grid2X2 size={17}/></button>
      <button type="button" aria-label="Список" className={layoutMode === 'list' ? styles.active : ''} onClick={() => setLayoutMode('list')}><List size={18}/></button>
      <span className={styles.divider}/>
      <button type="button" aria-label="Настройки" data-testid="settings-button" onClick={() => setSettingsOpen(true)}><Settings2 size={18}/></button>
    </GlassSurface>
  </header>;
}
