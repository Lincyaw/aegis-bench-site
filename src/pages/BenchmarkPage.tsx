import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBenchmark, useBenchmarks, useStages, type BenchmarkDetail, type FlowStep } from '../api/client';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { LifecycleMap } from '../components/LifecycleMap';
import { RunTimeline, TimelineLegendRow } from '../components/RunTimeline';
import { StageScene, hasScene } from '../components/StageScene';
import { Breadcrumbs, Button, ButtonLink, LoadError, Loading, OutcomeDot, SectionHeading, TabIndicator, Tag, VendorBadge } from '../components/ui';
import styles from './BenchmarkPage.module.css';

const SECTIONS = [
  { id: 'setting', label: '任务设定' }, { id: 'evaluation', label: '评估方式' }, { id: 'leaderboard', label: '排行榜' },
  { id: 'runs', label: '运行记录' }, { id: 'cite', label: '版本与引用' }, { id: 'faq', label: '常见问题' },
];

const ORDINALS = ['一', '二', '三', '四', '五', '六', '七', '八'];
const HALF_NAMES = { dev: '研发', ops: '运维' } as const;

/** The section whose heading was last scrolled past, so the section bar can mark it. */
function useCurrentSection(): string {
  const [current, setCurrent] = useState(SECTIONS[0].id);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) {
        setCurrent(visible[0].target.id);
      }
    }, { rootMargin: '-130px 0px -60% 0px' });
    SECTIONS.forEach(section => { const element = document.getElementById(section.id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  });
  return current;
}

function Flow({ steps, half }: { steps: FlowStep[]; half: 'dev' | 'ops' }) {
  return (
    <ol className={styles.flow} style={{ '--half-colour': half === 'dev' ? 'var(--brand-dev)' : 'var(--brand-ops)' } as CSSProperties}>
      {steps.map((step, index) => (
        <li key={step.title}>
          <span className={styles.flowLine} aria-hidden="true" />
          <span className="t-mono c-faint">{String(index + 1).padStart(2, '0')}</span>
          <h3 className="t-label">{step.title}</h3>
          <p className="t-small c-muted">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

function Hero({ benchmark }: { benchmark: BenchmarkDetail }) {
  const stages = useStages();
  const benchmarks = useBenchmarks();
  const { stage } = benchmark;
  return (
    <section className={`page ${styles.hero}`}>
      <div className={styles.heroText}>
        <Breadcrumbs items={[{ label: '评测基准', to: '/benchmarks' }, { label: `${stage.id} ${stage.name}`, to: `/benchmarks#stage-${stage.id}` }, { label: benchmark.name }]} />
        <h1 className="t-display" style={{ fontFamily: 'var(--font-latin)' }}>{benchmark.name}</h1>
        <p className="t-lead c-muted">{benchmark.summary}</p>
        <p className={styles.version}><Tag>{benchmark.version}</Tag><span className="t-micro c-faint">{benchmark.updatedOn} 更新 · {HALF_NAMES[stage.half]} · {stage.id} {stage.name}</span></p>
        <dl className={styles.facts}>
          {[['任务数', `${benchmark.taskCount} 道`], ['指标', benchmark.metric.name], ['参评组合', `${benchmark.combinationCount} 个`], ['每道任务运行', `${benchmark.runsPerTask} 次`]].map(([label, value]) => (
            <div key={label}><dt className="t-micro c-faint">{label}</dt><dd className="t-small">{value}</dd></div>
          ))}
        </dl>
        <div className={styles.actions}>
          <ButtonLink look="solid" to={`/leaderboard?bench=${benchmark.id}`}>查看排行榜</ButtonLink>
          <ButtonLink to={`/benchmarks/${benchmark.id}/runs`}>运行记录</ButtonLink>
          <a className="link-arrow t-small" href="#cite">引用本评测基准</a>
        </div>
      </div>
      <div className={styles.stagePanel}>
        {hasScene(stage.id) && <StageScene stageId={stage.id} />}
        <div className={styles.position}>
          <div className={styles.miniMap}>
            {stages.data && benchmarks.data && (
              <LifecycleMap compact stages={stages.data} current={stage.id} benchmarkNames={Object.fromEntries(benchmarks.data.map(item => [item.id, item.name]))} />
            )}
          </div>
          <p><span className="t-small">{stage.id} {stage.name}</span><br /><span className="t-micro c-faint">{HALF_NAMES[stage.half]} · 八个环节中的第{ORDINALS[Number(stage.id) - 1]}个</span></p>
        </div>
      </div>
    </section>
  );
}

function Faq({ items }: { items: BenchmarkDetail['faq'] }) {
  return (
    <div className={styles.faq}>
      {items.map((item, index) => (
        <details key={item.question} open={index === 0}>
          <summary className="t-label">{item.question}</summary>
          <p className="t-small c-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

function Citation({ bibtex }: { bibtex: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={styles.cite}>
      <pre className="t-mono c-muted">{bibtex}</pre>
      <div className={styles.copyRow}>
        <Button onClick={() => navigator.clipboard.writeText(bibtex).then(() => setCopied(true))}>复制 BibTeX</Button>
        {copied && <span className="t-micro c-ok" role="status">已复制</span>}
      </div>
    </div>
  );
}

export function BenchmarkPage() {
  const { benchmarkId = '' } = useParams();
  const benchmark = useBenchmark(benchmarkId);
  const current = useCurrentSection();
  if (benchmark.error) {
    return <div className="page"><LoadError error={benchmark.error} /></div>;
  }
  if (!benchmark.data) {
    return <div className="page"><Loading /></div>;
  }
  const data = benchmark.data;
  const half = data.stage.half;
  return (
    <div style={{ '--half-colour': half === 'dev' ? 'var(--brand-dev)' : 'var(--brand-ops)' } as CSSProperties}>
      <Hero benchmark={data} />
      <nav className={styles.sectionBar} aria-label="本页分区">
        <div className="page">
          {SECTIONS.map(section => <a key={section.id} href={`#${section.id}`} className="t-small" aria-current={current === section.id ? 'true' : undefined}>{section.label}</a>)}
          <TabIndicator selected={current} />
        </div>
      </nav>
      <div className={`page ${styles.sections}`}>
        <section>
          <SectionHeading id="setting" title="任务设定" intro={data.setting.intro} />
          <Flow steps={data.setting.flow} half={half} />
          <div className={styles.sample}>
            <p className={styles.sampleHead}><Tag>公开样例</Tag><span className="t-mono c-faint">{data.setting.sample.task.id}</span><span className="t-micro c-muted">{data.setting.sample.task.title}</span></p>
            <p className="t-small">{data.setting.sample.statement}</p>
          </div>
        </section>
        <section>
          <SectionHeading id="evaluation" title="评估方式" intro={data.evaluation.intro} />
          <Flow steps={data.evaluation.flow} half={half} />
          <dl className={styles.conditions}>
            {data.evaluation.conditions.map(item => <div key={item.label}><dt className="t-micro c-faint">{item.label}</dt><dd className="t-small">{item.value}</dd></div>)}
          </dl>
        </section>
        <section>
          <SectionHeading id="leaderboard" title="排行榜" intro={`按${data.metric.name}排名的前 5 个组合。完整排行榜可按模型或框架查看。`} />
          <LeaderboardTable benchmarkId={data.id} entries={data.topFive} metric={data.metric} half={half} />
          <Link className="link-arrow t-small" to={`/leaderboard?bench=${data.id}`} style={{ marginTop: 24 }}>查看完整排行榜</Link>
        </section>
        <section>
          <SectionHeading id="runs" title="运行记录" intro="每一次运行的完整轨迹均公开，可逐步回放并核验评分。" />
          <div className={styles.runs} role="table" aria-label="运行记录">
            <div className={`${styles.runRow} ${styles.runHead} t-micro c-faint`} role="row">
              <span>模型</span><span>任务</span><span>过程</span><span>结果</span><span>步数</span><span>用时</span><span />
            </div>
            {data.recentRuns.map(run => (
              <Link key={run.runId} role="row" className={styles.runRow} to={`/benchmarks/${data.id}/runs?task=${run.task.id}&run=${run.runId}&tab=trajectory`}>
                <span className={styles.model}><VendorBadge model={run.model} /><span className="t-label">{run.model.name}</span></span>
                <span className={styles.task}><span className="t-mono c-faint">{run.task.id}</span><span className="t-small">{run.task.title}</span></span>
                <RunTimeline marks={run.timeline} />
                <span className={styles.result}><OutcomeDot outcome={run.outcome} /><span className={`t-small ${run.outcome === 'passed' ? 'c-ok' : run.outcome === 'failed' ? 'c-bad' : 'c-faint'}`}>{run.resultLabel}</span></span>
                <span className="t-numeric c-muted">{run.stepCount} 步</span>
                <span className="t-numeric c-muted">{run.durationMinutes} 分钟</span>
                <span className="t-small c-muted">回放 →</span>
              </Link>
            ))}
          </div>
          <div className={styles.runsFoot}>
            <TimelineLegendRow legend={data.timelineLegend} />
            <Link className="link-arrow t-small" to={`/benchmarks/${data.id}/runs`}>查看全部运行记录</Link>
          </div>
        </section>
        <section>
          <SectionHeading id="cite" title="版本与引用" intro="每个版本的任务与评测配置均固定，成绩按版本分别报告。" />
          <div className={styles.twoColumns}>
            <ol className={styles.versions}>
              {data.versions.map(version => (
                <li key={version.version}><span className="t-label">{version.version}</span><span className="t-mono c-faint">{version.releasedOn}</span><span className="t-small c-muted">{version.note}</span></li>
              ))}
            </ol>
            <Citation bibtex={data.bibtex} />
          </div>
        </section>
        <section>
          <h2 className="t-title" id="faq" style={{ marginBottom: 24, scrollMarginTop: 120 }}>常见问题</h2>
          <Faq items={data.faq} />
        </section>
      </div>
    </div>
  );
}
