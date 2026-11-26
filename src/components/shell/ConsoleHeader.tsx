import type { ReactNode } from 'react';
import { HintedHeading } from '../../ui/content';
import { Breadcrumbs, type Crumb } from '../../ui/navigation';
import styles from './ConsoleHeader.module.css';

/**
 * A console page's head: where it is, its title with the ⓘ that explains what the page shows, a line of the page's own
 * facts such as how many records it holds, and the page's actions at the end.
 */
export function ConsoleHeader({ crumbs, title, about, lead, actions }: { crumbs?: Crumb[]; title: string; about?: ReactNode; lead?: string; actions?: ReactNode }) {
  return (
    <header className={styles.head}>
      <div className={styles.text}>
        {crumbs && <Breadcrumbs crumbs={crumbs} />}
        <HintedHeading rank="h1" className="t-title" title={title} about={about} />
        {lead && <p className="t-small c-muted">{lead}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
