import { Pencil, StickyNote } from '../app/icons.generated';
import type { SiteRecord } from '../domain/types';

export function NotesWorkspace({ sites, onEdit }: { sites: SiteRecord[]; onEdit: (site: SiteRecord) => void }) {
  return <div className="notes-workspace">{sites.length ? sites.map(site => <article className="note-card glass" key={site.title}><div className="note-card-head"><div className="note-mini-icon" style={{ background: site.color }}>{site.icon}</div><div><b>{site.title}</b><small>{site.domain}</small></div><button aria-label={`Редактировать заметку ${site.title}`} onClick={() => onEdit(site)}><Pencil size={14}/></button></div><p>{site.note}</p></article>) : <div className="empty"><StickyNote size={30}/><b>Заметок пока нет</b><span>Добавьте заметку при создании или редактировании сайта</span></div>}</div>;
}
