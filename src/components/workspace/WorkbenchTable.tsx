import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { WorkbenchRow } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { useLocale } from '../../i18n/localeContext';
import { dateTimeOf, groupedNumber } from '../../i18n/locales';
import { consoleBenchmarkPath } from '../../routes/console';
import { releasePath } from '../../routes/consoleReleases';
import { PENDING_RUNS, consoleRunsPath } from '../../routes/consoleRuns';
import table from '../../ui/table.module.css';
import { ReleaseVersion } from '../release/ReleaseLabels';
import styles from './WorkbenchTable.module.css';

/** One row per benchmark; the row opens its overview, and its draft and its failures to review open where they are. */
export function WorkbenchTable({ rows }: { rows: WorkbenchRow[] }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <div className={clsx(table.table, styles.workbench)} role="table" aria-label={t('console.workbench.title')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">{t('console.workbench.column.benchmark')}</span>
        <span role="columnheader">{t('console.workbench.column.current')}</span>
        <span role="columnheader">{t('console.workbench.column.draft')}</span>
        <span role="columnheader">{t('console.workbench.column.tasks')}</span>
        <span role="columnheader">{t('console.workbench.column.runs')}</span>
        <span role="columnheader">{t('console.workbench.column.unreviewed')}</span>
      </div>
      {rows.map(({ benchmark, current, draft, unreviewedFailures }) => {
        const to = consoleBenchmarkPath(benchmark.id);
        return (
          <div key={benchmark.id} className={clsx(table.row, table.link)} role="row" data-half={benchmark.stage.half}>
            <span role="cell" className={styles.stacked}>
              <LocaleLink className={clsx(table.primary, 't-label')} to={to}>{benchmark.name}</LocaleLink>
              <span className="t-small c-muted">{benchmark.stage.name}</span>
            </span>
            <span role="cell" className={styles.stacked}>
              <ReleaseVersion release={current} />
              <span className="t-mono c-faint">{dateTimeOf(locale, current.updatedAt)}</span>
            </span>
            <span role="cell">
              {draft
                ? <LocaleLink to={releasePath(benchmark.id, draft.id)}><ReleaseVersion release={draft} /></LocaleLink>
                : <span className="t-small c-faint">{t('console.releases.noDraft')}</span>}
            </span>
            <span role="cell" className="t-numeric c-muted">{groupedNumber(locale, benchmark.taskCount)}</span>
            <span role="cell" className="t-numeric c-muted">{groupedNumber(locale, benchmark.runCount)}</span>
            <span role="cell" className="t-numeric">
              <LocaleLink to={consoleRunsPath(benchmark.id, PENDING_RUNS.unreviewedFailures)}>{groupedNumber(locale, unreviewedFailures)}</LocaleLink>
            </span>
          </div>
        );
      })}
    </div>
  );
}
