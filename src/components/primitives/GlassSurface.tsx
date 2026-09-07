import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import styles from './GlassSurface.module.css';

type GlassRole = 'panel' | 'control' | 'popover';

type GlassSurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  role?: GlassRole;
  children?: ReactNode;
};

export function GlassSurface({ as, role = 'panel', className = '', children, ...rest }: GlassSurfaceProps) {
  const Tag = (as ?? 'div') as ElementType;
  const classes = [styles.surface, styles[role], className].filter(Boolean).join(' ');
  return <Tag {...rest} className={classes} data-glass-role={role}>{children}</Tag>;
}
