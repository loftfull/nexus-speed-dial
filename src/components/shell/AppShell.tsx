import type { PropsWithChildren } from 'react';
import { Sidebar } from '../sidebar/Sidebar.tsx';
import { MobileNavigation } from '../sidebar/MobileNavigation.tsx';
import { Omnibox } from '../omnibox/Omnibox.tsx';
import { Dock } from '../dock/Dock.tsx';
import styles from './AppShell.module.css';

export function AppShell({ children }: PropsWithChildren) {
  return (
    <main className={styles.shell} data-testid="app-shell">
      <MobileNavigation />
      <Sidebar />
      <section className={styles.workspace}>
        <Omnibox />
        {children}
      </section>
      <Dock />
    </main>
  );
}
