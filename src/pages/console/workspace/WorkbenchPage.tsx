import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useReportDrafts, useWorkbench } from '../../../api/consoleClient';
import type { WorkbenchRow } from '../../../api/types';
import { ReleaseVersion } from '../../../components/release/ReleaseLabels';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { useLocale, useLocalizedNavigate } from '../../../i18n/localeContext';
import { dateTimeOf, groupedNumber } from '../../../i18n/locales';
import { consoleBenchmarkPath } from '../../../routes/console';
import { releasePath } from '../../../routes/consoleReleases';
import { consoleReportPath } from '../../../routes/consoleReports';
import { PENDING_RUNS, consoleRunsPath } from '../../../routes/consoleRuns';
import { StatTile, StatTiles } from '../../../ui/content';
import content from '../../../ui/content.module.css';
import table from '../../../ui/table.module.css';
import { RecentReleases } from '../releases/ReleaseLogPage';
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
      <div className={styles.columns}>
        <ReportsInReview />
        <RecentReleases title={t('console.workbench.recent')} releases={recentReleases} />
      </div>
    </div>
  );
}

/** The report drafts waiting for reviewers, newest first; each opens its draft under the first benchmark it names. */
export function ReportsInReview() {
  const { t } = useTranslation();
  const locale = useLocale();
  const reports = useReportDrafts('').filter(report => report.status === 'inReview' && report.benchmarkIds.length > 0);
  return (
    <section className={clsx(content.panel, styles.panel)}>
      <h2 className="t-heading">{t('console.workbench.inReview')}</h2>
      {reports.length === 0 ? <p className="t-small c-muted">{t('console.workbench.noneInReview')}</p> : (
        <ul className={styles.list}>
          {reports.map(report => (
            <li key={report.id}>
              <LocaleLink className={styles.listItem} to={consoleReportPath(report.benchmarkIds[0], report.id)}>
                <span className="t-label">{report.title[locale]}</span>
                <span className="t-small c-muted">{t('console.reports.approvalsOf', { approvals: report.approvals, required: report.approvalsRequired })}</span>
                <span className="t-mono c-faint">{report.author} · {dateTimeOf(locale, report.updatedAt)}</span>
              </LocaleLink>
            </li>
          ))}
        </ul>
      )}
    </section>
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
