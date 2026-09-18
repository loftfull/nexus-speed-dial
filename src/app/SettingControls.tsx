import React from 'react';

export type ControlIcon = React.ComponentType<{ size?: number }>;

/** Группа настроек. Сетка внутри всегда ровно в три столбца. */
export function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="nx-card">
      <h3>{title}</h3>
      {hint && <p className="nx-card-hint">{hint}</p>}
      <div className="nx-triples">{children}</div>
    </div>
  );
}

/** Ячейка: иконка функции сверху, орган управления, подпись снизу. */
export function Cell({ icon: Icon, label, why, disabled, children, as = 'div' }: {
  icon: ControlIcon; label: string; why?: string; disabled?: boolean;
  children: React.ReactNode; as?: 'div' | 'label';
}) {
  const Tag = as;
  return (
    <Tag className={'nx-cell' + (disabled ? ' off' : '')} title={disabled && why ? why : label}>
      <span className="nx-cell-top"><Icon size={14} /></span>
      {children}
      <span className="nx-cell-label">{label}</span>
      {disabled && why && <span className="nx-cell-why">{why}</span>}
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
