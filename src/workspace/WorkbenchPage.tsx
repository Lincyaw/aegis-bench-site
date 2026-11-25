import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useWorkbench } from '../api/consoleClient';
import type { WorkbenchRow } from '../api/types';
import { ConsoleHeader } from '../console/ConsoleHeader';
import { consoleBenchmarkPath } from '../console/consoleMap';
import { LocaleLink } from '../i18n/LocaleRouting';
import { useLocale, useLocalizedNavigate } from '../i18n/localeContext';
import { dateTimeOf, groupedNumber } from '../i18n/locales';
import { RecentReleases } from '../releases/ReleaseLogPage';
import { ReleaseVersion } from '../releases/ReleaseLabels';
import { releasePath } from '../releases/releaseQuery';
import { PENDING_RUNS, consoleRunsPath } from '../runs/consoleRunQuery';
import { StatTile, StatTiles } from '../ui/content';
import table from '../ui/table.module.css';
import styles from './WorkspacePages.module.css';

/** The console's home: every benchmark with its public version, its draft and the work waiting in it. */
export function WorkbenchPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { benchmarks, recentReleases } = useWorkbench();
  const total = (count: (row: WorkbenchRow) => number) => groupedNumber(locale, benchmarks.reduce((sum, row) => sum + count(row), 0));
  return (
    <div className={styles.page}>
      <ConsoleHeader title={t('console.workbench.title')} lead={t('console.workbench.lead')} />
      <StatTiles>
        <StatTile label={t('console.workbench.stats.benchmarks')} value={groupedNumber(locale, benchmarks.length)} />
        <StatTile label={t('console.workbench.stats.drafts')} value={total(row => (row.draft ? 1 : 0))} />
        <StatTile label={t('console.workbench.stats.unreviewed')} value={total(row => row.unreviewedFailures)} />
        <StatTile label={t('console.workbench.stats.executionFailures')} value={total(row => row.executionFailures)} />
      </StatTiles>
      <WorkbenchTable rows={benchmarks} />
      <RecentReleases title={t('console.workbench.recent')} releases={recentReleases} />
    </div>
  );
}

/** One row per benchmark; the row opens its overview, and its draft and its failures to review open where they are. */
export function WorkbenchTable({ rows }: { rows: WorkbenchRow[] }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useLocalizedNavigate();
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
          <div key={benchmark.id} className={clsx(table.row, table.link)} role="row" data-half={benchmark.stage.half} onClick={event => { if (!(event.target as HTMLElement).closest('a')) { navigate(to); } }}>
            <span role="cell" className={styles.stacked}>
              <LocaleLink className="t-label" to={to}>{benchmark.name}</LocaleLink>
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
