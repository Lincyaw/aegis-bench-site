import { clsx } from 'clsx';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { InfoHint } from '../../ui/hint';
import table from '../../ui/table.module.css';
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

/** The row that starts a block: its name with what it shows behind a hint, and a cell per run. */
export function BlockHead({ title, hint, aside, children }: { title: string; hint: string; aside?: ReactNode; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className={clsx(styles.row, styles.blockHead)} role="row">
      <div className={styles.label} role="rowheader">
        <span className={styles.title}><span className="t-label">{title}</span><InfoHint label={t('ui.about', { subject: title })}>{hint}</InfoHint></span>
        {aside}
      </div>
      {children}
    </div>
  );
}

/**
 * One thing the block compares, such as a file or a check; a dot marks the rows where the runs differ. A row that
 * opens in place does so from anywhere on it, its label being the button that says whether it is open.
 */
export function ItemRow({ label, differs, expanded, onToggle, children }: { label: ReactNode; differs: boolean; expanded?: boolean; onToggle?: () => void; children: ReactNode }) {
  return (
    <div className={clsx(styles.row, styles.item, onToggle && [table.link, styles.expandable])} role="row">
      <div className={clsx(styles.label, differs && styles.differs)} role="rowheader">
        {onToggle ? (
          <button type="button" className={clsx(styles.toggle, table.primary)} aria-expanded={expanded} onClick={onToggle}>
            <svg className={styles.chevron} viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><path d="m3.5 2 3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {label}
          </button>
        ) : label}
      </div>
      {children}
    </div>
  );
}

/** What an item row opens to: a cell per run beneath its own. */
export function ExpansionRow({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className={clsx(styles.row, styles.expansion)} role="row">
      <div className={styles.label} role="rowheader"><span className="visually-hidden">{t('compare.expansion')}</span></div>
      {children}
    </div>
  );
}

/** A run's cell; a failed one is tinted and an empty one stays quiet. */
export function Cell({ tone, children }: { tone?: 'failed' | 'empty'; children?: ReactNode }) {
  return <div className={clsx(styles.cell, tone && styles[tone])} role="cell">{children}</div>;
}
