import { Trash2, X } from 'lucide-react';
import type { ChangeEvent, FormEvent, MouseEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../state/useAppStore.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import styles from './StructureEditor.module.css';

const slug = (value: string) => value.toLowerCase().trim().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/(^-|-$)/g, '');

export function StructureEditor() {
  const target = useAppStore(state => state.structureEditor);
  const setTarget = useAppStore(state => state.setStructureEditor);
  const projects = useAppStore(state => state.projects);
  const categories = useAppStore(state => state.categories);
  const addProject = useAppStore(state => state.addProject);
  const updateProject = useAppStore(state => state.updateProject);
  const removeProject = useAppStore(state => state.removeProject);
  const addCategory = useAppStore(state => state.addCategory);
  const updateCategory = useAppStore(state => state.updateCategory);
  const removeCategory = useAppStore(state => state.removeCategory);
  const activeProject = useAppStore(state => state.activeProjectId);
  const existing = useMemo(() => target?.kind === 'project' ? projects.find(item => item.id === target.id) : categories.find(item => item.id === target?.id), [target, projects, categories]);
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState(activeProject);
  const [parentId, setParentId] = useState('');

  useEffect(() => {
    setName(existing?.name ?? '');
    setProjectId(target?.kind === 'category' && existing && 'projectId' in existing ? existing.projectId : activeProject);
    setParentId(target?.kind === 'category' && existing && 'parentId' in existing ? existing.parentId ?? '' : '');
  }, [target, existing, activeProject]);

  if (!target) return null;
  const isProject = target.kind === 'project';
  const hasChildren = !isProject && Boolean(target.id && categories.some(category => category.parentId === target.id));
  const roots = categories.filter(category => category.projectId === projectId && !category.parentId && category.id !== target.id);
  const close = () => setTarget(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    if (isProject) {
      target.id ? updateProject(target.id, { name: clean }) : addProject({ id: slug(clean), name: clean, icon: 'folder' });
    } else {
      const safeParentId = hasChildren ? undefined : parentId || undefined;
      target.id ? updateCategory(target.id, { name: clean, projectId, parentId: safeParentId }) : addCategory({ id: slug(clean), name: clean, projectId, parentId: safeParentId, icon: 'tag' });
    }
    close();
  };
  const destroy = () => {
    if (!target.id) return;
    isProject ? removeProject(target.id) : removeCategory(target.id);
    close();
  };

  return <div className={styles.layer} onMouseDown={close}>
    <GlassSurface role="popover" className={styles.card} onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}>
      <header><div><strong>{target.id ? 'Изменить' : 'Добавить'} {isProject ? 'проект' : 'категорию'}</strong><small>{isProject ? 'Рабочее пространство Speed Dial' : 'Не более двух уровней вложенности'}</small></div><button aria-label="Закрыть" onClick={close}><X size={18}/></button></header>
      <form onSubmit={submit}>
        <label>Название<input autoFocus value={name} onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)} placeholder={isProject ? 'Новый проект' : 'Новая категория'}/></label>
        {!isProject && <>
          <label>Проект<select value={projectId} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setProjectId(event.target.value); setParentId(''); }}>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label>Родительская категория<select aria-describedby={hasChildren ? 'parent-category-hint' : undefined} disabled={hasChildren} value={hasChildren ? '' : parentId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setParentId(event.target.value)}><option value="">Без родителя</option>{roots.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{hasChildren && <small id="parent-category-hint" className={styles.hint}>Категория уже содержит подразделы и должна оставаться верхнего уровня.</small>}</label>
        </>}
        <footer>{target.id && !(isProject && target.id === 'home') ? <button type="button" className={styles.danger} onClick={destroy}><Trash2 size={15}/>Удалить</button> : <span/>}<div><button type="button" onClick={close}>Отмена</button><button className={styles.primary} type="submit">Сохранить</button></div></footer>
      </form>
    </GlassSurface>
  </div>;
}
