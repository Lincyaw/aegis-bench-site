import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { ReportDraftSummary } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { useLocale } from '../../i18n/localeContext';
import { dateTimeOf } from '../../i18n/locales';
import { consoleReportPath } from '../../routes/consoleReports';
import table from '../../ui/table.module.css';
import { ReportStatusTag } from './ReportLabels';
import styles from './DraftTable.module.css';

/** One row per draft; the row opens the draft's editor. */
export function DraftTable({ benchmarkId, drafts }: { benchmarkId: string; drafts: ReportDraftSummary[] }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <div className={clsx(table.table, styles.drafts)} role="table" aria-label={t('console.reports.drafts')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">{t('console.reports.column.report')}</span>
        <span role="columnheader">{t('console.reports.column.status')}</span>
        <span role="columnheader">{t('console.reports.column.approvals')}</span>
        <span role="columnheader">{t('console.reports.column.author')}</span>
        <span role="columnheader">{t('console.reports.column.updated')}</span>
      </div>
      {drafts.map(draft => {
        const to = consoleReportPath(benchmarkId, draft.id);
        return (
          <div key={draft.id} className={clsx(table.row, table.link)} role="row">
            <span role="cell" className={styles.stacked}><LocaleLink className={clsx(table.primary, 't-label')} to={to}>{draft.title[locale]}</LocaleLink><span className="t-mono c-faint">{draft.slug}</span></span>
            <span role="cell"><ReportStatusTag status={draft.status} /></span>
            <span role="cell" className="t-numeric c-muted">{t('console.reports.approvalsOf', { approvals: draft.approvals, required: draft.approvalsRequired })}</span>
            <span role="cell" className="t-mono c-muted">{draft.author}</span>
            <span role="cell" className="t-mono c-faint">{dateTimeOf(locale, draft.updatedAt)}</span>
          </div>
        );
      })}
    </div>
  );
}
