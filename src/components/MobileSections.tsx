import { ChevronRight, Folder, Plus, X } from 'lucide-react';
import type { ComponentType } from 'react';

type SectionIcon = ComponentType<{ size?: number }>;
type MobileProject = { id: string; name: string };

export function MobileSections({
  active,
  setActive,
  onClose,
  onSelect,
  items,
  projects = [],
  activeProjectId = null,
  onProjectSelect,
  onAddProject,
}: {
  active: string;
  setActive: (s: string) => void;
  onClose: () => void;
  onSelect?: (s: string) => void;
  items: readonly (readonly [string, SectionIcon])[];
  projects?: readonly MobileProject[];
  activeProjectId?: string | null;
  onProjectSelect?: (id: string) => void;
  onAddProject?: () => void;
}) {
  const select = (label: string) => {
    if (onSelect) onSelect(label);
    else if (label === 'Настройки') window.dispatchEvent(new KeyboardEvent('keydown', { key: ',', ctrlKey: true, bubbles: true }));
    else setActive(label);
    onClose();
  };
  const selectProject = (id: string) => {
    onProjectSelect?.(id);
    onClose();
  };

  return (
    <div className="overlay mobile-sheet">
      <section className="mobile-sections-card glass" role="dialog" aria-label="Разделы и проекты">
        <header>
          <b>Разделы и проекты</b>
          <button aria-label="Закрыть разделы" onClick={onClose}><X /></button>
        </header>
        {items.map(([label, Icon]) => (
          <button className={active === label ? 'active' : ''} key={label} onClick={() => select(label)}>
            <Icon size={18} />{label}<ChevronRight size={15} />
          </button>
        ))}
        {(projects.length > 0 || onAddProject) && <span className="mobile-sections-label">Проекты</span>}
        {projects.map(project => (
          <button
            className={activeProjectId === project.id ? 'active mobile-project' : 'mobile-project'}
            key={project.id}
            aria-label={`Проект «${project.name}»`}
            onClick={() => selectProject(project.id)}
          >
            <Folder size={18} />{project.name}<ChevronRight size={15} />
          </button>
        ))}
        {onAddProject && (
          <button className="mobile-project-add" aria-label="Добавить проект" onClick={() => { onAddProject(); onClose(); }}>
            <Plus size={18} />Добавить проект<ChevronRight size={15} />
          </button>
        )}
      </section>
    </div>
  );
}
