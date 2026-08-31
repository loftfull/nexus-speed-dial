import type { ElementType, PropsWithChildren } from 'react';
import styles from './GlassSurface.module.css';

type GlassRole = 'panel' | 'control' | 'dock' | 'popover';
type GlassSurfaceProps = PropsWithChildren<{ as?: ElementType; role?: GlassRole; className?: string }>;

export function GlassSurface({ as: Tag = 'div', role = 'panel', className = '', children }: GlassSurfaceProps) {
  const classes = [styles.surface, styles[role], className].filter(Boolean).join(' ');
  return <Tag className={classes} data-glass-role={role}>{children}</Tag>;
}
