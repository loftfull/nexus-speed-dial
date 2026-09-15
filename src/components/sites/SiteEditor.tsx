import { Star, X } from 'lucide-react';
import type { ChangeEvent, FormEvent, MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { faviconProviders, faviconUrlFor } from '../../domain/siteIcon.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import { normalizeSiteUrl } from './siteEditorModel.ts';
import styles from './SiteEditor.module.css';

type UrlStatus = 'idle' | 'checking' | 'valid' | 'invalid';

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
  const [favorite, setFavorite] = useState(false);
  const [error, setError] = useState('');
  const [urlStatus, setUrlStatus] = useState<UrlStatus>('idle');
  const [iconUrl, setIconUrl] = useState('');
  const [iconFailed, setIconFailed] = useState(false);
  const titleTouched = useRef(false);
  const subtitleTouched = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setTitle(existing?.title ?? '');
    setUrl(existing?.url ?? '');
    setSubtitle(existing?.subtitle ?? '');
    setSpaceId(existing ? existing.spaceId ?? existing.projectId : activeSpaceId);
    setCategoryId(existing?.categoryId ?? '');
    setFavorite(existing?.favorite ?? false);
    setIconUrl(existing?.iconUrl ?? '');
    setIconFailed(false);
    setUrlStatus(existing ? 'valid' : 'idle');
    setError('');
    titleTouched.current = !!existing?.title;
    subtitleTouched.current = !!existing?.subtitle;
  }, [existing, target, activeSpaceId]);

  const tryFetchTitle = useCallback(async (normalizedUrl: string, signal: AbortSignal) => {
    try {
      const response = await fetch(normalizedUrl, { signal, mode: 'cors', redirect: 'follow' });
      if (!response.ok || !response.headers.get('content-type')?.includes('html')) return;
      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && !titleTouched.current) {
        const fetched = titleMatch[1].trim().slice(0, 120);
        if (fetched) setTitle(fetched);
      }
      if (!subtitleTouched.current) {
        const ogMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
          ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
        if (ogMatch) {
          const desc = ogMatch[1].trim().slice(0, 120);
          if (desc) setSubtitle(desc);
        }
      }
    } catch { /* CORS or network — title stays as-is */ }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = url.trim();
    if (!trimmed) {
      setUrlStatus('idle');
      setIconUrl('');
      setIconFailed(false);
      return;
    }

    const normalized = normalizeSiteUrl(trimmed);
    if (!normalized) {
      setUrlStatus('invalid');
      setIconUrl('');
      setIconFailed(false);
      return;
    }

    setUrlStatus('checking');
    setIconFailed(false);
    const providers = faviconProviders(normalized.url);
    setIconUrl(providers[0]);

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      setUrlStatus('valid');
      void tryFetchTitle(normalized.url, controller.signal);
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [url, tryFetchTitle]);

  useEffect(() => () => abortRef.current?.abort(), []);

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
      iconUrl: iconUrl || faviconUrlFor(normalized.url),
      favorite,
      position: existing?.position ?? nextPosition,
    };
    if (existing) updateSite(existing.id, payload);
    else addSite({ id: normalized.domain.replace(/[^a-z0-9]+/gi, '-'), ...payload });
    close();
  };

  const normalizedInput = normalizeSiteUrl(url);
  const providers = normalizedInput ? faviconProviders(normalizedInput.url) : [];

  return <div className={styles.layer} onMouseDown={close}>
    <GlassSurface role="popover" className={styles.card} onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}>
      <header><div><strong>{existing ? 'Изменить сайт' : 'Добавить сайт'}</strong><small>{existing ? 'Адрес, подпись и расположение' : 'Сайт появится в текущем Speed Dial'}</small></div><button aria-label="Закрыть" onClick={close}><X size={18}/></button></header>
      <form onSubmit={submit}>
        <label>Адрес
          <div className={styles.urlRow}>
            <input
              autoFocus
              value={url}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setUrl(event.target.value)}
              placeholder="example.com"
              className={urlStatus === 'invalid' ? styles.inputError : urlStatus === 'valid' ? styles.inputValid : ''}
            />
            {urlStatus === 'checking' && <span className={styles.urlHint}>Проверка…</span>}
            {urlStatus === 'valid' && <span className={styles.urlOk}>OK</span>}
            {urlStatus === 'invalid' && <span className={styles.urlError}>Некорректный URL</span>}
          </div>
        </label>
        {error && <p className={styles.error}>{error}</p>}

        {urlStatus === 'valid' && iconUrl && (
          <div className={styles.preview}>
            {!iconFailed ? (
              <img
                src={iconUrl}
                alt=""
                className={styles.previewIcon}
                onError={() => {
                  const next = providers.indexOf(iconUrl) + 1;
                  if (next < providers.length) setIconUrl(providers[next]);
                  else setIconFailed(true);
                }}
              />
            ) : (
              <div className={styles.previewFallback}>{(url.trim().charAt(0) || '?').toUpperCase()}</div>
            )}
            <span className={styles.previewDomain}>{normalizedInput?.domain ?? ''}</span>
          </div>
        )}

        <label>Название<input value={title} onChange={(event: ChangeEvent<HTMLInputElement>) => { titleTouched.current = true; setTitle(event.target.value); }} placeholder="Автоматически из домена"/></label>
        <label>Описание<input value={subtitle} onChange={(event: ChangeEvent<HTMLInputElement>) => { subtitleTouched.current = true; setSubtitle(event.target.value); }} placeholder="Короткая подпись"/></label>

        <button type="button" className={`${styles.favorite} ${favorite ? styles.favoriteOn : ''}`} onClick={() => setFavorite(v => !v)}>
          <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
          <span>{favorite ? 'В избранном' : 'Добавить в избранное'}</span>
        </button>

        <div className={styles.row}>
          <label>Пространство<select value={spaceId} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setSpaceId(event.target.value); setCategoryId(''); }}>{spaces.map(space => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label>
          <label>Категория<select value={categoryId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setCategoryId(event.target.value)}><option value="">Без категории</option>{allowedCategories.map(category => <option key={category.id} value={category.id}>{category.parentId ? '↳ ' : ''}{category.name}</option>)}</select></label>
        </div>
        <footer><span/><div><button type="button" onClick={close}>Отмена</button><button className={styles.primary} type="submit">Сохранить</button></div></footer>
      </form>
    </GlassSurface>
  </div>;
}
