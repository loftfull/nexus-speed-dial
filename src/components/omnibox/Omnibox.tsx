import { ArrowLeft, ArrowRight, Search, ShieldCheck, Star } from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { resolveOmnibox, suggestSites } from '../../domain/omnibox.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import styles from './Omnibox.module.css';

export function Omnibox() {
  const [query, setQuery] = useState('');
  const sites = useAppStore(state => state.sites);
  const recordVisit = useAppStore(state => state.recordVisit);
  const suggestions = useMemo(() => suggestSites(query, sites), [query, sites]);
  const resolution = useMemo(() => resolveOmnibox(query, sites), [query, sites]);
  const savedSite = resolution.kind === 'site';
  const secureAddress = resolution.kind === 'site'
    ? resolution.site.url.startsWith('https://')
    : resolution.kind === 'url' && resolution.url.startsWith('https://');
  const go = (url: string) => window.location.assign(url);
  const openSite = (id: string) => {
    const site = sites.find(item => item.id === id);
    if (!site) return;
    recordVisit(site.id);
    go(site.url);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (resolution.kind === 'site') {
      recordVisit(resolution.site.id);
      go(resolution.site.url);
    } else if (resolution.kind === 'url' || resolution.kind === 'search') {
      go(resolution.url);
    }
  };

  return <header className={styles.bar}>
    <div className={styles.nav}>
      <GlassSurface as="button" role="control" aria-label="Назад" onClick={() => history.back()}><ArrowLeft size={18}/></GlassSurface>
      <GlassSurface as="button" role="control" aria-label="Вперёд" onClick={() => history.forward()}><ArrowRight size={18}/></GlassSurface>
    </div>
    <div className={styles.searchArea}>
      <form onSubmit={submit}>
        <GlassSurface role="control" className={styles.box}>
          <Search size={18}/>
          <input aria-label="Введите запрос или адрес" placeholder="Введите запрос или адрес" value={query} onChange={event => setQuery(event.target.value)}/>
          <div className={styles.status} aria-live="polite">
            {savedSite && <Star aria-label="Сохранённый сайт" size={17} fill="currentColor"/>}
            {secureAddress && <ShieldCheck aria-label="HTTPS" size={17}/>} 
          </div>
        </GlassSurface>
      </form>
      {suggestions.length > 0 && <GlassSurface role="popover" className={styles.suggestions} data-testid="omnibox-suggestions">{suggestions.map(site => <button key={site.id} type="button" onClick={() => openSite(site.id)}><span>{site.title.slice(0, 1).toUpperCase()}</span><div><strong>{site.title}</strong><small>{site.domain}</small></div></button>)}</GlassSurface>}
    </div>
    <GlassSurface role="control" className={styles.profile} title="Локальный профиль Nexus" aria-label="Локальный профиль Nexus">N</GlassSurface>
  </header>;
}
