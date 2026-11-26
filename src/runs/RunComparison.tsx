import { clsx } from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GradingCheck, RunDetail, Trajectory, TrajectoryStep } from '../api/client';
import { VendorBadge } from '../models/ModelBadge';
import { formatCost } from '../results/presentation';
import content from '../ui/content.module.css';
import { ToggleChip } from '../ui/controls';
import controls from '../ui/controls.module.css';
import { OutcomeBadge, OutcomeDot, OutcomeText } from './Outcome';
import { isKnownTool } from './presentation';
import { DetailSection, Diff } from './RunDetailPanel';
import { submissionOf, targetOf, textOf } from './trajectory';
import styles from './RunComparison.module.css';

/*
 * Runs laid out for checking how they were graded: one run's output and whole trajectory beside every check, or
 * several runs of a task aligned check by check. Everything is open and on one page.
 */

/** A JSON value as a link that saves it to a file. */
export function JsonDownload({ value, file, children }: { value: unknown; file: string; children: string }) {
  return (
    <a className={clsx(controls.textLink, 't-micro')} href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(value, null, 2))}`} download={file}>
      {children}
    </a>
  );
}

/** The run's whole record and trajectory to save, and its directory on Hugging Face when it is kept there. */
export function RunDownloads({ run, trajectory }: { run: RunDetail; trajectory: Trajectory }) {
  const { t } = useTranslation();
  return (
    <div className={styles.downloads}>
      <JsonDownload value={run} file={`${run.id}.json`}>{t('runs.compare.downloadRun')}</JsonDownload>
      <JsonDownload value={trajectory} file={`${run.id}.trajectory.json`}>{t('runs.compare.downloadTrajectory')}</JsonDownload>
      {run.huggingFaceUrl && <a className={clsx(controls.textLink, 't-micro')} href={run.huggingFaceUrl} target="_blank" rel="noreferrer">{t('ui.openOnHuggingFace')}</a>}
    </div>
  );
}

/** One run: what it produced and every step it took on the left, every check and its verdict on the right. */
export function SingleRunComparison({ run, trajectory }: { run: RunDetail; trajectory: Trajectory }) {
  const { t } = useTranslation();
  const { submission, finalReply } = run.output;
  const evidence = run.failure?.review?.evidenceSteps ?? [];
  return (
    <div className={styles.single}>
      <RunDownloads run={run} trajectory={trajectory} />
      <div className={styles.halves}>
        <div className={styles.work}>
          <DetailSection title={t('runs.output.finalReply')} aside={t('runs.step', { step: finalReply.step })}>
            <div className={content.panel}><p className="t-body">{finalReply.text}</p></div>
          </DetailSection>
          <DetailSection title={t('runs.output.submission')} aside={t('runs.output.submissionAside', { attempt: submission.attempt, step: submission.step, count: submission.files.length })}>
            <ul className={styles.files}>
              {submission.files.map(file => (
                <li key={file.path}>
                  <p className={styles.file}><span className="t-mono">{file.path}</span><span className="t-micro"><span className="c-ok">+{file.additions}</span> <span className="c-bad">−{file.deletions}</span></span></p>
                  {file.patch && <Diff lines={file.patch} />}
                </li>
              ))}
            </ul>
          </DetailSection>
          <DetailSection title={t('runs.tab.trajectory')} aside={t('runs.stepCount', { count: trajectory.steps.length })}>
            <ol className={styles.steps}>
              {trajectory.steps.map(step => <ComparedStep key={step.step_id} step={step} evidence={evidence.includes(step.step_id)} />)}
            </ol>
          </DetailSection>
        </div>
        <div className={styles.verdicts}>
          <CheckVerdicts run={run} />
        </div>
      </div>
    </div>
  );
}

/** A step of the trajectory with its sentence and what came back; a failed submission and the review's evidence stand out. */
export function ComparedStep({ step, evidence }: { step: TrajectoryStep; evidence: boolean }) {
  const { t } = useTranslation();
  const tool = step.tool_calls?.[0]?.function_name;
  const submission = submissionOf(step);
  const kind = step.source === 'agent' ? (tool === undefined ? t('runs.reply') : isKnownTool(tool) ? t(`runs.tools.${tool}`) : tool) : t(`runs.source.${step.source}`);
  const result = step.observation?.results[0]?.content;
  const target = targetOf(step);
  return (
    <li className={clsx(styles.step, submission && !submission.passed && styles.failedStep, evidence && styles.evidenceStep)}>
      <span className="t-mono c-faint">{step.step_id}</span>
      <div className={styles.stepBody}>
        <p className={styles.stepHead}>
          <span className={clsx('t-micro', submission ? (submission.passed ? 'c-ok' : 'c-bad') : 'c-muted')}>{kind}</span>
          {target && <span className="t-mono c-muted">{target}</span>}
          {evidence && <span className="t-micro c-bad">{t('runs.compare.evidence')}</span>}
        </p>
        <p className={clsx(styles.text, step.source === 'agent' ? 't-small' : 't-small c-muted')}>{textOf(step.message)}</p>
        {result !== undefined && <p className={clsx(styles.text, 't-micro', submission && !submission.passed ? 'c-bad' : 'c-faint')}>{textOf(result)}</p>}
      </div>
    </li>
  );
}

/** Every check of a run, the failed ones first and open with what this run did, the passed ones a line each. */
export function CheckVerdicts({ run }: { run: RunDetail }) {
  const { t } = useTranslation();
  const { checks, total, passCount } = run.grading;
  const details = new Map(run.failure?.failedChecks.map(check => [check.id, check.detail]));
  const failed = checks.filter(check => !check.passed);
  // How a check decides, with the number of judge samples when a model reviews it.
  const methodOf = (check: GradingCheck) => `${t(`runs.method.${check.method}`)}${check.samples ? t('runs.grading.samples', { count: check.samples }) : ''}`;
  return (
    <>
      <p className={styles.verdictsHead}>
        <span className="t-label">{t('runs.tab.grading')} · {t('runs.grading.total', { count: total })}</span>
        <span className="t-micro c-ok">{t('runs.grading.passed', { count: passCount })}</span>
        {failed.length > 0 && <span className="t-micro c-bad">{t('runs.grading.failed', { count: failed.length })}</span>}
      </p>
      {failed.map(check => (
        <div key={check.id} className={styles.failedCheck}>
          <CheckName check={check} />
          <p className="t-micro c-faint">{methodOf(check)}{check.code && ` · ${check.code.path}`}</p>
          <p className="t-micro c-bad">{check.observed ? t('runs.grading.observed', { observed: check.observed }) : details.get(check.id)}</p>
          {check.rubric && <p className="t-micro c-muted">{t('runs.grading.rubric', { rubric: check.rubric })}</p>}
        </div>
      ))}
      <ul className={styles.passedChecks}>
        {checks.filter(check => check.passed).map(check => (
          <li key={check.id}>
            <CheckName check={check} />
            {check.rubric && <p className="t-micro c-muted">{methodOf(check)} · {t('runs.grading.rubric', { rubric: check.rubric })}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}

export function CheckName({ check }: { check: GradingCheck }) {
  return (
    <p className={styles.checkName}>
      <OutcomeDot outcome={check.passed ? 'passed' : 'failed'} />
      <span className="t-mono c-faint">{check.id}</span>
      <span className="t-small">{check.title}</span>
    </p>
  );
}

/**
 * Several runs of one task, a column each, every row comparing one thing: the runs, their final replies, their changes,
 * how many checks they passed, and each check. By default only the checks the runs disagree on are listed.
 */
export function RunsSideBySide({ runs, onOpen, onRemove }: { runs: RunDetail[]; onOpen: (runId: string) => void; onRemove: (runId: string) => void }) {
  const { t } = useTranslation();
  const [onlyDifferent, setOnlyDifferent] = useState(true);
  const verdicts = runs.map(run => new Map(run.grading.checks.map(check => [check.id, check])));
  const checks = [...new Map(runs.flatMap(run => run.grading.checks).map(check => [check.id, check])).values()];
  const differing = checks.filter(check => new Set(verdicts.map(verdict => verdict.get(check.id)?.passed)).size > 1);
  const shown = onlyDifferent ? differing : checks;
  const details = runs.map(run => new Map(run.failure?.failedChecks.map(check => [check.id, check.detail])));
  return (
    <div className={styles.grid} data-runs={runs.length} role="table" aria-label={t('runs.view.compare')}>
      <div className={styles.row} role="row">
        <div className={styles.label} role="rowheader"><p className="t-label">{runs[0].task.id} {runs[0].task.title}</p></div>
        {runs.map(run => (
          <div key={run.id} className={styles.cell} role="cell">
            <p className={styles.runName}><VendorBadge model={run.model} /><span className="t-label">{run.model.name} · {run.harness.name}</span><OutcomeBadge outcome={run.outcome} /></p>
            <p className={clsx(styles.figures, 't-micro c-muted')}>
              {t('runs.attempt', { attempt: run.attempt })} · {t('benchmarks.steps', { count: run.metrics.steps })} · {t('benchmarks.minutes', { count: run.metrics.durationMinutes })} · {formatCost(run.metrics.costUsd)}
            </p>
            <p className={styles.actions}>
              <button type="button" className={clsx(controls.textLink, 't-micro')} onClick={() => onOpen(run.id)}>{t('runs.compare.open')}</button>
              <button type="button" className="t-micro c-faint" onClick={() => onRemove(run.id)}>{t('runs.compare.remove')}</button>
            </p>
          </div>
        ))}
      </div>
      <div className={styles.row} role="row">
        <div className={styles.label} role="rowheader"><p className="t-label">{t('runs.output.finalReply')}</p></div>
        {runs.map(run => <div key={run.id} className={styles.cell} role="cell"><p className="t-small">{run.output.finalReply.text}</p></div>)}
      </div>
      <div className={styles.row} role="row">
        <div className={styles.label} role="rowheader"><p className="t-label">{t('runs.output.submission')}</p></div>
        {runs.map(run => (
          <div key={run.id} className={styles.cell} role="cell">
            {run.output.submission.files.map(file => (
              <p key={file.path} className={styles.file}><span className="t-mono">{file.path}</span><span className="t-micro"><span className="c-ok">+{file.additions}</span> <span className="c-bad">−{file.deletions}</span></span></p>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.row} role="row">
        <div className={clsx(styles.label, styles.gradingLabel)} role="rowheader">
          <p className="t-label">{t('runs.tab.grading')} · {t('runs.grading.total', { count: checks.length })}</p>
          <ToggleChip pressed={onlyDifferent} onToggle={() => setOnlyDifferent(!onlyDifferent)}>{t('runs.compare.onlyDifferent', { count: differing.length })}</ToggleChip>
        </div>
        {runs.map(run => (
          <div key={run.id} className={styles.cell} role="cell">
            <p className={styles.figures}>
              <span className="t-small c-ok">{t('runs.grading.passed', { count: run.grading.passCount })}</span>
              {run.grading.total > run.grading.passCount && <span className="t-small c-bad">{t('runs.grading.failed', { count: run.grading.total - run.grading.passCount })}</span>}
            </p>
          </div>
        ))}
      </div>
      {shown.map(check => (
        <div key={check.id} className={styles.row} role="row">
          <div className={styles.label} role="rowheader"><p className={styles.checkName}><span className="t-mono c-faint">{check.id}</span><span className="t-small">{check.title}</span></p></div>
          {runs.map((run, index) => {
            const verdict = verdicts[index].get(check.id);
            const outcome = verdict?.passed ? 'passed' : 'failed';
            return (
              <div key={run.id} className={clsx(styles.cell, !verdict?.passed && styles.failedCell)} role="cell">
                <span className="t-small"><OutcomeText outcome={outcome}>{t(`runs.outcome.${outcome}`)}</OutcomeText></span>
                {verdict && !verdict.passed && (
                  <p className="t-micro c-muted">{verdict.observed ? t('runs.grading.observed', { observed: verdict.observed }) : details[index].get(check.id)}</p>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {differing.length === 0 && <p className={clsx(styles.rest, 't-micro c-faint')}>{t('runs.compare.noneDifferent')}</p>}
      {differing.length > 0 && onlyDifferent && checks.length > differing.length && (
        <p className={clsx(styles.rest, 't-micro c-faint')}>{t('runs.compare.sameRest', { count: checks.length - differing.length })}</p>
      )}
    </div>
  );
}
