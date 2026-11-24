import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './content.module.css';

/** A label that is not clickable, such as a version or a state. */
export function Tag({ children, dashed = false }: { children: ReactNode; dashed?: boolean }) {
  return <span className={clsx(styles.tag, dashed && styles.dashed, 't-micro')}>{children}</span>;
}

export function SectionHeading({ id, title, intro }: { id?: string; title: string; intro?: string }) {
  return (
    <header className={styles.sectionHeading} id={id}>
      <h2 className="t-title">{title}</h2>
      {intro && <p className="t-body c-muted">{intro}</p>}
    </header>
  );
}

export interface Fact {
  label: string;
  value: ReactNode;

  /** Code, such as a repository path, is set in the monospace face */
  format?: 'text' | 'code';
}

/**
 * Labelled values in one of three arrangements: stacked label over value in a flowing row, two-column rows, or
 * label and value side by side in a flowing line.
 */
export function FactList({ facts, layout }: { facts: Fact[]; layout: 'stacked' | 'rows' | 'inline' }) {
  return (
    <dl className={styles[layout]}>
      {facts.map(fact => (
        <div key={fact.label}>
          <dt className={clsx(layout === 'rows' ? 't-small c-muted' : 't-micro c-faint')}>{fact.label}</dt>
          <dd className={fact.format === 'code' ? 't-mono' : 't-small'}>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Loading() {
  const { t } = useTranslation();
  return <p className={clsx(styles.loading, 't-small c-faint')} role="status">{t('ui.loading')}</p>;
}
