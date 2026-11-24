import { Link, useParams } from 'react-router-dom';
import { useBenchmarks, useModelProfile, useStages, type ModelProfile } from '../api/client';
import { LifecycleMap, type StageLabel } from '../components/LifecycleMap';
import { Breadcrumbs, LoadError, Loading, ScoreBar, SectionHeading, VendorBadge, formatScore } from '../components/ui';
import styles from './ModelPage.module.css';

/** The map labels: the model's rank and score per stage, or its rank per benchmark where a stage has several. */
function rankLabels(profile: ModelProfile): Record<string, StageLabel> {
  const byStage = new Map<string, ModelProfile['standings']>();
  profile.standings.forEach(standing => byStage.set(standing.stage.id, [...(byStage.get(standing.stage.id) ?? []), standing]));
  return Object.fromEntries([...byStage].map(([stageId, standings]) => [stageId, standings.length === 1
    ? { primary: `第 ${standings[0].rank} 名 · ${formatScore(standings[0].score, standings[0].metric)}`, secondary: `${standings[0].benchmark.name} · ${stageId}` }
    : { primary: standings.map(item => `${item.benchmark.shortName} 第 ${item.rank}`).join(' · '), secondary: `Bench ${standings.map(item => item.benchmark.shortName).join(' · ')} · ${stageId}` },
  ]));
}

export function ModelPage() {
  const { modelId = '' } = useParams();
  const profile = useModelProfile(modelId);
  const stages = useStages();
  const benchmarks = useBenchmarks();
  const error = profile.error ?? stages.error ?? benchmarks.error;
  if (error) {
    return <div className="page"><LoadError error={error} /></div>;
  }
  if (!profile.data || !stages.data || !benchmarks.data) {
    return <div className="page"><Loading /></div>;
  }
  const data = profile.data;
  return (
    <div className={`page ${styles.page}`}>
      <Breadcrumbs items={[{ label: '排行榜', to: '/leaderboard' }, { label: data.model.name }]} />
      <section className={styles.hero}>
        <div className={styles.intro}>
          <h1 className={`t-display ${styles.name}`}><VendorBadge model={data.model} size={32} />{data.model.name}</h1>
          <p className="t-lead c-muted">{data.summary}</p>
          <p className="t-micro c-faint">最近评测 {data.lastEvaluatedOn} · {data.harnessCount} 种评测框架 · {data.model.vendor}</p>
        </div>
        <div className={styles.map}>
          <LifecycleMap stages={stages.data} benchmarkNames={Object.fromEntries(benchmarks.data.map(item => [item.id, item.name]))} labels={rankLabels(data)} />
        </div>
      </section>
      <section className={styles.section}>
        <SectionHeading title="各评测基准中的名次" intro="取该模型在每个评测基准上成绩最好的组合。点击一行进入对应的排行榜。" />
        <div className={styles.standings} role="table" aria-label="各评测基准中的名次">
          <div className={`${styles.row} ${styles.head} t-micro c-faint`} role="row"><span>环节</span><span>评测基准</span><span>最好的组合</span><span>名次</span><span>成绩</span><span /></div>
          {data.standings.map(item => (
            <Link key={item.benchmark.id} role="row" className={styles.row} to={`/leaderboard?bench=${item.benchmark.id}`}>
              <span className="t-micro c-muted"><span className={item.stage.half === 'dev' ? styles.dotDev : styles.dotOps} />{item.stage.id} {item.stage.name}</span>
              <span className="t-bench">{item.benchmark.name}</span>
              <span className="t-micro c-muted">{item.bestHarness.name}</span>
              <span className="t-small">第 {item.rank} 名 <span className="c-faint t-micro">/ {item.entrants}</span></span>
              <span className={styles.score}><ScoreBar score={item.score} half={item.stage.half} width={100} /><span className="t-numeric">{formatScore(item.score, item.metric)}</span></span>
              <span className="t-micro c-muted">排行榜 →</span>
            </Link>
          ))}
        </div>
      </section>
      <section className={styles.section}>
        <SectionHeading title="不同评测框架下的成绩" intro="同一模型在不同评测框架下的成绩，其余条件保持一致。" />
        <div className={styles.harnesses}>
          {data.harnessComparison.map(item => (
            <div key={item.benchmark.id} className={styles.harness}>
              <p className="t-label">{item.benchmark.name}</p>
              {item.scores.map(score => (
                <div key={score.harness.id} className={styles.harnessRow}>
                  <span className="t-micro c-muted">{score.harness.name}</span>
                  <span className="t-numeric">{formatScore(score.score, item.metric)}</span>
                  <ScoreBar score={score.score} half={item.half} width={200} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
      {data.reports.length > 0 && (
        <section className={styles.section}>
          <SectionHeading title="相关报告" />
          <ul className={styles.reports}>
            {data.reports.map(report => (
              <li key={report.id}>
                <Link to="/reports"><span className="t-mono c-faint">{report.publishedOn}</span><span className="t-micro c-faint">{report.kind}</span><span className="t-small">{report.title}</span><span className="c-faint">→</span></Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
