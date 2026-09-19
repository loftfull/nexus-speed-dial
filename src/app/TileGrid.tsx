import React, { useEffect, useRef, useState } from 'react';
import { columnsFromTops, isGridKey, nextGridIndex } from '../domain/gridNav';

/** Что в плитке может принять фокус: сама плитка и кнопка её меню. */
const FOCUSABLE = 'button.nx-tile-face, a.nx-tile-face, button.nx-tile-more';

export const focusableInTile = (tile: Element) => tile.querySelector<HTMLElement>(FOCUSABLE);

/**
 * Сетка плиток с бегущим `tabindex`: наружу она выглядит как одна остановка
 * табуляции, а внутри фокус водят стрелки. Иначе, чтобы пройти сетку из
 * девяти плиток, нужно было восемнадцать нажатий Tab — по две кнопки на
 * плитку, — и стрелки не делали ничего.
 */
export function TileGrid({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const tiles = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('.nx-tile') ?? []);

  // Состав сетки меняется от фильтра, раздела и страницы, поэтому бегущий
  // индекс расставляется после каждой отрисовки, а не по списку зависимостей.
  useEffect(() => {
    const list = tiles();
    if (!list.length) return;
    const index = Math.min(active, list.length - 1);
    if (index !== active) setActive(index);
    list.forEach((tile, position) => {
      tile.querySelectorAll<HTMLElement>(FOCUSABLE).forEach(node => {
        node.tabIndex = position === index ? 0 : -1;
      });
    });
  });

  return (
    <div
      ref={ref}
      className={className}
      onFocus={event => {
        // Мышью или Tab'ом фокус мог попасть на другую плитку — она и
        // становится точкой отсчёта для стрелок.
        const list = tiles();
        const index = list.findIndex(tile => tile.contains(event.target as Node));
        if (index >= 0 && index !== active) setActive(index);
      }}
      onKeyDown={event => {
        if (!isGridKey(event.key)) return;
        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
        // Открытое меню плитки ведёт свою навигацию.
        if ((event.target as HTMLElement).closest('.nx-menu')) return;
        const list = tiles();
        const current = list.findIndex(tile => tile.contains(document.activeElement));
        if (current < 0) return;
        // Стрелки внутри сетки не прокручивают страницу, даже когда идти некуда.
        event.preventDefault();
        const columns = columnsFromTops(list.map(tile => tile.getBoundingClientRect().top));
        const next = nextGridIndex(event.key, current, list.length, columns);
        if (next === null) return;
        setActive(next);
        focusableInTile(list[next])?.focus();
      }}
    >
      {children}
    </div>
  );
}
