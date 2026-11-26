import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Document } from '../../../articles/Document';
import { reportOf, reportsIn } from '../../../articles/library';
import { Replay, RunNumber } from '../../../articles/runBlocks';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { useLocale } from '../../../i18n/localeContext';
import { REPORTS_PATH, reportPath } from '../../../routes/site';
import { Breadcrumbs } from '../../../ui/navigation';
import styles from './ReportsPage.module.css';

/** The reports in the reader's language, newest first. */
export function ReportsPage() {
  const { t } = useTranslation();
  const reports = reportsIn(useLocale());
  return (
    <div className={clsx('page', styles.page)}>
      <header className={styles.head}>
        <h1 className="t-display">{t('reports.title')}</h1>
        <p className="t-lead c-muted">{t('reports.lead')}</p>
      </header>
      <ul className={styles.list}>
        {reports.map(report => (
          <li key={report.slug}>
            <LocaleLink className={styles.item} to={reportPath(report.slug)}>
              <span className="t-mono c-faint">{report.date}</span>
              <div><span className="t-heading">{report.title}</span><span className="t-small c-muted">{report.summary}</span></div>
              <span className={styles.arrow} aria-hidden="true">→</span>
            </LocaleLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One report, compiled from its Markdown or MDX document. */
export function ReportPage() {
  const { t } = useTranslation();
  const { slug = '' } = useParams();
  const report = reportOf(slug, useLocale());
  return (
    <div className="page">
      <article className={styles.article}>
        <header className={styles.articleHead}>
          <Breadcrumbs crumbs={[{ label: t('reports.title'), to: REPORTS_PATH }, { label: report.title }]} />
          <h1 className="t-title">{report.title}</h1>
          <p className="t-lead c-muted">{report.summary}</p>
          <p className="t-mono c-faint">{report.date}</p>
        </header>
        <Document path={report.path} blocks={{ Replay, RunNumber }} />
      </article>
    </div>
  );
}
