import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookmarkPlus, FolderOpen, Keyboard, Library, Search, Settings, StickyNote, X } from 'lucide-react';
import type { BrowserSession, SiteRecord } from '../domain/types';

type Action = { id: string; label: string; description: string; shortcut: string; icon: typeof Search; run: () => void };

export function CommandPalette({ sites, categories, history, sessions, onOpenSession, onCategory, onClose, onAddSite, onSettings, onFavorites, onNotes }: { sites: SiteRecord[]; categories: string[]; history: string[]; sessions: BrowserSession[]; onOpenSession: (session: BrowserSession) => void; onCategory: (category: string) => void; onClose: () => void; onAddSite: () => void; onSettings: () => void; onFavorites: () => void; onNotes: () => void }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const actions: Action[] = [
    { id: 'add', label: 'Добавить сайт', description: 'Сохранить новую ссылку в Speed Dial', shortcut: 'Ctrl N', icon: BookmarkPlus, run: onAddSite },
    { id: 'favorites', label: 'Открыть избранное', description: 'Показать отмеченные плитки', shortcut: 'Ctrl B', icon: Library, run: onFavorites },
    { id: 'notes', label: 'Открыть заметки', description: 'Перейти к заметкам и идеям', shortcut: '', icon: StickyNote, run: onNotes },
    { id: 'settings', label: 'Открыть настройки', description: 'Настроить плитки и рабочее пространство', shortcut: 'Ctrl ,', icon: Settings, run: onSettings },
  ];
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const siteResults = sites.filter(site => `${site.title} ${site.domain} ${site.desc} ${(site.tags ?? []).join(' ')}`.toLowerCase().includes(needle)).slice(0, 6).map(site => ({ id: `site-${site.title}`, label: site.title, description: `${site.domain} · Плитка сайта`, shortcut: '', icon: Library, run: () => window.open(`https://${site.domain}`, '_blank', 'noopener,noreferrer') }));
    const categoryResults = categories.filter(category => category.toLowerCase().includes(needle)).slice(0, 3).map(category => ({ id: `category-${category}`, label: category, description: 'Категория в рабочем пространстве', shortcut: '', icon: FolderOpen, run: () => onCategory(category) }));
    const sessionResults = sessions.filter(session => session.name.toLowerCase().includes(needle)).slice(0, 3).map(session => ({ id: `session-${session.id}`, label: session.name, description: `${session.siteIds.length} сайтов · рабочая сессия`, shortcut: '', icon: FolderOpen, run: () => { onOpenSession(session); } }));
    const historyResults = history.filter(item => item.toLowerCase().includes(needle)).slice(0, 3).map(item => ({ id: `history-${item}`, label: item, description: 'Недавно открытый ресурс', shortcut: '', icon: ArrowRight, run: () => window.open(/^https?:\/\//.test(item) ? item : `https://${item}`, '_blank', 'noopener,noreferrer') }));
    return needle ? [...siteResults, ...categoryResults, ...sessionResults, ...historyResults] : actions;
  }, [query, sites, categories, history, sessions, onCategory, onOpenSession]);
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
  return <div className="command-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="command-palette glass" role="dialog" aria-label="Центр команд"><header><Search size={19}/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Что вы хотите сделать?"/><kbd>Esc</kbd><button aria-label="Закрыть центр команд" onClick={onClose}><X size={17}/></button></header>{!query&&<div className="command-tabs"><b>Быстрые действия</b><span>Сайты · Категории · История</span></div>}<div className="command-results">{results.length ? results.map((item,index)=>{const Icon=item.icon;return <button className={'command-item '+(index===selected?'selected':'')} key={item.id} onMouseEnter={()=>setSelected(index)} onClick={()=>{item.run();onClose()}}><span className="command-icon"><Icon size={17}/></span><span><b>{item.label}</b><small>{item.description}</small></span>{item.shortcut&&<kbd>{item.shortcut}</kbd>}<ArrowRight size={15}/></button>}) : <div className="command-empty"><Search size={22}/><b>Ничего не найдено</b><span>Попробуйте название сайта, домен или категорию</span></div>}</div><footer><Keyboard size={14}/> ↑ ↓ навигация <span>Enter открыть</span><span>Esc закрыть</span></footer></section></div>;
}
