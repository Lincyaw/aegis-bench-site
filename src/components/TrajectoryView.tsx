import { useEffect, useRef } from 'react';
import type { TimelineLegend, Trajectory, TrajectoryStep } from '../api/client';
import { TOOL_LABELS, agentSteps, markOf, submissionOf, targetOf, textOf } from '../trajectory';
import { RunTimeline, TimelineLegendRow } from './RunTimeline';
import { LoadError, Loading } from './ui';
import styles from './TrajectoryView.module.css';

interface TrajectoryViewProps {
  trajectory: Trajectory | undefined;
  error: Error | null;
  legend: TimelineLegend;

  /** Step ids the failure review relies on; they are marked in the timeline and the list. */
  evidence: number[];

  selected: number | undefined;
  onSelect: (stepId: number) => void;
}

function StepDetail({ step }: { step: TrajectoryStep }) {
  const call = step.tool_calls?.[0];
  const result = step.observation?.results[0];
  return (
    <div className={styles.detail}>
      {call && (
        <div className={styles.block}>
          <p className="t-micro c-faint">调用 · {call.function_name}</p>
          <pre className="t-mono">{JSON.stringify(call.arguments, null, 2)}</pre>
        </div>
      )}
      {result?.content !== undefined && (
        <div className={styles.block}>
          <p className="t-micro c-faint">输出</p>
          <pre className="t-mono">{textOf(result.content)}</pre>
        </div>
      )}
      {step.metrics && (
        <p className="t-micro c-faint">
          输入 {step.metrics.prompt_tokens?.toLocaleString()} tokens · 输出 {step.metrics.completion_tokens?.toLocaleString()} tokens
          {step.metrics.cost_usd !== undefined && ` · $${step.metrics.cost_usd.toFixed(4)}`}
          {step.timestamp && ` · ${step.timestamp.slice(11, 19)} UTC`}
        </p>
      )}
    </div>
  );
}

/** The ATIF trajectory as a timeline of marks and a list of steps; selecting either opens that step. */
export function TrajectoryView({ trajectory, error, legend, evidence, selected, onSelect }: TrajectoryViewProps) {
  const selectedRow = useRef<HTMLLIElement>(null);
  useEffect(() => {
    selectedRow.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected, trajectory]);
  if (error) {
    return <LoadError error={error} />;
  }
  if (!trajectory) {
    return <Loading label="正在加载轨迹" />;
  }
  const steps = agentSteps(trajectory);
  const marks = steps.map(step => markOf(step, legend.changeTools));
  const currentIndex = steps.findIndex(step => step.step_id === selected);
  const go = (offset: number) => {
    const next = steps[Math.min(steps.length - 1, Math.max(0, (currentIndex < 0 ? 0 : currentIndex) + offset))];
    onSelect(next.step_id);
  };
  return (
    <div className={styles.view}>
      <div className={styles.controls}>
        <button type="button" className="loop-edge" onClick={() => go(-1)} aria-label="上一步">◀</button>
        <button type="button" className="loop-edge" onClick={() => go(1)} aria-label="下一步">▶</button>
        <RunTimeline marks={marks} current={currentIndex < 0 ? undefined : currentIndex} onSelect={index => onSelect(steps[index].step_id)} />
        <span className="t-micro c-muted">{currentIndex < 0 ? `共 ${trajectory.steps.length} 步` : `第 ${selected} / ${trajectory.steps.length} 步`}</span>
      </div>
      <TimelineLegendRow legend={legend} />
      <ol className={styles.steps}>
        {trajectory.steps.map(step => {
          const call = step.tool_calls?.[0];
          const submission = submissionOf(step);
          const open = step.step_id === selected;
          const tag = step.source === 'agent' ? TOOL_LABELS[call?.function_name ?? ''] ?? call?.function_name ?? '回复' : step.source === 'user' ? '任务输入' : '系统';
          return (
            <li key={step.step_id} ref={open ? selectedRow : undefined} className={`${styles.step} ${open ? styles.open : ''} ${evidence.includes(step.step_id) ? styles.evidence : ''}`}>
              <button type="button" className={styles.stepHead} onClick={() => onSelect(open ? 0 : step.step_id)} aria-expanded={open}>
                <span className="t-mono c-faint">{step.step_id}</span>
                <span className={`${styles.tag} ${submission ? (submission.passed ? styles.ok : styles.bad) : ''} t-micro`}>{tag}</span>
                {targetOf(step) && <span className={`${styles.target} t-mono c-muted`}>{targetOf(step)}</span>}
                <span className={`${styles.message} t-small`}>
                  {step.source === 'user' ? '给模型的任务原文' : submission ? textOf(step.observation?.results[0]?.content) : textOf(step.message)}
                </span>
              </button>
              {open && (step.source === 'agent' ? <StepDetail step={step} /> : <pre className={`${styles.userText} t-small`}>{textOf(step.message)}</pre>)}
            </li>
          );
        })}
      </ol>
      <p className="t-micro c-faint">轨迹以 ATIF（{trajectory.schema_version}）格式公开：{trajectory.agent.name} {trajectory.agent.version} · {trajectory.agent.model_name}，共 {trajectory.final_metrics?.total_steps} 步，成本 ${trajectory.final_metrics?.total_cost_usd?.toFixed(2)}。失败原因引用的步骤以红线标出。</p>
    </div>
  );
}
