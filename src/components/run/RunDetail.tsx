import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { RunDetail } from '../../api/types';
import { INSTRUCTION_PATH } from '../../routes/site';
import { FactList, HintedHeading } from '../../ui/content';
import content from '../../ui/content.module.css';
import { TextLink } from '../../ui/controls';
import { InfoHint } from '../../ui/hint';
import { ArrowIcon } from '../../ui/icons';
import table from '../../ui/table.module.css';
import { VendorBadge } from '../model/ModelBadge';
import { combinationName, formatCost } from '../result/presentation';
import { ChangeSize, Diff } from './Diff';
import { HuggingFaceLink } from './HuggingFace';
import { OutcomeBadge, OutcomeText } from './Outcome';
import styles from './RunDetail.module.css';

export function RunHeader({ run }: { run: RunDetail }) {
  const { t } = useTranslation();
  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <VendorBadge model={run.model} />
        <h2 className="t-heading">{combinationName(run.model, run.harness)}</h2>
        <span className="t-small c-muted">{t('runs.attempt', { attempt: run.attempt })}</span>
        <OutcomeBadge outcome={run.outcome} />
      </div>
      <p className="t-small c-muted">{run.task.id} {run.task.title} · {t('runs.attemptOf', { attempt: run.attempt, count: run.attemptCount })}</p>
      <FactList layout="inline" facts={[
        { label: t('runs.metrics.steps'), value: run.metrics.steps },
        { label: t('runs.metrics.duration'), value: t('benchmarks.minutes', { count: run.metrics.durationMinutes }) },
        { label: t('runs.metrics.submissions'), value: t('benchmarks.times', { count: run.metrics.submissions }) },
        { label: t('runs.metrics.outputTokens'), value: `${Math.round(run.metrics.outputTokens / 1000)}K` },
        { label: t('runs.metrics.cost'), value: formatCost(run.metrics.costUsd) },
        { label: t('runs.metrics.endReason'), value: t(`runs.endReason.${run.metrics.endReason}`) },
      ]} />
      {run.huggingFaceUrl && <HuggingFaceLink about={t('runs.huggingFace')} url={run.huggingFaceUrl} />}
    </header>
  );
}

/** A part of a run's tab: its title with the ⓘ that explains it, a fact about it at the end, and what it shows. */
export function DetailSection({ title, about, aside, children }: { title: string; about?: ReactNode; aside?: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <header className={styles.sectionHead}><HintedHeading rank="h3" className="t-label" title={title} about={about} />{aside && <span className="t-micro c-faint">{aside}</span>}</header>
      {children}
    </section>
  );
}

/** A run's tabs link the task's files where the reader can open them: the public task page, or the console's. */
type TaskFilePath = (path: string) => string;

export function InputTab({ run, filePath }: { run: RunDetail; filePath: TaskFilePath }) {
  const { t } = useTranslation();
  const { input } = run;
  return (
    <>
      <DetailSection title={t('runs.input.instruction')} about={t('runs.input.note')} aside={t('runs.input.instructionSource')}>
        <div className={content.panel}>
          <p className={clsx(styles.prose, 't-body')}>{input.instruction}</p>
          {input.reportSchema && <pre className={clsx(styles.code, 't-mono c-muted')}>{input.reportSchema}</pre>}
        </div>
        <TextLink className="t-micro" to={filePath(INSTRUCTION_PATH)}>{t('tasks.viewFile')}</TextLink>
      </DetailSection>
      <DetailSection title={t('runs.input.environment')}>
        <FactList layout="rows" facts={input.environment} />
      </DetailSection>
      <DetailSection title={t('runs.input.harness')} about={t('runs.input.harnessNote')} aside={`${input.harness.name} · v${input.harness.version}`}>
        <TextLink className="t-micro" href={input.harness.toolDefinitionsUrl}>{t('runs.input.toolDefinitions')}</TextLink>
      </DetailSection>
    </>
  );
}

export function OutputTab({ run, onStep }: { run: RunDetail; onStep: (step: number) => void }) {
  const { t } = useTranslation();
  const { submission, finalReply, artifacts, patchUrl } = run.output;
  return (
    <>
      <DetailSection title={t('runs.output.submission')} about={t('runs.output.note')} aside={t('runs.output.submissionAside', { attempt: submission.attempt, step: submission.step, count: submission.files.length })}>
        <ul className={styles.files}>
          {submission.files.map(file => (
            <li key={file.path}>
              {/* A file shows its size until opened to its diff, as a pull request lists it. */}
              <details>
                <summary>
                  <span className={styles.chevron}><ArrowIcon direction="right" /></span>
                  <span className="t-mono">{file.path}</span>
                  <ChangeSize additions={file.additions} deletions={file.deletions} />
                </summary>
                {file.patch ? <Diff lines={file.patch} /> : <p className="t-micro c-faint">{t('runs.output.fullPatch')}</p>}
              </details>
            </li>
          ))}
        </ul>
      </DetailSection>
      <DetailSection title={t('runs.output.finalReply')} aside={t('runs.step', { step: finalReply.step })}>
        <div className={content.panel}><p className="t-body">{finalReply.text}</p></div>
      </DetailSection>
      <div className={styles.links}>
        {artifacts.map(artifact => <TextLink key={artifact.name} className="t-micro" href={artifact.url}>{t('runs.output.artifact', { name: artifact.name })}</TextLink>)}
        <TextLink className="t-micro" href={patchUrl}>{t('runs.output.downloadPatch')}</TextLink>
        <TextLink className="t-micro" onClick={() => onStep(finalReply.step)}>{t('runs.output.inTrajectory')}</TextLink>
      </div>
    </>
  );
}

export function GradingTab({ run, filePath, check, onCheck }: { run: RunDetail; filePath: TaskFilePath; check: string | undefined; onCheck: (id: string | undefined) => void }) {
  const { t } = useTranslation();
  const { grading } = run;
  return (
    <>
      <div className={styles.summary}>
        <span className={styles.total}>
          <span className="t-label">{t('runs.grading.total', { count: grading.total })}</span>
          <InfoHint label={t('ui.about', { subject: t('runs.grading.checks') })}><p>{t('runs.grading.intro')}</p><p>{t('runs.grading.note')}</p></InfoHint>
        </span>
        <span className="t-micro c-ok">{t('runs.grading.passed', { count: grading.passCount })}</span>
        {grading.total > grading.passCount && <span className="t-micro c-bad">{t('runs.grading.failed', { count: grading.total - grading.passCount })}</span>}
        <TextLink className="t-micro" href={grading.codeUrl}>{t('runs.grading.downloadCode')}</TextLink>
      </div>
      <div className={clsx(table.table, styles.checks)} role="table" aria-label={t('runs.grading.checks')}>
        <div className={clsx(table.row, table.head, styles.checkRow, 't-micro c-faint')} role="row">
          <span role="columnheader">{t('runs.grading.id')}</span><span role="columnheader">{t('runs.grading.check')}</span>
          <span role="columnheader">{t('runs.grading.method')}</span><span role="columnheader">{t('runs.grading.result')}</span>
        </div>
        {grading.checks.map(item => {
          const open = check === item.id;
          return (
            <div key={item.id} role="row">
              <button type="button" className={clsx(table.row, table.link, styles.checkRow)} onClick={() => onCheck(open ? undefined : item.id)} aria-expanded={open}>
                <span className="t-mono c-faint">{item.id}</span>
                <span className="t-small">{item.title}</span>
                <span className="t-micro c-muted">{t(`runs.method.${item.method}`)}{item.samples ? t('runs.grading.samples', { count: item.samples }) : ''}</span>
                <span className="t-micro"><OutcomeText outcome={item.passed ? 'passed' : 'failed'}>{t(`runs.outcome.${item.passed ? 'passed' : 'failed'}`)}</OutcomeText></span>
              </button>
              {open && (
                <div className={styles.checkDetail}>
                  {item.rubric && <p className="t-small c-muted">{t('runs.grading.rubric', { rubric: item.rubric })}</p>}
                  {item.code && (
                    <>
                      <TextLink className="t-mono" to={filePath(item.code.path)}>{item.code.path}</TextLink>
                      <pre className={clsx(content.panel, styles.code, 't-mono c-muted')}>{item.code.source}</pre>
                    </>
                  )}
                  {!item.code && !item.rubric && <p className="t-micro c-faint">{t('runs.grading.codeInPackage')}</p>}
                  {item.observed && <p className={clsx('t-micro', item.passed ? 'c-muted' : 'c-bad')}>{t('runs.grading.observed', { observed: item.observed })}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function FailureTab({ run, onCheck, onStep }: { run: RunDetail; onCheck: (id: string) => void; onStep: (step: number) => void }) {
  const { t } = useTranslation();
  if (run.outcome === 'passed') {
    return <p className="t-body c-muted">{t('runs.failure.passed', { count: run.grading.total })}</p>;
  }
  if (run.outcome === 'executionFailed') {
    return <p className="t-body c-muted">{t('runs.failure.executionFailed')}</p>;
  }
  if (!run.failure) {
    throw new Error(`Run ${run.id} failed without a failure record`);
  }
  const { failedChecks, review } = run.failure;
  return (
    <>
      <DetailSection title={t('runs.failure.failedChecks')} aside={t('runs.failure.failedOf', { failed: failedChecks.length, count: run.grading.total })}>
        <ul className={styles.failedList}>
          {failedChecks.map(item => (
            <li key={item.id}>
              <span className={styles.ring} aria-hidden="true" />
              <div><p><span className="t-mono c-faint">{item.id}</span> <span className="t-small">{item.title}</span></p><p className="t-micro c-muted">{item.detail}</p></div>
              <TextLink className="t-micro c-muted" onClick={() => onCheck(item.id)}>{t('runs.failure.viewCheck')}</TextLink>
            </li>
          ))}
        </ul>
      </DetailSection>
      <DetailSection title={t('runs.failure.review')} about={t('runs.failure.note')} aside={review && t('runs.failure.reviewedOn', { date: review.reviewedOn })}>
        {review ? (
          <div className={content.panel}>
            <p className="t-body">{review.text}</p>
            <p className={styles.evidence}>
              <span className="t-micro c-faint">{t('runs.failure.evidence')}</span>
              {review.evidenceSteps.map(step => <TextLink key={step} className="t-micro" onClick={() => onStep(step)}>{t('runs.step', { step })}</TextLink>)}
            </p>
          </div>
        ) : <p className="t-small c-muted">{t('runs.failure.notReviewed')}</p>}
      </DetailSection>
    </>
  );
}
