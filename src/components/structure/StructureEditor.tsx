import { Trash2, X } from 'lucide-react';
import type { ChangeEvent, FormEvent, MouseEvent } from 'react';
import { useEffect, useState } from 'react';
import { useAppStore } from '../../state/useAppStore.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import styles from './StructureEditor.module.css';

const slug = (value: string) => value.toLowerCase().trim().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/(^-|-$)/g, '');

export function StructureEditor() {
  const target = useAppStore(state => state.structureEditor);
  const setTarget = useAppStore(state => state.setStructureEditor);
  const spaces = useAppStore(state => state.spaces);
  const categories = useAppStore(state => state.categories);
  const sites = useAppStore(state => state.sites);
  const addSpace = useAppStore(state => state.addSpace);
  const updateSpace = useAppStore(state => state.updateSpace);
  const removeSpace = useAppStore(state => state.removeSpace);
  const addCategory = useAppStore(state => state.addCategory);
  const updateCategory = useAppStore(state => state.updateCategory);
  const removeCategory = useAppStore(state => state.removeCategory);
  const activeSpaceId = useAppStore(state => state.activeSpaceId);
  const existingSpace = target?.kind === 'space' && target.id ? spaces.find(item => item.id === target.id) : undefined;
  const existingCategory = target?.kind === 'category' && target.id ? categories.find(item => item.id === target.id) : undefined;
  const [name, setName] = useState('');
  const [spaceId, setSpaceId] = useState(activeSpaceId);
  const [parentId, setParentId] = useState('');

  useEffect(() => {
    setName(existingSpace?.name ?? existingCategory?.name ?? '');
    setSpaceId(existingCategory ? existingCategory.spaceId ?? existingCategory.projectId : activeSpaceId);
    setParentId(existingCategory?.parentId ?? '');
  }, [existingSpace, existingCategory, activeSpaceId]);

  if (!target) return null;
  const isSpace = target.kind === 'space';
  const hasChildren = !isSpace && Boolean(target.id && categories.some(category => category.parentId === target.id));
  const roots = categories.filter(category => (category.spaceId ?? category.projectId) === spaceId && !category.parentId && category.id !== target.id);
  const close = () => setTarget(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    if (isSpace) {
      if (target.id) updateSpace(target.id, { name: clean });
      else addSpace({ id: slug(clean), name: clean, icon: 'folder', position: spaces.length });
    } else {
      const safeParentId = hasChildren ? undefined : parentId || undefined;
      if (target.id) updateCategory(target.id, { name: clean, spaceId, projectId: spaceId, parentId: safeParentId });
      else addCategory({ id: slug(clean), name: clean, spaceId, projectId: spaceId, parentId: safeParentId, icon: 'tag', position: categories.length });
    }
    close();
  };
  const destroy = () => {
    if (!target.id) return;
    if (isSpace) {
      const hasSites = sites.some(site => (site.spaceId ?? site.projectId) === target.id);
      if (hasSites && !window.confirm('В пространстве есть сайты. Они будут перемещены в «Дом». Продолжить?')) return;
      removeSpace(target.id);
    } else {
      const childIds = categories.filter(category => category.parentId === target.id).map(category => category.id);
      const ids = new Set([target.id, ...childIds]);
      const hasSites = sites.some(site => site.categoryId && ids.has(site.categoryId));
      if (hasSites && !window.confirm('В категории есть сайты. Они останутся в пространстве без категории. Продолжить?')) return;
      removeCategory(target.id);
    }
    close();
  };

  return <div className={styles.layer} onMouseDown={close}>
    <GlassSurface role="popover" className={styles.card} onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}>
      <header><div><strong>{target.id ? 'Изменить' : 'Добавить'} {isSpace ? 'пространство' : 'категорию'}</strong><small>{isSpace ? 'Независимый набор сайтов Speed Dial' : 'Не более двух уровней вложенности'}</small></div><button aria-label="Закрыть" onClick={close}><X size={18}/></button></header>
      <form onSubmit={submit}>
        <label>Название<input autoFocus value={name} onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)} placeholder={isSpace ? 'Новое пространство' : 'Новая категория'}/></label>
        {!isSpace && <>
          <label>Пространство<select value={spaceId} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setSpaceId(event.target.value); setParentId(''); }}>{spaces.map(space => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label>
          <label>Родительская категория<select aria-describedby={hasChildren ? 'parent-category-hint' : undefined} disabled={hasChildren} value={hasChildren ? '' : parentId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setParentId(event.target.value)}><option value="">Без родителя</option>{roots.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{hasChildren && <small id="parent-category-hint" className={styles.hint}>Категория уже содержит подкатегории и должна оставаться верхнего уровня.</small>}</label>
        </>}
        <footer>{target.id && !(isSpace && target.id === 'home') ? <button type="button" className={styles.danger} onClick={destroy}><Trash2 size={15}/>Удалить</button> : <span/>}<div><button type="button" onClick={close}>Отмена</button><button className={styles.primary} type="submit">Сохранить</button></div></footer>
      </form>
    </GlassSurface>
  </div>;
}
