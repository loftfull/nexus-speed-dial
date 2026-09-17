import { useEffect, useMemo, useState } from 'react';
import { sites as countSites } from '../domain/plural';
import { resolveHistoryTarget, resolveSiteUrl } from '../domain/siteOpen';
import { buildWebSearchUrl, normalizeSearchEngine } from '../domain/webSearch';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { ArrowRight, BookmarkPlus, FolderOpen, Keyboard, Library, Search, Settings, StickyNote, X } from 'lucide-react';
import type { BrowserSession, SiteRecord } from '../domain/types';

type Action = { id: string; label: string; description: string; shortcut: string; icon: typeof Search; run: () => void };

type CommandPaletteProps = {
  sites: SiteRecord[];
  categories: { id: string; name: string }[];
  history: string[];
  sessions: BrowserSession[];
  searchEngine?: unknown;
  onOpenSession: (session: BrowserSession) => void;
  onOpenSite?: (site: SiteRecord) => void;
  onOpenHistory?: (item: string) => void;
  onOpenHistoryItem?: (item: string) => void;
  onCategory: (categoryId: string) => void;
  onClose: () => void;
  onAddSite: () => void;
  onSettings: () => void;
  onFavorites: () => void;
  onNotes: () => void;
};

export function CommandPalette({ sites, categories, history, sessions, searchEngine, onOpenSession, onOpenSite, onOpenHistory, onOpenHistoryItem, onCategory, onClose, onAddSite, onSettings, onFavorites, onNotes }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const dialogRef=useFocusTrap<HTMLElement>(true);
  const [selected, setSelected] = useState(0);
  const historyOpener=onOpenHistoryItem ?? onOpenHistory;
  const actions: Action[] = [
    { id: 'add', label: 'Добавить сайт', description: 'Сохранить новую ссылку в Speed Dial', shortcut: 'Ctrl N', icon: BookmarkPlus, run: onAddSite },
    { id: 'favorites', label: 'Открыть избранное', description: 'Показать отмеченные плитки', shortcut: 'Ctrl B', icon: Library, run: onFavorites },
    { id: 'notes', label: 'Открыть заметки', description: 'Перейти к заметкам и идеям', shortcut: '', icon: StickyNote, run: onNotes },
    { id: 'settings', label: 'Открыть настройки', description: 'Настроить плитки и рабочее пространство', shortcut: 'Ctrl ,', icon: Settings, run: onSettings },
  ];
  const results = useMemo(() => {
    const trimmedQuery = query.trim();
    const needle = trimmedQuery.toLowerCase();
    const siteResults = sites.filter(site => `${site.title} ${site.domain} ${site.desc} ${(site.tags ?? []).join(' ')}`.toLowerCase().includes(needle)).slice(0, 6).map(site => ({ id: `site-${site.id||site.domain}`, label: site.title, description: `${site.domain} · Плитка сайта`, shortcut: '', icon: Library, run: () => {
      if (onOpenSite) onOpenSite(site);
      else window.open(resolveSiteUrl(site), '_blank', 'noopener,noreferrer');
    } }));
    const categoryResults = categories.filter(category => category.name.toLowerCase().includes(needle)).slice(0, 3).map(category => ({ id: `category-${category.id}`, label: category.name, description: 'Категория в рабочем пространстве', shortcut: '', icon: FolderOpen, run: () => onCategory(category.id) }));
    const sessionResults = sessions.filter(session => session.name.toLowerCase().includes(needle)).slice(0, 3).map(session => ({ id: `session-${session.id}`, label: session.name, description: `${countSites(session.siteIds.length)} · рабочая сессия`, shortcut: '', icon: FolderOpen, run: () => { onOpenSession(session); } }));
    const historyResults = history.filter(item => item.toLowerCase().includes(needle) || sites.some(site => (site.id === item || site.domain === item || site.title === item) && `${site.title} ${site.domain}`.toLowerCase().includes(needle))).slice(0, 3).map(item => {
      const savedSite = sites.find(site => site.id === item || site.domain === item || site.title === item);
      return { id: `history-${item}`, label: savedSite?.title ?? item, description: `${savedSite?.domain ? `${savedSite.domain} · ` : ''}Недавно открытый ресурс`, shortcut: '', icon: ArrowRight, run: () => {
        if (historyOpener) historyOpener(item);
        else window.open(resolveHistoryTarget(item, sites).url, '_blank', 'noopener,noreferrer');
      } };
    });
    if (!needle) return actions;
    const provider = normalizeSearchEngine(searchEngine);
    const webSearchResult = {
      id: 'web-search',
      label: `Искать в ${provider}`,
      description: `Веб-поиск: ${trimmedQuery}`,
      shortcut: '',
      icon: Search,
      run: () => window.open(buildWebSearchUrl(provider, trimmedQuery), '_blank', 'noopener,noreferrer'),
    };
    return [...siteResults, ...categoryResults, ...sessionResults, ...historyResults, webSearchResult];
  }, [query, sites, categories, history, sessions, searchEngine, onCategory, onOpenSession, onOpenSite, historyOpener, onAddSite, onFavorites, onNotes, onSettings]);
  useEffect(() => { setSelected(0); }, [query]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(value => Math.min(value + 1, Math.max(results.length - 1, 0))); }
      if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(value => Math.max(value - 1, 0)); }
      if (event.key === 'Enter' && results[selected]) { event.preventDefault(); results[selected].run(); onClose(); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [results, selected, onClose]);
  return <div className="command-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} className="command-palette glass" role="dialog" aria-label="Центр команд"><header><Search size={19}/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Что вы хотите сделать?"/><kbd>Esc</kbd><button aria-label="Закрыть центр команд" onClick={onClose}><X size={17}/></button></header>{!query&&<div className="command-tabs"><b>Быстрые действия</b><span>Сайты · Категории · История</span></div>}<div className="command-results">{results.length ? results.map((item,index)=>{const Icon=item.icon;return <button className={'command-item '+(index===selected?'selected':'')} key={item.id} onMouseEnter={()=>setSelected(index)} onClick={()=>{item.run();onClose()}}><span className="command-icon"><Icon size={17}/></span><span><b>{item.label}</b><small>{item.description}</small></span>{item.shortcut&&<kbd>{item.shortcut}</kbd>}<ArrowRight size={15}/></button>}) : <div className="command-empty"><Search size={22}/><b>Ничего не найдено</b><span>Попробуйте название сайта, домен или категорию</span></div>}</div><footer><Keyboard size={14}/> ↑ ↓ навигация <span>Enter открыть</span><span>Esc закрыть</span></footer></section></div>;
}
