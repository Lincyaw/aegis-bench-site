import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useRun, useTrajectory, type RunDetail, type TimelineLegend } from '../api/client';
import { VendorBadge } from '../models/ModelBadge';
import { FactList } from '../ui/content';
import content from '../ui/content.module.css';
import controls from '../ui/controls.module.css';
import navigation from '../ui/navigation.module.css';
import { TabRow } from '../ui/navigation';
import table from '../ui/table.module.css';
import { OutcomeBadge, OutcomeText } from './Outcome';
import { RUN_TABS, defaultRunTab, type RunTab } from './presentation';
import { TrajectoryView } from './TrajectoryView';
import styles from './RunDetailPanel.module.css';

/** Which view of a run is shown: its tab and, within it, the step or check it opens. */
export interface RunView {
  tab: RunTab;
  step?: number;
  check?: string;
}

/** One run's five views: what the model received, what it produced, how it was graded, why it failed and its trajectory. */
export function RunDetailPanel({ runId, legend, view, onView }: { runId: string; legend: TimelineLegend; view: Partial<RunView>; onView: (view: RunView) => void }) {
  const { t } = useTranslation();
  const run = useRun(runId);
  const trajectory = useTrajectory(runId);
  const tab = view.tab ?? defaultRunTab(run);
  const counts: Partial<Record<RunTab, number>> = { grading: run.grading.total, failure: run.failure?.failedChecks.length, trajectory: trajectory.steps.length };
  return (
    <div className={styles.root}>
      <RunHeader run={run} />
      <TabRow current={tab} className={styles.tabs} role="tablist" aria-label={t('runs.detailLabel')}>
        {RUN_TABS.map(item => (
          <button key={item} type="button" role="tab" data-tab={item} aria-selected={item === tab} className={clsx(navigation.tab, 't-small')} onClick={() => onView({ tab: item })}>
            {t(`runs.tab.${item}`)}{counts[item] !== undefined && <span className="t-micro c-faint"> {counts[item]}</span>}
          </button>
        ))}
      </TabRow>
      <div className={styles.content} role="tabpanel">
        {tab === 'input' && <InputTab run={run} />}
        {tab === 'output' && <OutputTab run={run} onStep={step => onView({ tab: 'trajectory', step })} />}
        {tab === 'grading' && <GradingTab run={run} check={view.check} onCheck={check => onView({ tab: 'grading', check })} />}
        {tab === 'failure' && <FailureTab run={run} onCheck={check => onView({ tab: 'grading', check })} onStep={step => onView({ tab: 'trajectory', step })} />}
        {tab === 'trajectory' && <TrajectoryView runId={runId} legend={legend} evidence={run.failure?.review?.evidenceSteps ?? []} selected={view.step} onSelect={step => onView({ tab: 'trajectory', step })} />}
      </div>
    </div>
  );
}

export function RunHeader({ run }: { run: RunDetail }) {
  const { t } = useTranslation();
  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <VendorBadge model={run.model} />
        <h2 className="t-heading">{run.model.name} · {run.harness.name}</h2>
        <span className="t-small c-muted">{t('runs.attempt', { attempt: run.attempt })}</span>
        <OutcomeBadge outcome={run.outcome} />
      </div>
      <p className="t-small c-muted">{run.task.id} {run.task.title} · {t('runs.attemptOf', { attempt: run.attempt, count: run.attemptCount })}</p>
      <FactList layout="inline" facts={[
        { label: t('runs.metrics.steps'), value: run.metrics.steps },
        { label: t('runs.metrics.duration'), value: t('benchmarks.minutes', { count: run.metrics.durationMinutes }) },
        { label: t('runs.metrics.submissions'), value: t('benchmarks.times', { count: run.metrics.submissions }) },
        { label: t('runs.metrics.outputTokens'), value: `${Math.round(run.metrics.outputTokens / 1000)}K` },
        { label: t('runs.metrics.cost'), value: `$${run.metrics.costUsd.toFixed(2)}` },
        { label: t('runs.metrics.endReason'), value: t(`runs.endReason.${run.metrics.endReason}`) },
      ]} />
    </header>
  );
}

export function DetailSection({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <header className={styles.sectionHead}><h3 className="t-label">{title}</h3>{aside && <span className="t-micro c-faint">{aside}</span>}</header>
      {children}
    </section>
  );
}

export function InputTab({ run }: { run: RunDetail }) {
  const { t } = useTranslation();
  const { input } = run;
  return (
    <>
      <DetailSection title={t('runs.input.instruction')} aside={t('runs.input.instructionSource')}>
        <div className={content.panel}>
          <p className={clsx(styles.prose, 't-body')}>{input.instruction}</p>
          {input.reportSchema && <pre className={clsx(styles.code, 't-mono c-muted')}>{input.reportSchema}</pre>}
        </div>
      </DetailSection>
      <DetailSection title={t('runs.input.environment')}>
        <FactList layout="rows" facts={input.environment} />
      </DetailSection>
      <DetailSection title={t('runs.input.harness')} aside={`${input.harness.name} · v${input.harness.version}`}>
        <p className="t-small c-muted">{t('runs.input.harnessNote')}</p>
        <a className={clsx(controls.textLink, 't-micro')} href={input.harness.toolDefinitionsUrl}>{t('runs.input.toolDefinitions')}</a>
      </DetailSection>
      <p className="t-micro c-faint">{t('runs.input.note')}</p>
    </>
  );
}

/** A unified diff, each line coloured by whether it adds, removes or locates. */
export function Diff({ lines }: { lines: string[] }) {
  return (
    <pre className={clsx(content.panel, styles.diff, 't-mono')}>
      {lines.map((line, index) => <span key={index} className={line.startsWith('+') ? 'c-ok' : line.startsWith('-') ? 'c-bad' : line.startsWith('@@') ? 'c-faint' : 'c-muted'}>{line}{'\n'}</span>)}
    </pre>
  );
}

export function OutputTab({ run, onStep }: { run: RunDetail; onStep: (step: number) => void }) {
  const { t } = useTranslation();
  const { submission, finalReply, artifacts, patchUrl } = run.output;
  return (
    <>
      <DetailSection title={t('runs.output.submission')} aside={t('runs.output.submissionAside', { attempt: submission.attempt, step: submission.step, count: submission.files.length })}>
        <ul className={styles.files}>
          {submission.files.map(file => (
            <li key={file.path}>
              <details open={file.patch !== undefined}>
                <summary>
                  <span className="t-mono">{file.path}</span>
                  <span className="t-micro"><span className="c-ok">+{file.additions}</span> <span className="c-bad">−{file.deletions}</span></span>
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
        {artifacts.map(artifact => <a key={artifact.name} className={clsx(controls.textLink, 't-micro')} href={artifact.url}>{t('runs.output.artifact', { name: artifact.name })}</a>)}
        <a className={clsx(controls.textLink, 't-micro')} href={patchUrl}>{t('runs.output.downloadPatch')}</a>
        <button type="button" className={clsx(controls.textLink, 't-micro')} onClick={() => onStep(finalReply.step)}>{t('runs.output.inTrajectory')}</button>
      </div>
      <p className="t-micro c-faint">{t('runs.output.note')}</p>
    </>
  );
}

export function GradingTab({ run, check, onCheck }: { run: RunDetail; check: string | undefined; onCheck: (id: string | undefined) => void }) {
  const { t } = useTranslation();
  const { grading } = run;
  return (
    <>
      <p className="t-small c-muted">{t('runs.grading.intro')}</p>
      <div className={styles.summary}>
        <span className="t-label">{t('runs.grading.total', { count: grading.total })}</span>
        <span className="t-micro c-ok">{t('runs.grading.passed', { count: grading.passCount })}</span>
        {grading.total > grading.passCount && <span className="t-micro c-bad">{t('runs.grading.failed', { count: grading.total - grading.passCount })}</span>}
        <a className={clsx(controls.textLink, 't-micro')} href={grading.codeUrl}>{t('runs.grading.downloadCode')}</a>
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
                  {item.code && <><p className="t-mono c-faint">{item.code.path}</p><pre className={clsx(content.panel, styles.code, 't-mono c-muted')}>{item.code.source}</pre></>}
                  {!item.code && !item.rubric && <p className="t-micro c-faint">{t('runs.grading.codeInPackage')}</p>}
                  {item.observed && <p className={clsx('t-micro', item.passed ? 'c-muted' : 'c-bad')}>{t('runs.grading.observed', { observed: item.observed })}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="t-micro c-faint">{t('runs.grading.note')}</p>
    </>
  );
}

export function FailureTab({ run, onCheck, onStep }: { run: RunDetail; onCheck: (id: string) => void; onStep: (step: number) => void }) {
  const { t } = useTranslation();
  if (run.outcome === 'passed') {
    return <p className="t-body c-muted">{t('runs.failure.passed', { count: run.grading.total })}</p>;
  }
  if (run.outcome === 'executionFailed' || !run.failure) {
    return <p className="t-body c-muted">{t('runs.failure.executionFailed')}</p>;
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
              <button type="button" className={clsx(controls.textLink, 't-micro c-muted')} onClick={() => onCheck(item.id)}>{t('runs.failure.viewCheck')}</button>
            </li>
          ))}
        </ul>
      </DetailSection>
      <DetailSection title={t('runs.failure.review')} aside={review && t('runs.failure.reviewedOn', { date: review.reviewedOn })}>
        {review ? (
          <div className={content.panel}>
            <p className="t-body">{review.text}</p>
            <p className={styles.evidence}>
              <span className="t-micro c-faint">{t('runs.failure.evidence')}</span>
              {review.evidenceSteps.map(step => <button key={step} type="button" className={clsx(controls.textLink, 't-micro')} onClick={() => onStep(step)}>{t('runs.step', { step })}</button>)}
            </p>
          </div>
        ) : <p className="t-small c-muted">{t('runs.failure.notReviewed')}</p>}
      </DetailSection>
      <p className="t-micro c-faint">{t('runs.failure.note')}</p>
    </>
  );
}
