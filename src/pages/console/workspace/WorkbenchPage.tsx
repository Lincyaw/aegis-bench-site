import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useReportDrafts, useWorkbench } from '../../../api/consoleClient';
import type { WorkbenchRow } from '../../../api/types';
import { RecentReleases } from '../../../components/release/RecentReleases';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { WorkbenchTable } from '../../../components/workspace/WorkbenchTable';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { useLocale } from '../../../i18n/localeContext';
import { dateTimeOf, groupedNumber } from '../../../i18n/locales';
import { consoleReportPath } from '../../../routes/consoleReports';
import { StatTile, StatTiles } from '../../../ui/content';
import content from '../../../ui/content.module.css';
import styles from './WorkspacePages.module.css';

/** The console's home: every benchmark with its public version, its draft and the work waiting in it. */
export function WorkbenchPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { benchmarks, recentReleases } = useWorkbench();
  const total = (count: (row: WorkbenchRow) => number) => groupedNumber(locale, benchmarks.reduce((sum, row) => sum + count(row), 0));
  return (
    <div className={styles.page}>
      <ConsoleHeader title={t('console.workbench.title')} about={t('console.workbench.about')} />
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
