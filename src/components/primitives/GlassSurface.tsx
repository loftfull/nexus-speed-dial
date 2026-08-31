import type { ComponentPropsWithoutRef, ElementType } from 'react';
import styles from './GlassSurface.module.css';

type GlassRole = 'panel' | 'control' | 'dock' | 'popover';

type GlassSurfaceProps<T extends ElementType> = {
  as?: T;
  role?: GlassRole;
} & Omit<ComponentPropsWithoutRef<T>, 'as'>;

export function GlassSurface<T extends ElementType = 'div'>({ as, role = 'panel', className = '', children, ...rest }: GlassSurfaceProps<T>) {
  const Tag: ElementType = as ?? 'div';
  const classes = [styles.surface, styles[role], className].filter(Boolean).join(' ');
  return <Tag {...rest} className={classes} data-glass-role={role}>{children}</Tag>;
}
