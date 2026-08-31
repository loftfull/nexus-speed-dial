import type { PropsWithChildren } from 'react';
import { Sidebar } from '../sidebar/Sidebar.tsx';
import { Omnibox } from '../omnibox/Omnibox.tsx';
import { Dock } from '../dock/Dock.tsx';
import styles from './AppShell.module.css';

export function AppShell({ children }: PropsWithChildren) {
  return <main className={styles.shell} data-testid="app-shell"><Sidebar/><section className={styles.workspace}><Omnibox/>{children}</section><Dock/></main>;
}
