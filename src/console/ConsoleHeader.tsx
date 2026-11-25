import type { ReactNode } from 'react';
import { Breadcrumbs, type Crumb } from '../ui/navigation';
import styles from './ConsoleHeader.module.css';

/** A console page's head: where it is, its title and one line on what it shows, with the page's actions at the end. */
export function ConsoleHeader({ crumbs, title, lead, actions }: { crumbs?: Crumb[]; title: string; lead?: string; actions?: ReactNode }) {
  return (
    <header className={styles.head}>
      <div className={styles.text}>
        {crumbs && <Breadcrumbs crumbs={crumbs} />}
        <h1 className="t-title">{title}</h1>
        {lead && <p className="t-small c-muted">{lead}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
