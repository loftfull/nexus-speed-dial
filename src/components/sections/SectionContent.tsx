import { CheckCircle2, Download, FileText, Search, Settings2, StickyNote } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { getSectionPresentation, seedDownloads, seedNotes, seedRecent } from '../../domain/sectionModel.ts';
import { seedSites } from '../../data/seed.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import { SiteTile } from '../tiles/SiteTile.tsx';
import styles from './SectionContent.module.css';

function SectionTitle({ section }: { section: 'favorites' | 'recent' | 'downloads' | 'notes' | 'settings' }) {
  const meta = getSectionPresentation(section);
  return <div className={styles.title}><div><h1>{meta.title}</h1><p>{meta.subtitle}</p></div></div>;
}

function FavoritesSection() {
  const preset = useAppStore(state => state.tileSettings.preset);
  const query = useAppStore(state => state.bookmarkQuery.toLowerCase().trim());
  const setQuery = useAppStore(state => state.setBookmarkQuery);
  const sites = seedSites.filter(site => site.favorite && (!query || `${site.title} ${site.subtitle ?? ''} ${site.domain}`.toLowerCase().includes(query)));
  return <><SectionTitle section="favorites"/><GlassSurface role="control" className={styles.search}><Search size={18}/><input value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="Поиск по избранному"/></GlassSurface><div className={styles.favoriteGrid}>{sites.map(site => <SiteTile key={site.id} site={site} mode={preset}/>)}</div></>;
}

function RecentSection() {
  const byId = new Map(seedSites.map(site => [site.id, site]));
  return <><SectionTitle section="recent"/><div className={styles.stack}>{(['Сегодня','Вчера','На этой неделе'] as const).map(group => { const items = seedRecent.filter(item => item.group === group); if (!items.length) return null; return <section key={group}><h3>{group}</h3><GlassSurface className={styles.table}>{items.map(item => { const site = byId.get(item.siteId); if (!site) return null; return <a key={item.id} href={site.url} className={styles.row}><span className={styles.letter}>{site.title.slice(0,1)}</span><strong>{site.title}</strong><span>{site.domain}</span><span>{site.subtitle}</span><time>{item.when}</time></a>; })}</GlassSurface></section>; })}</div></>;
}

function DownloadsSection() {
  return <><SectionTitle section="downloads"/><div className={styles.stack}><section><h3>Активные</h3>{seedDownloads.filter(item => item.status === 'active').map(item => <GlassSurface key={item.id} className={styles.downloadRow}><Download size={20}/><div className={styles.downloadMeta}><strong>{item.name}</strong><small>{item.source} · {item.size}</small><div className={styles.progress}><i style={{ width: `${item.progress}%` }}/></div></div><b>{item.progress}%</b></GlassSurface>)}</section><section><h3>Завершённые</h3>{seedDownloads.filter(item => item.status === 'completed').map(item => <GlassSurface key={item.id} className={styles.downloadRow}><CheckCircle2 size={20}/><div className={styles.downloadMeta}><strong>{item.name}</strong><small>{item.source} · {item.size}</small></div><button>Открыть</button></GlassSurface>)}</section></div></>;
}

function NotesSection() {
  return <><SectionTitle section="notes"/><div className={styles.notesHead}><GlassSurface role="control" className={styles.search}><Search size={18}/><input placeholder="Поиск по заметкам"/></GlassSurface><button className={styles.primary}><StickyNote size={17}/>Новая заметка</button></div><div className={styles.noteGrid}>{seedNotes.map(note => <GlassSurface key={note.id} className={styles.note}><FileText size={18}/><h3>{note.title}</h3><p>{note.body}</p><footer><span>{note.project}</span><time>{note.date}</time></footer></GlassSurface>)}</div></>;
}

function SettingsSection() {
  const openSettings = useAppStore(state => state.setSettingsOpen);
  return <><SectionTitle section="settings"/><div className={styles.settingsGrid}>{[
    ['Оформление','Стекло, прозрачность, тени и фон'],['Плитки сайтов','Размер, данные, эффекты и анимации'],['Sidebar','Часы, погода, проекты и категории'],['Поиск','Поисковик, подсказки и локальный поиск'],['Данные','Импорт, экспорт и резервные копии'],['Приватность','История и локальные данные']
  ].map(([title,subtitle], index) => <GlassSurface key={title} className={styles.settingCard}><Settings2 size={19}/><div><strong>{title}</strong><p>{subtitle}</p></div>{index === 1 && <button onClick={() => openSettings(true)}>Открыть</button>}</GlassSurface>)}</div></>;
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
