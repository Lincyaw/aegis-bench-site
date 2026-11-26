import { clsx } from 'clsx';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { InfoHint } from '../ui/hint';
import styles from './ComparisonTable.module.css';

/*
 * Runs side by side as one table: a column naming what each row compares, then a column per run, every row lined up
 * across the runs. Blocks fill it with a head row each and their item rows below.
 */

export function ComparisonTable({ columns, label, children }: { columns: number; label: string; children: ReactNode }) {
  return (
    <div className={styles.scroller}>
      <div className={styles.table} style={{ '--columns': columns } as CSSProperties} role="table" aria-label={label}>{children}</div>
    </div>
  );
}

/** The row that starts a block: its name with what it shows behind a hint, and a cell per run; `id` lets a link scroll to it. */
export function BlockHead({ title, hint, aside, id, children }: { title: string; hint: string; aside?: ReactNode; id?: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div id={id} className={clsx(styles.row, styles.blockHead)} role="row">
      <div className={styles.label} role="rowheader">
        <span className={styles.title}><span className="t-label">{title}</span><InfoHint label={t('ui.about', { subject: title })}>{hint}</InfoHint></span>
        {aside}
      </div>
      {children}
    </div>
  );
}

/** One thing the block compares, such as a file or a check; a dot marks the rows where the runs differ. */
export function ItemRow({ label, differs, children }: { label: ReactNode; differs: boolean; children: ReactNode }) {
  return (
    <div className={clsx(styles.row, styles.item)} role="row">
      <div className={clsx(styles.label, differs && styles.differs)} role="rowheader">{label}</div>
      {children}
    </div>
  );
}

/** A run's cell; a failed one is tinted and an empty one stays quiet. */
export function Cell({ tone, children }: { tone?: 'failed' | 'empty'; children?: ReactNode }) {
  return <div className={clsx(styles.cell, tone && styles[tone])} role="cell">{children}</div>;
}
