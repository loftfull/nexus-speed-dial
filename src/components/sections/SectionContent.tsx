import { Download, FileText, Search, Settings2, StickyNote, Trash2, X } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import { getSectionPresentation } from '../../domain/sectionModel.ts';
import type { StoredNote } from '../../domain/types.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import { SiteTile } from '../tiles/SiteTile.tsx';
import { DataControls } from './DataControls.tsx';
import styles from './SectionContent.module.css';

function SectionTitle({ section }: { section: 'favorites' | 'recent' | 'downloads' | 'notes' | 'settings' }) {
  const meta = getSectionPresentation(section);
  return <div className={styles.title}><div><h1>{meta.title}</h1><p>{meta.subtitle}</p></div></div>;
}

function FavoritesSection() {
  const preset = useAppStore(state => state.tileSettings.preset);
  const query = useAppStore(state => state.bookmarkQuery.toLowerCase().trim());
  const setQuery = useAppStore(state => state.setBookmarkQuery);
  const sites = useAppStore(state => state.sites).filter(site => site.favorite && (!query || `${site.title} ${site.subtitle ?? ''} ${site.domain}`.toLowerCase().includes(query)));
  return <><SectionTitle section="favorites"/><GlassSurface role="control" className={styles.search}><Search size={18}/><input value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="Поиск по избранному"/></GlassSurface><div className={styles.favoriteGrid}>{sites.map(site => <SiteTile key={site.id} site={site} mode={preset}/>)}</div>{sites.length === 0 && <EmptyState text="В избранном пока ничего нет"/>}</>;
}

function groupFor(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((a - b) / 86400000);
  return diff <= 0 ? 'Сегодня' : diff === 1 ? 'Вчера' : 'На этой неделе';
}

function RecentSection() {
  const history = useAppStore(state => state.history);
  const sites = useAppStore(state => state.sites);
  const clearHistory = useAppStore(state => state.clearHistory);
  const byId = new Map(sites.map(site => [site.id, site]));
  const rows = history.map(item => ({ item, site: byId.get(item.siteId) })).filter(row => row.site);
  return <><div className={styles.titleRow}><SectionTitle section="recent"/>{history.length > 0 && <button className={styles.secondary} onClick={clearHistory}>Очистить</button>}</div>{rows.length === 0 ? <EmptyState text="История пока пуста"/> : <div className={styles.stack}>{(['Сегодня','Вчера','На этой неделе'] as const).map(group => { const items = rows.filter(row => groupFor(row.item.openedAt) === group); if (!items.length) return null; return <section key={group}><h3>{group}</h3><GlassSurface className={styles.table}>{items.map(({ item, site }) => <a key={item.id} href={site!.url} className={styles.row}><span className={styles.letter}>{site!.title.slice(0,1)}</span><strong>{site!.title}</strong><span>{site!.domain}</span><span>{site!.subtitle}</span><time>{new Date(item.openedAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</time></a>)}</GlassSurface></section>; })}</div>}</>;
}

function DownloadsSection() {
  return <><SectionTitle section="downloads"/><EmptyState text="Загрузок пока нет" icon="download"/></>;
}

function NotesSection() {
  const notes = useAppStore(state => state.notes);
  const projects = useAppStore(state => state.projects);
  const addNote = useAppStore(state => state.addNote);
  const updateNote = useAppStore(state => state.updateNote);
  const removeNote = useAppStore(state => state.removeNote);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<StoredNote | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [projectId, setProjectId] = useState('home');
  const filtered = notes.filter(note => `${note.title} ${note.body}`.toLowerCase().includes(query.toLowerCase()));
  const reset = () => { setOpen(false); setEditing(null); setTitle(''); setBody(''); setProjectId('home'); };
  const edit = (note: StoredNote) => { setEditing(note); setTitle(note.title); setBody(note.body); setProjectId(note.projectId ?? 'home'); setOpen(true); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() && !body.trim()) return;
    if (editing) updateNote(editing.id, { title: title.trim() || 'Без названия', body: body.trim(), projectId });
    else addNote({ title: title.trim() || 'Без названия', body: body.trim(), projectId });
    reset();
  };
  return <><SectionTitle section="notes"/><div className={styles.notesHead}><GlassSurface role="control" className={styles.search}><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Поиск по заметкам"/></GlassSurface><button className={styles.primary} onClick={() => setOpen(true)}><StickyNote size={17}/>Новая заметка</button></div>{open && <GlassSurface className={styles.noteForm}><form onSubmit={submit}><div className={styles.formTop}><strong>{editing ? 'Изменить заметку' : 'Новая заметка'}</strong><button type="button" onClick={reset}><X size={16}/></button></div><input value={title} onChange={event => setTitle(event.target.value)} placeholder="Заголовок"/><textarea value={body} onChange={event => setBody(event.target.value)} placeholder="Текст заметки" rows={4}/><select value={projectId} onChange={event => setProjectId(event.target.value)}>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button className={styles.primary} type="submit">Сохранить</button></form></GlassSurface>}<div className={styles.noteGrid}>{filtered.map(note => <GlassSurface key={note.id} className={styles.note}><div className={styles.noteActions}><button onClick={() => edit(note)}>Изменить</button><button aria-label={`Удалить ${note.title}`} onClick={() => removeNote(note.id)}><Trash2 size={14}/></button></div><FileText size={18}/><h3>{note.title}</h3><p>{note.body}</p><footer><span>{projects.find(project => project.id === note.projectId)?.name ?? 'Без проекта'}</span><time>{new Date(note.updatedAt).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}</time></footer></GlassSurface>)}</div>{filtered.length === 0 && !open && <EmptyState text="Заметок пока нет"/>}</>;
}

function SettingsSection() {
  const openSettings = useAppStore(state => state.setSettingsOpen);
  const cards = [
    ['Оформление','Стекло, прозрачность, тени и фон'],
    ['Плитки сайтов','Размер, данные, эффекты и анимации'],
    ['Sidebar','Часы, погода, проекты и категории'],
    ['Поиск','Поисковик, подсказки и локальный поиск'],
    ['Приватность','История и локальные данные'],
  ] as const;
  return <><SectionTitle section="settings"/><div className={styles.settingsGrid}>{cards.map(([title, subtitle], index) => <GlassSurface key={title} className={styles.settingCard}><Settings2 size={19}/><div><strong>{title}</strong><p>{subtitle}</p></div>{index === 1 && <button onClick={() => openSettings(true)}>Открыть</button>}</GlassSurface>)}<GlassSurface className={`${styles.settingCard} ${styles.dataCard}`}><Settings2 size={19}/><div><strong>Данные</strong><p>Резервная копия всех локальных данных Nexus</p><DataControls/></div></GlassSurface></div></>;
}

function EmptyState({ text, icon = 'note' }: { text: string; icon?: 'note' | 'download' }) {
  const Icon = icon === 'download' ? Download : StickyNote;
  return <GlassSurface className={styles.empty}><Icon size={22}/><strong>{text}</strong></GlassSurface>;
}

export function SectionContent() {
  const section = useAppStore(state => state.section);
  if (section === 'favorites') return <FavoritesSection/>;
  if (section === 'recent') return <RecentSection/>;
  if (section === 'downloads') return <DownloadsSection/>;
  if (section === 'notes') return <NotesSection/>;
  if (section === 'settings') return <SettingsSection/>;
  return null;
}
