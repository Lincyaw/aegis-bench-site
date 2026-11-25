import { clsx } from 'clsx';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTrajectoryPage, type TimelineLegend, type TimelineStep, type TrajectoryStep } from '../api/client';
import { ArrowIcon, IconButton } from '../ui/controls';
import { Pager } from '../ui/navigation';
import { TRAJECTORY_PAGE_SIZE, isKnownTool, trajectoryPageStartOf } from './presentation';
import { RunScrubber, TimelineLegendRow } from './RunTimeline';
import { submissionOf, targetOf, textOf } from './trajectory';
import styles from './TrajectoryView.module.css';

/**
 * The ATIF trajectory as the run's timeline of marks and a list of its steps a page at a time; selecting either opens
 * that step, turning the list to its page.
 */
export function TrajectoryView({ runId, timeline, legend, evidence, selected, onSelect }: {
  runId: string;

  /** The run's agent steps as the server marked them */
  timeline: TimelineStep[];

  legend: TimelineLegend;

  /** Step ids the failure review relies on; they are marked in the list */
  evidence: number[];

  selected: number | undefined;
  onSelect: (stepId: number | undefined) => void;
}) {
  const { t } = useTranslation();
  // The list turns to the page holding a newly selected step, and stays there when the step closes.
  const [pageStart, setPageStart] = useState(selected === undefined ? 0 : trajectoryPageStartOf(selected));
  const [followed, setFollowed] = useState(selected);
  if (selected !== followed) {
    setFollowed(selected);
    if (selected !== undefined) {
      setPageStart(trajectoryPageStartOf(selected));
    }
  }
  // The page in view stays until the next one arrives.
  const page = useTrajectoryPage(runId, useDeferredValue(pageStart), TRAJECTORY_PAGE_SIZE);
  const firstShown = page.items[0]?.step_id;
  const lastShown = page.items.at(-1)?.step_id;
  const selectedRow = useRef<HTMLLIElement>(null);
  useEffect(() => {
    selectedRow.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected, firstShown]);
  const stepIds = timeline.map(step => step.stepId);
  const position = stepIds.indexOf(selected ?? -1);
  const go = (offset: number) => onSelect(stepIds[Math.min(stepIds.length - 1, Math.max(0, (position < 0 ? 0 : position) + offset))]);
  const turnTo = (start: number) => {
    setPageStart(start);
    onSelect(undefined);
  };
  return (
    <div className={styles.view}>
      {timeline.length > 0 && (
        <div className={styles.controls}>
          <IconButton label={t('runs.previousStep')} onClick={() => go(-1)}><ArrowIcon direction="left" /></IconButton>
          <IconButton label={t('runs.nextStep')} onClick={() => go(1)}><ArrowIcon direction="right" /></IconButton>
          <RunScrubber timeline={timeline} current={selected} onSelect={onSelect} />
          <span className="t-micro c-muted">{selected === undefined ? t('runs.stepCount', { count: page.total }) : t('runs.stepOf', { step: selected, count: page.total })}</span>
        </div>
      )}
      <TimelineLegendRow legend={legend} />
      <ol className={styles.steps}>
        {page.items.map(step => {
          const open = step.step_id === selected;
          return (
            <li key={step.step_id} ref={open ? selectedRow : undefined} className={clsx(styles.step, open && styles.open, evidence.includes(step.step_id) && styles.evidence)}>
              <StepHead step={step} open={open} onToggle={() => onSelect(open ? undefined : step.step_id)} />
              {open && (step.source === 'agent' ? <StepDetail step={step} /> : <pre className={clsx(styles.userText, 't-small')}>{textOf(step.message)}</pre>)}
            </li>
          );
        })}
      </ol>
      {page.total > TRAJECTORY_PAGE_SIZE && (
        <Pager
          label={t('runs.stepRange', { from: firstShown, to: lastShown, total: page.total })}
          atStart={pageStart === 0} atEnd={pageStart + TRAJECTORY_PAGE_SIZE >= page.total}
          onPrevious={() => turnTo(pageStart - TRAJECTORY_PAGE_SIZE)} onNext={() => turnTo(pageStart + TRAJECTORY_PAGE_SIZE)}
        />
      )}
      <p className="t-micro c-faint">{t('runs.trajectoryNote', { version: page.schema_version, agent: `${page.agent.name} ${page.agent.version}`, model: page.agent.model_name, count: page.final_metrics?.total_steps, cost: page.final_metrics?.total_cost_usd?.toFixed(2) })}</p>
    </div>
  );
}

/** A step's row: its number, what kind of step it is, its target and its sentence. */
export function StepHead({ step, open, onToggle }: { step: TrajectoryStep; open: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const tool = step.tool_calls?.[0]?.function_name;
  const submission = submissionOf(step);
  const kind = step.source === 'agent' ? (tool === undefined ? t('runs.reply') : isKnownTool(tool) ? t(`runs.tools.${tool}`) : tool) : t(`runs.source.${step.source}`);
  const target = targetOf(step);
  return (
    <button type="button" className={styles.stepHead} onClick={onToggle} aria-expanded={open}>
      <span className="t-mono c-faint">{step.step_id}</span>
      <span className={clsx(styles.tag, submission && (submission.passed ? styles.passedTag : styles.failedTag), 't-micro')}>{kind}</span>
      {target && <span className={clsx(styles.target, 't-mono c-muted')}>{target}</span>}
      <span className={clsx(styles.message, 't-small')}>
        {step.source === 'user' ? t('runs.taskText') : submission ? textOf(step.observation?.results[0]?.content) : textOf(step.message)}
      </span>
    </button>
  );
}

/** An agent step opened: its call, what the environment returned, and what the step cost. */
export function StepDetail({ step }: { step: TrajectoryStep }) {
  const { t } = useTranslation();
  const call = step.tool_calls?.[0];
  const result = step.observation?.results[0];
  return (
    <div className={styles.detail}>
      {call && (
        <div className={styles.block}>
          <p className="t-micro c-faint">{t('runs.call', { tool: call.function_name })}</p>
          <pre className="t-mono">{JSON.stringify(call.arguments, null, 2)}</pre>
        </div>
      )}
      {result?.content !== undefined && (
        <div className={styles.block}>
          <p className="t-micro c-faint">{t('runs.result')}</p>
          <pre className="t-mono">{textOf(result.content)}</pre>
        </div>
      )}
      {step.metrics && (
        <p className="t-micro c-faint">
          {t('runs.stepMetrics', { input: step.metrics.prompt_tokens?.toLocaleString(), output: step.metrics.completion_tokens?.toLocaleString() })}
          {step.metrics.cost_usd !== undefined && ` · $${step.metrics.cost_usd.toFixed(4)}`}
          {step.timestamp && ` · ${step.timestamp.slice(11, 19)} UTC`}
        </p>
      )}
    </div>
  );
}
