import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Folder, Home, Layers3, Tag } from './icons.generated';

export type CrumbOption = { id: string; name: string; count?: number };

/**
 * Звено цепочки — одновременно и указатель пути, и переключатель.
 *
 * Обычные крошки только сообщают, где вы находитесь, и чтобы сменить ветку,
 * приходится возвращаться назад. Здесь каждое звено раскрывается списком
 * соседей: из «Программирование» видно «Дизайн» и «DevOps», и переход в
 * соседнюю категорию стоит одного нажатия вместо трёх.
 */
export function Crumb({ kind, current, options, onPick, onClear }: {
  kind: 'space' | 'category' | 'group';
  current: CrumbOption | null;
  options: CrumbOption[];
  onPick: (id: string) => void;
  /** Показывается как «Все» — снимает выбор этого уровня. */
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const Glyph = kind === 'space' ? Home : kind === 'category' ? Tag : Layers3;
  const title = kind === 'space' ? 'Пространство' : kind === 'category' ? 'Категория' : 'Группа';
  const label = current?.name ?? (kind === 'category' ? 'Все категории' : 'Все группы');

  return (
    <div className="nx-crumb" ref={box}>
      <button type="button" className={'nx-crumb-btn' + (open ? ' on' : '')}
        aria-haspopup="listbox" aria-expanded={open}
        aria-label={`${title}: ${label}`} title={`${title}: ${label}`}
        onClick={() => setOpen(value => !value)}>
        <Glyph size={17} weight="duotone" aria-hidden="true" />
        <b>{label}</b>
        <ChevronDown size={13} aria-hidden="true" />
      </button>

      {open && (
        <div className="nx-crumb-menu" role="listbox" aria-label={title}>
          {onClear && (
            <button type="button" role="option" aria-selected={!current}
              className={'nx-crumb-item' + (current ? '' : ' on')}
              onClick={() => { onClear(); setOpen(false); }}>
              <Folder size={16} aria-hidden="true" />
              <span>{kind === 'category' ? 'Все категории' : 'Все группы'}</span>
              {!current && <Check size={15} aria-hidden="true" />}
            </button>
          )}
          {options.length === 0 && <p className="nx-crumb-empty">Здесь пока пусто</p>}
          {options.map(option => (
            <button key={option.id} type="button" role="option" aria-selected={option.id === current?.id}
              className={'nx-crumb-item' + (option.id === current?.id ? ' on' : '')}
              onClick={() => { onPick(option.id); setOpen(false); }}>
              <Glyph size={16} aria-hidden="true" />
              <span>{option.name}</span>
              {option.count !== undefined && <i>{option.count}</i>}
              {option.id === current?.id && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
