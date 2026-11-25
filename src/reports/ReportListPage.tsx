import { clsx } from 'clsx';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleUser, useCreateReport, useReportDrafts } from '../api/consoleClient';
import type { ReportDraftSummary, ReportStatus } from '../api/types';
import { reportSourceOf, REPORTS } from '../articles/library';
import { ConsoleHeader } from '../console/ConsoleHeader';
import { ChangeFailure } from '../console/ConsolePages';
import { consoleBenchmarkPath } from '../console/consoleMap';
import { LocaleLink } from '../i18n/LocaleRouting';
import { useLocale, useLocalizedNavigate } from '../i18n/localeContext';
import { dateTimeOf } from '../i18n/locales';
import { mayEdit } from '../members/roles';
import { reportPath } from '../site/siteMap';
import { Tag } from '../ui/content';
import content from '../ui/content.module.css';
import { Button, SubmitButton, TextField } from '../ui/controls';
import table from '../ui/table.module.css';
import { REPORT_SLUG_PATTERN, consoleReportPath, newReportSources } from './reportQuery';
import styles from './ReportPages.module.css';

/** Where a report draft stands; one still being written is dashed, as it is not settled yet. */
export function ReportStatusTag({ status }: { status: ReportStatus }) {
  const { t } = useTranslation();
  return <Tag dashed={status === 'draft'}>{t(`console.reports.status.${status}`)}</Tag>;
}

/**
 * A benchmark's reports: the drafts being written and reviewed here, and the reports the public site shows, which an
 * editor revises as a new draft under the same directory.
 */
export function ReportListPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { benchmarkId = '' } = useParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const drafts = useReportDrafts(benchmark.id);
  const editing = mayEdit(useConsoleUser().role);
  const published = REPORTS.filter(report => report.locale === locale && report.benchmarks.includes(benchmark.id));
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.reports.title') }]} title={t('console.reports.title')} lead={t('console.reports.lead')} />
      <section className={styles.section}>
        <h2 className="t-heading">{t('console.reports.drafts')}</h2>
        {drafts.length === 0 ? <p className="t-small c-muted">{t('console.reports.noDrafts')}</p> : <DraftTable benchmarkId={benchmark.id} drafts={drafts} />}
      </section>
      <section className={styles.section}>
        <h2 className="t-heading">{t('console.reports.published')}</h2>
        <p className="t-micro c-faint">{t('console.reports.publishedNote')}</p>
        {published.length === 0 ? <p className="t-small c-muted">{t('console.reports.noPublished')}</p> : (
          <ul className={styles.published}>
            {published.map(report => {
              const draft = drafts.find(candidate => candidate.slug === report.slug);
              return (
                <li key={report.slug}>
                  <span className="t-mono c-faint">{report.date}</span>
                  <span className={styles.stacked}>
                    <LocaleLink className="t-label" to={reportPath(report.slug)}>{report.title}</LocaleLink>
                    <span className="t-mono c-faint">{report.slug}</span>
                  </span>
                  {draft ? <LocaleLink className="t-small" to={consoleReportPath(benchmark.id, draft.id)}>{t('console.reports.openRevision')}</LocaleLink> : editing && <ReviseButton benchmarkId={benchmark.id} slug={report.slug} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {editing && <NewReportForm benchmarkId={benchmark.id} />}
    </div>
  );
}

/** One row per draft; the row opens the draft's editor. */
export function DraftTable({ benchmarkId, drafts }: { benchmarkId: string; drafts: ReportDraftSummary[] }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useLocalizedNavigate();
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
          <div key={draft.id} className={clsx(table.row, table.link)} role="row" onClick={event => { if (!(event.target as HTMLElement).closest('a')) { navigate(to); } }}>
            <span role="cell" className={styles.stacked}><LocaleLink className="t-label" to={to}>{draft.title[locale]}</LocaleLink><span className="t-mono c-faint">{draft.slug}</span></span>
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

/** Starts a draft from a published report's documents, under its directory, and opens it. */
export function ReviseButton({ benchmarkId, slug }: { benchmarkId: string; slug: string }) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const create = useCreateReport();
  const revise = async () => {
    const [zh, en] = await Promise.all([reportSourceOf(slug, 'zh-CN'), reportSourceOf(slug, 'en')]);
    create.mutate({ slug, sources: { 'zh-CN': zh, en } }, { onSuccess: draft => navigate(consoleReportPath(benchmarkId, draft.id)) });
  };
  return (
    <span className={styles.revise}>
      <Button variant="line" onClick={() => void revise()}>{t('console.reports.revise')}</Button>
      <ChangeFailure error={create.error} reasons={{ 409: t('console.reports.slugTaken') }} />
    </span>
  );
}

/** Starts a new report under a directory name the author chooses, from documents naming the benchmark. */
export function NewReportForm({ benchmarkId }: { benchmarkId: string }) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const create = useCreateReport();
  const [slug, setSlug] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const sources = newReportSources(benchmarkId, new Date().toISOString().slice(0, 10));
    create.mutate({ slug, sources }, { onSuccess: draft => navigate(consoleReportPath(benchmarkId, draft.id)) });
  };
  return (
    <form className={clsx(content.panel, styles.newReport)} onSubmit={submit}>
      <h2 className="t-heading">{t('console.reports.new.title')}</h2>
      <TextField label={t('console.reports.new.slug')} type="text" autoComplete="off" value={slug} onChange={setSlug} pattern={{ regex: REPORT_SLUG_PATTERN, hint: t('console.reports.new.slugHint') }} />
      <ChangeFailure error={create.error} reasons={{ 409: t('console.reports.slugTaken') }} />
      <div><SubmitButton variant="solid" pending={create.isPending}>{t('console.reports.new.submit')}</SubmitButton></div>
    </form>
  );
}
