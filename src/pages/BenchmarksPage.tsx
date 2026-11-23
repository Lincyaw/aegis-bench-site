import { Link } from 'react-router-dom';
import { useBenchmarks, useStages, type BenchmarkSummary, type Stage } from '../api/client';
import { LifecycleMap, type StageLabel } from '../components/LifecycleMap';
import { LoadError, Loading, ModelName, Tag, formatScore } from '../components/ui';
import styles from './BenchmarksPage.module.css';

const HALF_NAMES = { dev: '研发', ops: '运维' } as const;

export function stageLabels(stages: Stage[], benchmarks: BenchmarkSummary[]): Record<string, StageLabel> {
  const names = Object.fromEntries(benchmarks.map(item => [item.id, item.name]));
  return Object.fromEntries(stages.filter(stage => stage.benchmarkIds.length > 0).map(stage => [
    stage.id, { primary: stage.benchmarkIds.map(id => names[id]).join(' · '), secondary: `${stage.id} ${stage.name}` },
  ]));
}

function BenchRow({ benchmark }: { benchmark: BenchmarkSummary }) {
  return (
    <Link className={styles.bench} to={`/benchmarks/${benchmark.id}`}>
      <div className={styles.benchMain}>
        <div className={styles.benchName}><span className="t-bench">{benchmark.name}</span><Tag>{benchmark.version}</Tag></div>
        <p className="t-small c-muted">{benchmark.summary}</p>
        <p className="t-micro c-faint">{benchmark.taskCount} 道任务 · 指标：{benchmark.metric.name} · {benchmark.updatedOn} 更新</p>
      </div>
      <div className={styles.top}>
        <p className="t-micro c-faint">前三名</p>
        <ol>
          {benchmark.topThree.map(entry => (
            <li key={entry.rank}>
              <span className="t-mono c-faint">{entry.rank}</span>
              <ModelName model={entry.model} link={false} />
              <span className="t-numeric c-muted">{formatScore(entry.score, benchmark.metric)}</span>
            </li>
          ))}
        </ol>
      </div>
      <span className={styles.arrow} aria-hidden="true">→</span>
    </Link>
  );
}

export function BenchmarksPage() {
  const stages = useStages();
  const benchmarks = useBenchmarks();
  if (stages.error || benchmarks.error) {
    return <div className="page"><LoadError error={(stages.error ?? benchmarks.error)!} /></div>;
  }
  if (!stages.data || !benchmarks.data) {
    return <div className="page"><Loading /></div>;
  }
  const byId = Object.fromEntries(benchmarks.data.map(item => [item.id, item]));
  const covered = stages.data.filter(stage => stage.benchmarkIds.length > 0);
  const building = stages.data.filter(stage => stage.benchmarkIds.length === 0);
  return (
    <div className={`page ${styles.page}`}>
      <section className={styles.hero}>
        <div className={styles.intro}>
          <h1 className="t-display">评测基准</h1>
          <p className="t-lead c-muted">覆盖软件工程全生命周期的八个环节。各评测基准独立评测、独立排名，公开任务与运行记录均可核验。</p>
          <ul className={`${styles.legend} t-micro c-muted`}>
            <li><span className={styles.dotDev} />已发布</li>
            <li><span className={styles.dotBuilding} />建设中</li>
            <li className="c-faint">点击节点进入对应评测基准</li>
          </ul>
        </div>
        <div className={styles.map}>
          <LifecycleMap stages={stages.data} benchmarkNames={Object.fromEntries(benchmarks.data.map(item => [item.id, item.name]))} labels={stageLabels(stages.data, benchmarks.data)} />
        </div>
      </section>
      <div className={styles.groups}>
        {covered.map(stage => (
          <section key={stage.id} className={styles.group} aria-labelledby={`stage-${stage.id}`}>
            <header className={styles.groupHead}>
              <h2 id={`stage-${stage.id}`}>
                <span className={stage.half === 'dev' ? styles.dotDev : styles.dotOps} />
                <span className="t-mono c-faint">{stage.id}</span>
                <span className="t-heading">{stage.name}</span>
              </h2>
              <span className="t-micro c-faint">{HALF_NAMES[stage.half]} · {stage.benchmarkIds.length} 个评测基准</span>
            </header>
            {stage.benchmarkIds.map(id => <BenchRow key={id} benchmark={byId[id]} />)}
          </section>
        ))}
        <p className={styles.building}>
          <Tag dashed>建设中</Tag>
          <span className="t-small c-muted">{building.map(stage => `${stage.id} ${stage.name}`).join(' · ')}</span>
          <span className="t-micro c-faint">相关评测基准将陆续发布</span>
        </p>
      </div>
    </div>
  );
}
