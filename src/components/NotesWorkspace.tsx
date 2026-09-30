import { Pencil } from '../app/icons.generated';
import { SiteIcon } from '../app/SiteIcon';
import type { SiteRecord } from '../domain/types';

/**
 * Заметки: карточки сайтов, у которых заметка есть.
 *
 * Раздел был единственным во всём приложении, который не попал в оформление.
 * Классы `notes-workspace`, `note-card`, `note-mini-icon` и `empty` не имели
 * ни одного правила ни в `theme.css`, ни в `browser-import.css`, поэтому
 * браузер рисовал его своими умолчаниями: подписи пустого состояния слипались
 * в строку («Заметок пока нетДобавьте заметку…») и лежали прямо на
 * фотографии. Проверено на собранном приложении: `getComputedStyle` у
 * `.notes-workspace` отдавал `display: block` без сетки и отступов.
 *
 * Пустое состояние здесь не своё: его рисует общий `Empty` в `App`, тот же,
 * что у корзины, избранного и сессий. Своё пустое состояние было третьей
 * причиной, по которой раздел выпадал из системы.
 *
 * Знак сайта берётся тем же `SiteIcon`, что и на плитке, поэтому в заметке
 * стоит настоящий фирменный логотип, а не первая буква названия.
 */
export function NotesWorkspace({ sites, onEdit, logos = true }: {
  sites: SiteRecord[];
  onEdit: (site: SiteRecord) => void;
  logos?: boolean;
}) {
  return (
    <div className="nx-notes">
      {sites.map(site => (
        <article className="nx-note" key={site.id ?? site.domain}>
          <div className="nx-note-head">
            <SiteIcon title={site.title} domain={site.domain} color={site.color}
              logos={logos} className="nx-mark nx-note-mark" />
            <span className="nx-note-name">
              <b>{site.title}</b>
              <small>{site.domain}</small>
            </span>
            <button type="button" className="nx-icon-btn"
              aria-label={`Редактировать заметку «${site.title}»`}
              onClick={() => onEdit(site)}>
              <Pencil size={15} aria-hidden="true" />
            </button>
          </div>
          <p className="nx-note-text">{site.note}</p>
        </article>
      ))}
    </div>
  );
}
