import React from 'react';

import type { IconProps } from './icons.generated';

export type ControlIcon = React.ComponentType<IconProps>;

/**
 * Сколько столбцов дать карточке, чтобы последний ряд не остался щербатым.
 *
 * Три столбца были записаны жёстко, и карточка из четырёх ячеек выходила
 * «три плюс одна»: два пустых места в нижнем ряду. Число столбцов теперь
 * выбирается по числу ячеек — двойка делит чётные пополам, тройка держит
 * прежнюю плотность там, где ячеек кратно трём.
 */
export function columnsFor(count: number): number {
  if (count <= 1) return 1;
  if (count === 2 || count === 4) return 2;
  return 3;
}

/** Группа настроек: сетка, в которой нижний ряд заполнен целиком. */
export function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const columns = columnsFor(React.Children.toArray(children).filter(Boolean).length);
  return (
    <div className="nx-card">
      <h3>{title}</h3>
      {hint && <p className="nx-card-hint">{hint}</p>}
      <div className="nx-triples" style={{ '--nx-cols': columns } as React.CSSProperties}>{children}</div>
    </div>
  );
}

/**
 * Ячейка: иконка функции, орган управления, подпись.
 *
 * Три полосы, а не свободный столбик: у иконки и у органа высота задана, и
 * подпись поэтому начинается на одной высоте во всех ячейках ряда. Раньше
 * каждая ячейка росла сама по себе, и подписи стояли лесенкой.
 */
export function Cell({ icon: Icon, label, why, disabled, children, as = 'div' }: {
  icon: ControlIcon; label: string; why?: string; disabled?: boolean;
  children: React.ReactNode; as?: 'div' | 'label';
}) {
  const Tag = as;
  return (
    <Tag className={'nx-cell' + (disabled ? ' off' : '')} title={disabled && why ? why : label}>
      <span className="nx-cell-top"><Icon size={14} /></span>
      <span className="nx-cell-control">{children}</span>
      <span className="nx-cell-text">
        <span className="nx-cell-label">{label}</span>
        {why && <span className="nx-cell-why">{why}</span>}
      </span>
    </Tag>
  );
}

export function Pick({ icon, label, options, value, onChange, disabled, why }: {
  icon: ControlIcon; label: string; options: [string, string][]; value: string;
  onChange: (value: string) => void; disabled?: boolean; why?: string;
}) {
  return (
    <Cell icon={icon} label={label} disabled={disabled} why={why} as="label">
      <select aria-label={label} value={value} disabled={disabled}
        onChange={event => onChange(event.target.value)}>
        {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
      </select>
    </Cell>
  );
}

export function Switch({ icon, label, value, onChange, disabled, why }: {
  icon: ControlIcon; label: string; value: boolean;
  onChange: (value: boolean) => void; disabled?: boolean; why?: string;
}) {
  return (
    <Cell icon={icon} label={label} disabled={disabled} why={why}>
      <button type="button" role="switch" aria-checked={value} aria-label={label} disabled={disabled}
        className={'nx-switch' + (value ? ' on' : '')} onClick={() => onChange(!value)}><span /></button>
    </Cell>
  );
}

/** Карточка без сетки: для списков и кнопок действий. */
export function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="nx-card">
      <h3>{title}</h3>
      {hint && <p className="nx-card-hint">{hint}</p>}
      {children}
    </div>
  );
}
