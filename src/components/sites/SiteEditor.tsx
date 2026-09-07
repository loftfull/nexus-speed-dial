import { X } from 'lucide-react';
import type { ChangeEvent, FormEvent, MouseEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { faviconUrlFor } from '../../domain/siteIcon.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import { normalizeSiteUrl } from './siteEditorModel.ts';
import styles from './SiteEditor.module.css';

export function SiteEditor() {
  const target = useAppStore(state => state.siteEditor);
  const setTarget = useAppStore(state => state.setSiteEditor);
  const sites = useAppStore(state => state.sites);
  const spaces = useAppStore(state => state.spaces);
  const categories = useAppStore(state => state.categories);
  const addSite = useAppStore(state => state.addSite);
  const updateSite = useAppStore(state => state.updateSite);
  const activeSpaceId = useAppStore(state => state.activeSpaceId);
  const existing = useMemo(() => target && target !== 'new' ? sites.find(site => site.id === target) : undefined, [target, sites]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [spaceId, setSpaceId] = useState(activeSpaceId);
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(existing?.title ?? '');
    setUrl(existing?.url ?? '');
    setSubtitle(existing?.subtitle ?? '');
    setSpaceId(existing ? existing.spaceId ?? existing.projectId : activeSpaceId);
    setCategoryId(existing?.categoryId ?? '');
    setError('');
  }, [existing, target, activeSpaceId]);

  if (!target) return null;
  const close = () => setTarget(null);
  const allowedCategories = categories.filter(category => (category.spaceId ?? category.projectId) === spaceId);
  const nextPosition = sites.filter(site => (site.spaceId ?? site.projectId) === spaceId).reduce((max, site) => Math.max(max, site.position ?? -1), -1) + 1;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeSiteUrl(url);
    if (!normalized) { setError('Введите корректный http/https адрес'); return; }
    const cleanTitle = title.trim() || normalized.domain;
    const payload = {
      title: cleanTitle,
      url: normalized.url,
      domain: normalized.domain,
      subtitle: subtitle.trim() || undefined,
      spaceId,
      projectId: spaceId,
      categoryId: categoryId || undefined,
      iconUrl: faviconUrlFor(normalized.url),
      favorite: existing?.favorite ?? false,
      position: existing?.position ?? nextPosition,
    };
    if (existing) updateSite(existing.id, payload);
    else addSite({ id: normalized.domain.replace(/[^a-z0-9]+/gi, '-'), ...payload });
    close();
  };

  return <div className={styles.layer} onMouseDown={close}>
    <GlassSurface role="popover" className={styles.card} onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}>
      <header><div><strong>{existing ? 'Изменить сайт' : 'Добавить сайт'}</strong><small>{existing ? 'Адрес, подпись и расположение' : 'Сайт появится в текущем Speed Dial'}</small></div><button aria-label="Закрыть" onClick={close}><X size={18}/></button></header>
      <form onSubmit={submit}>
        <label>Адрес<input autoFocus value={url} onChange={(event: ChangeEvent<HTMLInputElement>) => setUrl(event.target.value)} placeholder="example.com"/></label>
        {error && <p className={styles.error}>{error}</p>}
        <label>Название<input value={title} onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)} placeholder="Автоматически из домена"/></label>
        <label>Описание<input value={subtitle} onChange={(event: ChangeEvent<HTMLInputElement>) => setSubtitle(event.target.value)} placeholder="Короткая подпись"/></label>
        <div className={styles.row}>
          <label>Пространство<select value={spaceId} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setSpaceId(event.target.value); setCategoryId(''); }}>{spaces.map(space => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label>
          <label>Категория<select value={categoryId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setCategoryId(event.target.value)}><option value="">Без категории</option>{allowedCategories.map(category => <option key={category.id} value={category.id}>{category.parentId ? '↳ ' : ''}{category.name}</option>)}</select></label>
        </div>
        <footer><span/><div><button type="button" onClick={close}>Отмена</button><button className={styles.primary} type="submit">Сохранить</button></div></footer>
      </form>
    </GlassSurface>
  </div>;
}
