import { useEffect, useState } from 'react';
import { LoaderCircle, X } from '../app/icons.generated';
import type { SiteRecord as Site } from '../domain/types';
import { normalizeSiteAddress } from '../domain/siteUtils';
import { useFocusTrap } from '../hooks/useFocusTrap';

const COLORS = ['#2f7cf6', '#885cf6', '#e95674', '#ef9e35', '#22a87c', '#1c9dbb'];

type Props = {
  onClose: () => void;
  onSave: (site: Site) => void;
  existing?: Site;
  categories: { id: string; name: string }[];
  groups?: { id: string; name: string; categoryId: string }[];
  allowRemoteMetadata?: boolean;
  allowRemotePreview?: boolean;
};

/**
 * Форма добавления и правки сайта.
 *
 * Разметка переведена в словарь проекта. Прежде она была написана на именах
 * вне пространства `nx-` — `overlay`, `site-form`, `eyebrow`, `close`,
 * `form-colors`, `reset`, `save`, — и часть из них повторяла то, что в
 * приложении уже есть: надстрочная подпись — это `nx-label`, кнопка-иконка —
 * `nx-icon-btn`, ряд цветов — `nx-swatches`, пара кнопок внизу — те же
 * `nx-dialog-cancel` и `primary`, что у диалога подтверждения. Форма теперь
 * говорит на том же языке, а не на своём.
 */
export function AddSiteModal({
  onClose, onSave, existing, categories, groups = [],
  allowRemoteMetadata = false, allowRemotePreview = true,
}: Props) {
  const [title, setTitle] = useState(existing?.title || '');
  const [domain, setDomain] = useState(existing?.url || existing?.domain || '');
  const [desc, setDesc] = useState(existing?.desc || '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId || categories[0]?.id || '');
  const [groupId, setGroupId] = useState(existing?.groupId || '');
  const [note, setNote] = useState(existing?.note || '');
  const [tags, setTags] = useState((existing?.tags || []).join(', '));
  const [color, setColor] = useState(existing?.color || COLORS[0]);
  const [error, setError] = useState('');
  // «Тронул» значит, что пользователь уже написал своё: подгруженные данные
  // сайта не должны затирать введённое руками.
  const [titleTouched, setTitleTouched] = useState(Boolean(existing?.title));
  const [descTouched, setDescTouched] = useState(Boolean(existing?.desc));
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const dialogRef = useFocusTrap<HTMLFormElement>(true);

  const groupOptions = groups.filter(group => group.categoryId === categoryId);

  useEffect(() => {
    if (existing || !allowRemoteMetadata || domain.trim().length < 4) return;
    const address = normalizeSiteAddress(domain);
    if (!address) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setLoaded(false);
      try {
        const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(address.url)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('metadata unavailable');
        const result = await response.json();
        const data = result.data || {};
        if (!titleTouched && data.title) setTitle(String(data.title).trim());
        if (!descTouched && data.description) setDesc(String(data.description).trim());
        setLoaded(true);
      } catch {
        setLoaded(false);
      } finally {
        setLoading(false);
      }
    }, 650);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [domain, existing, titleTouched, descTouched, allowRemoteMetadata]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !domain.trim()) return;
    const address = normalizeSiteAddress(domain);
    if (!address) {
      setError('Введите корректный http(s)-адрес, например example.com/docs');
      return;
    }
    setError('');
    onSave({
      ...existing,
      id: existing?.id || `site-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      domain: address.domain,
      url: address.url,
      desc: desc.trim() || 'Сохранённый сайт',
      note: note.trim(),
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      color,
      icon: title.trim()[0].toUpperCase(),
      categoryId,
      groupId: groupId || undefined,
      category: categories.find(item => item.id === categoryId)?.name || existing?.category || 'Без категории',
      screenshotUrl: existing?.screenshotUrl
        || (allowRemotePreview ? `https://image.thum.io/get/width/900/crop/420/${address.url}` : undefined),
    });
  };

  return (
    <div className="nx-overlay">
      <form ref={dialogRef} className="nx-site-form" role="dialog" aria-modal="true"
        aria-labelledby="site-form-title" onSubmit={submit}>
        <header>
          <div>
            <span className="nx-label">Быстрый доступ</span>
            <h2 id="site-form-title">{existing ? 'Редактировать сайт' : 'Добавить сайт'}</h2>
            <p>Сохраните любимый сайт в одну плитку</p>
          </div>
          <button type="button" className="nx-icon-btn" aria-label="Закрыть форму" onClick={onClose}><X size={18} /></button>
        </header>

        <label>Название
          <input autoFocus value={title} placeholder="Например, Linear"
            onChange={event => { setTitleTouched(true); setTitle(event.target.value); }} />
        </label>

        <label>Адрес сайта
          <input value={domain} aria-invalid={Boolean(error)}
            aria-describedby={error ? 'site-domain-error' : undefined} placeholder="linear.app"
            onChange={event => { setDomain(event.target.value); setLoaded(false); setError(''); }} />
        </label>
        {error && <small id="site-domain-error" className="nx-form-error" role="alert">{error}</small>}
        {loading && <small className="nx-form-status"><LoaderCircle size={12} /> Загружаем данные сайта…</small>}
        {loaded && !loading && <small className="nx-form-status ready">Данные сайта подгружены</small>}

        <label>Категория
          <select value={categoryId} onChange={event => { setCategoryId(event.target.value); setGroupId(''); }}>
            {categories.length
              ? categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)
              : <option value="">Нет категорий</option>}
          </select>
        </label>

        <label>Группа
          <select value={groupId} disabled={!groupOptions.length} onChange={event => setGroupId(event.target.value)}>
            <option value="">{groupOptions.length ? 'Без группы' : 'Групп нет'}</option>
            {groupOptions.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>

        <label>Описание
          <input value={desc} placeholder="Короткое описание"
            onChange={event => { setDescTouched(true); setDesc(event.target.value); }} />
        </label>

        {/* Заметка — это текст, а не подпись: её читают в разделе «Заметки»
            целым абзацем, поэтому и вводить её нужно в поле, где видно больше
            одной строки. */}
        <label>Заметка
          <textarea value={note} rows={3} placeholder="Личная заметка (необязательно)"
            onChange={event => setNote(event.target.value)} />
        </label>

        <label>Теги
          <input value={tags} placeholder="дизайн, работа, важное"
            onChange={event => setTags(event.target.value)} />
        </label>

        <label>Цвет иконки
          <span className="nx-swatches">
            {COLORS.map(item => (
              <button type="button" key={item} style={{ background: item }}
                className={color === item ? 'on' : undefined}
                aria-label={`Цвет ${item}`} aria-pressed={color === item}
                onClick={() => setColor(item)} />
            ))}
          </span>
        </label>

        <footer>
          <button type="button" className="nx-dialog-cancel" onClick={onClose}>Отмена</button>
          <button type="submit" className="primary" disabled={!title.trim() || !domain.trim()}>
            {existing ? 'Сохранить' : 'Добавить сайт'}
          </button>
        </footer>
      </form>
    </div>
  );
}
