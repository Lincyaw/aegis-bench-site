import { clsx } from 'clsx';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ResultCounts } from '../../api/types';
import { useLocale } from '../../i18n/localeContext';
import { groupedNumber } from '../../i18n/locales';
import table from '../../ui/table.module.css';
import { FailureBar } from './FailureBar';
import { PassRate } from './PassRate';
import { NO_VALUE, formatCost } from './presentation';
import styles from './ResultTable.module.css';

/** A row of the table: the cells that say whose result it is, and the result; a row can be marked as the one in view. */
export interface ResultRow {
  id: string;
  cells: ReactNode[];
  result: ResultCounts;
  current?: boolean;
}

/**
 * Results side by side in the console's columns, one row per model, harness or the like: the leading columns say whose
 * result a row is, and the figures follow. `lead` sizes the leading columns as a CSS grid track list; a narrow window
 * keeps the first of them and the pass rate.
 */
export function ResultTable({ label, heads, lead, rows }: { label: string; heads: string[]; lead: string; rows: ResultRow[] }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <div className={clsx(table.table, styles.results)} style={{ '--lead': lead } as CSSProperties} role="table" aria-label={label}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        {heads.map(head => <span key={head} role="columnheader">{head}</span>)}
        <span role="columnheader" className={styles.rate}>{t('console.models.column.passRate')}</span>
        <span role="columnheader">{t('console.models.column.everyTime')}</span>
        <span role="columnheader">{t('console.models.column.once')}</span>
        <span role="columnheader">{t('console.models.column.counted')}</span>
        <span role="columnheader">{t('console.models.column.cost')}</span>
        <span role="columnheader">{t('console.models.column.failures')}</span>
      </div>
      {rows.map(({ id, cells, result, current }) => (
        <div key={id} className={clsx(table.row, table.link)} role="row" aria-current={current ? 'true' : undefined}>
          {cells}
          <span role="cell" className={styles.rate}><PassRate rate={result.passRate} /></span>
          <span role="cell" className="t-numeric c-muted">{t('console.overview.tasksOf', { solved: result.solvedEveryTime, total: result.tasks })}</span>
          <span role="cell" className="t-numeric c-muted">{t('console.overview.tasksOf', { solved: result.solvedOnce, total: result.tasks })}</span>
          <span role="cell" className="t-numeric c-muted">{groupedNumber(locale, result.passed + result.failed)}</span>
          <span role="cell" className="t-numeric c-muted">{result.meanCostUsd === undefined ? NO_VALUE : formatCost(result.meanCostUsd)}</span>
          <span role="cell"><FailureBar result={result} /></span>
        </div>
      ))}
    </div>
  );
}
