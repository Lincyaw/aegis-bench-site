import { clsx } from 'clsx';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleUser, useCreateReport, useReportDrafts } from '../../../api/consoleClient';
import { REPORT_SLUG_PATTERN } from '../../../api/constraints';
import { reportSourceOf, REPORTS } from '../../../articles/library';
import { newReportSources } from '../../../articles/newReport';
import { DraftTable } from '../../../components/report/DraftTable';
import { ChangeFailure } from '../../../components/change/ChangeFailure';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { useLocale, useLocalizedNavigate } from '../../../i18n/localeContext';
import { consoleBenchmarkPath } from '../../../routes/console';
import { consoleReportPath } from '../../../routes/consoleReports';
import { reportPath } from '../../../routes/site';
import { HintedHeading } from '../../../ui/content';
import content from '../../../ui/content.module.css';
import { Button, SubmitButton, TextField } from '../../../ui/controls';
import styles from './ReportPages.module.css';

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
  const editing = useConsoleUser().can.edit;
  const published = REPORTS.filter(report => report.locale === locale && report.benchmarks.includes(benchmark.id));
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.reports.title') }]} title={t('console.reports.title')} about={t('console.reports.about')} />
      <section className={styles.section}>
        <h2 className="t-heading">{t('console.reports.drafts')}</h2>
        {drafts.length === 0 ? <p className="t-small c-muted">{t('console.reports.noDrafts')}</p> : <DraftTable benchmarkId={benchmark.id} drafts={drafts} />}
      </section>
      <section className={styles.section}>
        <HintedHeading rank="h2" className="t-heading" title={t('console.reports.published')} about={t('console.reports.publishedNote')} />
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
