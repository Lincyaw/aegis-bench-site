import type { ReactNode } from 'react';
import { useRun, useTrajectory, type CheckMethod, type RunDetail, type TimelineLegend } from '../api/client';
import { TrajectoryView } from './TrajectoryView';
import { LoadError, Loading, OUTCOME_LABELS, OutcomeDot, TabIndicator, VendorBadge } from './ui';
import styles from './RunDetailPanel.module.css';

export type RunTab = 'input' | 'output' | 'grading' | 'failure' | 'trajectory';

const TABS: { tab: RunTab; label: string }[] = [
  { tab: 'input', label: '输入' }, { tab: 'output', label: '输出' }, { tab: 'grading', label: '评分' },
  { tab: 'failure', label: '失败原因' }, { tab: 'trajectory', label: '轨迹' },
];

const METHOD_LABELS: Record<CheckMethod, string> = { hiddenTest: '隐藏测试', script: '脚本', modelReview: '模型评审' };

/** A failed run opens on why it failed; any other run on what it produced. */
function defaultTab(run: RunDetail): RunTab {
  return run.outcome === 'failed' ? 'failure' : run.outcome === 'executionFailed' ? 'trajectory' : 'output';
}

interface RunDetailPanelProps {
  runId: string;
  legend: TimelineLegend;
  tab: RunTab | undefined;
  step: number | undefined;
  check: string | undefined;
  onChange: (next: { tab: RunTab; step?: number; check?: string }) => void;
}

function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <header className={styles.sectionHead}><h3 className="t-label">{title}</h3>{aside && <span className="t-micro c-faint">{aside}</span>}</header>
      {children}
    </section>
  );
}

function InputTab({ run }: { run: RunDetail }) {
  const { input } = run;
  return (
    <>
      <Section title="任务说明" aside="原文 · instruction.md">
        <div className={styles.panel}>
          <p className={`${styles.prose} t-body`}>{input.instruction}</p>
          {input.reportSchema && <pre className="t-mono c-muted">{input.reportSchema}</pre>}
        </div>
      </Section>
      <Section title="运行环境">
        <dl className={styles.pairs}>
          {input.environment.map(item => <div key={item.label}><dt className="t-small c-muted">{item.label}</dt><dd className={item.label === '代码仓库' ? 't-mono' : 't-small'}>{item.value}</dd></div>)}
        </dl>
      </Section>
      <Section title="框架" aside={`${input.harness.name} · v${input.harness.version}`}>
        <p className="t-small c-muted">框架的系统提示词与工具定义原样公开，与其他任务相同。</p>
        <a className="link-arrow t-micro" href={input.harness.toolDefinitionsUrl}>查看系统提示词与工具定义</a>
      </Section>
      <p className="t-micro c-faint">同一任务的所有运行收到相同的输入。</p>
    </>
  );
}

function Diff({ lines }: { lines: string[] }) {
  return (
    <pre className={`${styles.panel} ${styles.diff} t-mono`}>
      {lines.map((line, index) => <span key={index} className={line.startsWith('+') ? 'c-ok' : line.startsWith('-') ? 'c-bad' : line.startsWith('@@') ? 'c-faint' : 'c-muted'}>{line}{'\n'}</span>)}
    </pre>
  );
}

function OutputTab({ run, onStep }: { run: RunDetail; onStep: (step: number) => void }) {
  const { submission, finalReply, artifacts, patchUrl } = run.output;
  return (
    <>
      <Section title="最终提交" aside={`第 ${submission.attempt} 次提交 · 第 ${submission.step} 步 · ${submission.files.length} 个文件`}>
        <ul className={styles.files}>
          {submission.files.map(file => (
            <li key={file.path}>
              <details open={file.patch !== undefined}>
                <summary>
                  <span className="t-mono">{file.path}</span>
                  <span className="t-micro"><span className="c-ok">+{file.additions}</span> <span className="c-bad">−{file.deletions}</span></span>
                </summary>
                {file.patch ? <Diff lines={file.patch} /> : <p className="t-micro c-faint">完整改动见下载的补丁文件。</p>}
              </details>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="模型的最后一条回复" aside={`第 ${finalReply.step} 步`}>
        <div className={styles.panel}><p className="t-body">{finalReply.text}</p></div>
      </Section>
      <div className={styles.links}>
        {artifacts.map(artifact => <a key={artifact.name} className="link-arrow t-micro" href={artifact.url}>查看 {artifact.name}</a>)}
        <a className="link-arrow t-micro" href={patchUrl}>下载完整改动（.patch）</a>
        <button type="button" className="link-arrow t-micro" onClick={() => onStep(finalReply.step)}>在轨迹中查看</button>
      </div>
      <p className="t-micro c-faint">输出按原样公开：最后一次提交的代码改动、模型的最后一条回复，以及任务要求提交的文件。</p>
    </>
  );
}

function GradingTab({ run, check, onCheck }: { run: RunDetail; check: string | undefined; onCheck: (id: string | undefined) => void }) {
  const { grading } = run;
  return (
    <>
      <p className="t-small c-muted">提交后在全新环境中执行全部检查，这些检查与模型在运行中能看到的测试不同。检查代码随公开任务一起发布，可在本地复现。</p>
      <div className={styles.summary}>
        <span className="t-label">{grading.total} 项检查</span>
        <span className="t-micro c-ok">通过 {grading.passCount}</span>
        {grading.total > grading.passCount && <span className="t-micro c-bad">未通过 {grading.total - grading.passCount}</span>}
        <a className="link-arrow t-micro" href={grading.codeUrl}>下载评分代码</a>
      </div>
      <div className={styles.checks} role="table" aria-label="检查项">
        <div className={`${styles.checkRow} ${styles.checkHead} t-micro c-faint`} role="row"><span>编号</span><span>检查内容</span><span>方式</span><span>结果</span></div>
        {grading.checks.map(item => {
          const open = check === item.id;
          return (
            <div key={item.id} className={styles.check} role="row">
              <button type="button" className={styles.checkRow} onClick={() => onCheck(open ? undefined : item.id)} aria-expanded={open}>
                <span className="t-mono c-faint">{item.id}</span>
                <span className="t-small">{item.title}</span>
                <span className="t-micro c-muted">{METHOD_LABELS[item.method]}{item.samples ? ` · ${item.samples} 次取中位数` : ''}</span>
                <span className={`${styles.result} t-micro ${item.passed ? 'c-ok' : 'c-bad'}`}><OutcomeDot outcome={item.passed ? 'passed' : 'failed'} />{item.passed ? '通过' : '未通过'}</span>
              </button>
              {open && (
                <div className={styles.checkDetail}>
                  {item.rubric && <p className="t-small c-muted">评分标准：{item.rubric}</p>}
                  {item.code && <><p className="t-mono c-faint">{item.code.path}</p><pre className={`${styles.panel} t-mono c-muted`}>{item.code.source}</pre></>}
                  {!item.code && !item.rubric && <p className="t-micro c-faint">检查代码见下载的评分代码包。</p>}
                  {item.observed && <p className={`t-micro ${item.passed ? 'c-muted' : 'c-bad'}`}>本次结果：{item.observed}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="t-micro c-faint">模型评审的检查公开评分标准原文，每项评审多次，取中位数。</p>
    </>
  );
}

function FailureTab({ run, onCheck, onStep }: { run: RunDetail; onCheck: (id: string) => void; onStep: (step: number) => void }) {
  if (run.outcome === 'passed') {
    return <p className="t-body c-muted">本次运行通过了全部 {run.grading.total} 项检查。</p>;
  }
  if (run.outcome === 'executionFailed' || !run.failure) {
    return <p className="t-body c-muted">本次运行因执行环境异常中止，不计入成绩，也不给出失败原因。</p>;
  }
  const { failedChecks, review } = run.failure;
  return (
    <>
      <Section title="未通过的检查" aside={`${failedChecks.length} / ${run.grading.total} 项`}>
        <ul className={styles.failedList}>
          {failedChecks.map(item => (
            <li key={item.id}>
              <span className={styles.ring} aria-hidden="true" />
              <div><p><span className="t-mono c-faint">{item.id}</span> <span className="t-small">{item.title}</span></p><p className="t-micro c-muted">{item.detail}</p></div>
              <button type="button" className="link-arrow t-micro c-muted" onClick={() => onCheck(item.id)}>查看检查</button>
            </li>
          ))}
        </ul>
      </Section>
      {review ? (
        <Section title="复核结论" aside={`人工复核 · ${review.reviewedOn}`}>
          <div className={styles.panel}>
            <p className="t-body">{review.text}</p>
            <p className={styles.evidence}>
              <span className="t-micro c-faint">依据</span>
              {review.evidenceSteps.map(step => <button key={step} type="button" className="link-arrow t-micro" onClick={() => onStep(step)}>第 {step} 步</button>)}
            </p>
          </div>
        </Section>
      ) : (
        <Section title="复核结论"><p className="t-small c-muted">这次运行尚未复核，只列出未通过的检查。</p></Section>
      )}
      <p className="t-micro c-faint">失败原因来自人工复核；尚未复核的运行只列出未通过的检查。执行失败的运行不计入成绩，也不给出失败原因。</p>
    </>
  );
}

function Header({ run }: { run: RunDetail }) {
  const metrics: [string, string][] = [
    ['步数', `${run.metrics.steps}`], ['用时', `${run.metrics.durationMinutes} 分钟`], ['提交', `${run.metrics.submissions} 次`],
    ['输出 tokens', `${Math.round(run.metrics.outputTokens / 1000)}K`], ['成本', `$${run.metrics.costUsd.toFixed(2)}`], ['结束原因', run.metrics.endReason],
  ];
  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <VendorBadge model={run.model} />
        <h2 className="t-heading">{run.model.name} · {run.harness.name}</h2>
        <span className="t-small c-muted">第 {run.attempt} 次</span>
        <span className={`${styles.outcome} ${styles[run.outcome]} t-micro`}><OutcomeDot outcome={run.outcome} size={6} />{OUTCOME_LABELS[run.outcome]}</span>
      </div>
      <p className="t-small c-muted">{run.task.id} {run.task.title} · 第 {run.attempt} 次运行，共 {run.attemptCount} 次</p>
      <dl className={styles.metrics}>
        {metrics.map(([label, value]) => <div key={label}><dt className="t-micro c-faint">{label}</dt><dd className="t-small">{value}</dd></div>)}
      </dl>
    </header>
  );
}

/** One run's five views: what the model received, what it produced, how it was graded, why it failed and its trajectory. */
export function RunDetailPanel({ runId, legend, tab, step, check, onChange }: RunDetailPanelProps) {
  const run = useRun(runId);
  const trajectory = useTrajectory(runId);
  if (run.error) {
    return <LoadError error={run.error} />;
  }
  if (!run.data) {
    return <Loading label="正在加载运行" />;
  }
  const data = run.data;
  const active = tab ?? defaultTab(data);
  const counts: Partial<Record<RunTab, number | undefined>> = {
    grading: data.grading.total, failure: data.failure?.failedChecks.length, trajectory: trajectory.data?.steps.length,
  };
  return (
    <div className={styles.panelRoot}>
      <Header run={data} />
      <nav className={styles.tabs} role="tablist" aria-label="运行详情">
        {TABS.map(item => (
          <button key={item.tab} type="button" role="tab" aria-selected={item.tab === active} className="t-small" onClick={() => onChange({ tab: item.tab })}>
            {item.label}{counts[item.tab] !== undefined && <span className="t-micro c-faint"> {counts[item.tab]}</span>}
          </button>
        ))}
        <TabIndicator selected={active} />
      </nav>
      <div className={styles.content} role="tabpanel">
        {active === 'input' && <InputTab run={data} />}
        {active === 'output' && <OutputTab run={data} onStep={stepId => onChange({ tab: 'trajectory', step: stepId })} />}
        {active === 'grading' && <GradingTab run={data} check={check} onCheck={id => onChange({ tab: 'grading', check: id })} />}
        {active === 'failure' && <FailureTab run={data} onCheck={id => onChange({ tab: 'grading', check: id })} onStep={stepId => onChange({ tab: 'trajectory', step: stepId })} />}
        {active === 'trajectory' && (
          <TrajectoryView trajectory={trajectory.data} error={trajectory.error} legend={legend} evidence={data.failure?.review?.evidenceSteps ?? []} selected={step} onSelect={stepId => onChange({ tab: 'trajectory', step: stepId || undefined })} />
        )}
      </div>
    </div>
  );
}
