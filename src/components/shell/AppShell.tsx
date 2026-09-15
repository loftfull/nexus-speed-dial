import type { PropsWithChildren } from 'react';
import { BottomDock } from '../dock/BottomDock.tsx';
import { MobileNavigation } from '../sidebar/MobileNavigation.tsx';
import { Sidebar } from '../sidebar/Sidebar.tsx';
import { Omnibox } from '../omnibox/Omnibox.tsx';
import styles from './AppShell.module.css';

export function AppShell({ children }: PropsWithChildren) {
  return (
    <main className={styles.shell} data-testid="app-shell">
      <MobileNavigation />
      <div data-shell-part="sidebar"><Sidebar /></div>
      <section data-shell-part="workspace" className={styles.workspace}>
        <Omnibox />
        {children}
      </section>
      <div data-shell-part="dock"><BottomDock /></div>
    </main>
  );
}
