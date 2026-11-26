import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { useDeferredValue, useState, type FormEvent } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  useConsoleBenchmark, useConsoleUser, useDiscardReport, useReportDraft, useReviewReport, useSettings, useSubmitReport, useUpdateReport,
} from '../../../api/consoleClient';
import type { ReportDraft } from '../../../api/types';
import { DocumentBody } from '../../../articles/Document';
import { evaluateDocument } from '../../../articles/evaluate';
import { ReportFrontmatter } from '../../../articles/library';
import { Replay, RunNumber } from '../../../articles/runBlocks';
import { DocumentEditor, ExportPanel, ReviewHistory } from '../../../components/report/ReportEditor';
import { ReportStatusTag } from '../../../components/report/ReportLabels';
import { ChangeFailure } from '../../../components/shell/ChangeFailure';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { useLocale, useLocalizedNavigate } from '../../../i18n/localeContext';
import { dateTimeOf } from '../../../i18n/locales';
import { consoleBenchmarkPath } from '../../../routes/console';
import { consoleReportsPath } from '../../../routes/consoleReports';
import content from '../../../ui/content.module.css';
import { Button, SubmitButton, TextArea, ToggleChip } from '../../../ui/controls';
import { mayEdit } from '../roles';
import styles from './ReportPages.module.css';

/** A report draft: its documents in each language beside their preview, the checks before review, its reviews and its files. */
export function ReportEditorPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { benchmarkId = '', reportId = '' } = useParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const report = useReportDraft(reportId);
  const editor = mayEdit(useConsoleUser().role);
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader
        crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.reports.title'), to: consoleReportsPath(benchmark.id) }, { label: report.slug }]}
        title={report.title[locale]} lead={t(`console.report.lead.${report.status}`)}
      />
      <div className={styles.facts}>
        <ReportStatusTag status={report.status} />
        <span className="t-mono c-faint">{report.author} · {dateTimeOf(locale, report.updatedAt)}</span>
        {report.status !== 'draft' && <span className="t-small c-muted">{t('console.reports.approvalsOf', { approvals: report.approvals, required: report.approvalsRequired })}</span>}
      </div>
      <ReportEditor key={report.id} report={report} />
      {report.status === 'inReview' && <ReviewPanel report={report} />}
      {report.status === 'approved' && <ExportPanel report={report} />}
      {report.reviews.length > 0 && <ReviewHistory report={report} />}
      {editor && <DiscardReport benchmarkId={benchmark.id} reportId={report.id} />}
    </div>
  );
}

/** The draft's documents and checks as they are being changed, saved whole, and submitted once saved with every check ticked. */
export function ReportEditor({ report }: { report: ReportDraft }) {
  const { t } = useTranslation();
  const [sources, setSources] = useState(report.sources);
  const [checked, setChecked] = useState(report.checked);
  const checks = useSettings().publication.reportChecks;
  const editing = mayEdit(useConsoleUser().role) && report.status === 'draft';
  const update = useUpdateReport(report.id);
  const submit = useSubmitReport(report.id);
  const unsaved = JSON.stringify({ sources, checked }) !== JSON.stringify({ sources: report.sources, checked: report.checked });
  const ready = !unsaved && checks.every(check => checked.includes(check));
  return (
    <>
      <DocumentEditor slug={report.slug} sources={sources} editing={editing} onChange={setSources} preview={(source, format) => <ReportPreview source={source} format={format} />} />
      <section className={clsx(content.panel, styles.checks)}>
        <div className={styles.checksHead}>
          <h2 className="t-heading">{t('console.report.checks')}</h2>
          <span className="t-small c-muted">{t('console.report.checksDone', { done: checks.filter(check => checked.includes(check)).length, total: checks.length })}</span>
        </div>
        <div className={styles.chips}>
          {checks.map(check => (
            <ToggleChip key={check} pressed={checked.includes(check)} disabled={!editing} onToggle={() => setChecked(checked.includes(check) ? checked.filter(item => item !== check) : [...checked, check])}>{check}</ToggleChip>
          ))}
        </div>
      </section>
      {editing && (
        <div className={styles.buttons}>
          <Button variant={ready ? 'line' : 'solid'} onClick={() => update.mutate({ sources, checked })}>{t('console.report.save')}</Button>
          {ready
            ? <Button variant="solid" onClick={() => submit.mutate()}>{t('console.report.submit')}</Button>
            : <p className="t-small c-muted">{t(unsaved ? 'console.report.unsaved' : 'console.report.checksFirst')}</p>}
        </div>
      )}
      <ChangeFailure error={update.error} reasons={{ 409: t('console.report.changedElsewhere'), 422: t('console.report.badFrontmatter') }} />
      <ChangeFailure error={submit.error} reasons={{ 409: t('console.report.checksFirst') }} />
    </>
  );
}

/** A document as the public site will show it, compiled as the author types; a document that does not compile or render says why. */
export function ReportPreview({ source, format }: { source: string; format: 'md' | 'mdx' }) {
  const { t } = useTranslation();
  const typed = useDeferredValue(source);
  const preview = useQuery({ queryKey: ['reportPreview', format, typed], queryFn: () => evaluateDocument(typed, format), placeholderData: keepPreviousData, gcTime: 0 });
  const frontmatter = preview.data && ReportFrontmatter.safeParse(preview.data.frontmatter);
  return (
    <div className={clsx(content.panel, styles.preview)} role="region" aria-label={t('console.report.preview')}>
      {preview.error && <p className="t-small c-bad" role="alert">{t('console.report.compileFailed', { message: preview.error.message })}</p>}
      {frontmatter && (frontmatter.success ? (
        <header className={styles.previewHead}>
          <span className="t-micro c-faint">{t('console.report.previewEyebrow', { date: frontmatter.data.date })}</span>
          <h1 className="t-title">{frontmatter.data.title}</h1>
          <p className="t-lead c-muted">{frontmatter.data.summary}</p>
        </header>
      ) : <p className="t-small c-bad">{t('console.report.badFrontmatter')}</p>)}
      {preview.data && (
        <ErrorBoundary resetKeys={[typed]} fallbackRender={({ error }) => <p className="t-small c-bad" role="alert">{t('console.report.renderFailed', { message: error instanceof Error ? error.message : String(error) })}</p>}>
          <DocumentBody Content={preview.data.Content} blocks={{ Replay, RunNumber }} />
        </ErrorBoundary>
      )}
    </div>
  );
}

/** Reviewing a submitted draft: any editor but its author, once per submission, approves it or returns it with a comment. */
export function ReviewPanel({ report }: { report: ReportDraft }) {
  const { t } = useTranslation();
  const user = useConsoleUser();
  const review = useReviewReport(report.id);
  const [comment, setComment] = useState('');
  const reviewed = report.reviews.some(entry => entry.reviewer === user.account && report.submittedAt !== undefined && entry.at >= report.submittedAt);
  const role = !mayEdit(user.role) ? 'viewer' : report.author === user.account ? 'author' : reviewed ? 'done' : 'reviewer';
  const requestChanges = (event: FormEvent) => {
    event.preventDefault();
    review.mutate({ verdict: 'requestChanges', comment });
  };
  return (
    <section className={clsx(content.panel, styles.action)}>
      <h2 className="t-heading">{t('console.report.review.title')}</h2>
      <p className="t-small c-muted">{t(`console.report.review.note.${role}`)}</p>
      {role === 'reviewer' && (
        <>
          <div className={styles.buttons}><Button variant="solid" onClick={() => review.mutate({ verdict: 'approve' })}>{t('console.report.review.approve')}</Button></div>
          <form className={styles.requestChanges} onSubmit={requestChanges}>
            <TextArea label={t('console.report.review.comment')} rows={3} value={comment} onChange={setComment} />
            <div><SubmitButton variant="line" pending={review.isPending}>{t('console.report.review.requestChanges')}</SubmitButton></div>
          </form>
        </>
      )}
      <ChangeFailure error={review.error} reasons={{ 409: t('console.report.review.conflict') }} />
    </section>
  );
}

/** Dropping a draft, such as one whose files are committed, which asks again first; the reports open afterwards. */
export function DiscardReport({ benchmarkId, reportId }: { benchmarkId: string; reportId: string }) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const discard = useDiscardReport(reportId);
  const [asking, setAsking] = useState(false);
  return asking ? (
    <div className={clsx(content.panel, styles.action)}>
      <p className="t-small c-muted">{t('console.report.discardLead')}</p>
      <ChangeFailure error={discard.error} />
      <div className={styles.buttons}>
        <Button variant="line" onClick={() => discard.mutate(undefined, { onSuccess: () => navigate(consoleReportsPath(benchmarkId)) })}>{t('console.report.confirmDiscard')}</Button>
        <Button variant="line" onClick={() => setAsking(false)}>{t('console.report.cancel')}</Button>
      </div>
    </div>
  ) : <div className={styles.buttons}><Button variant="line" onClick={() => setAsking(true)}>{t('console.report.discard')}</Button></div>;
}
