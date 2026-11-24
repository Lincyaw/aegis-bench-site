import { Link, useSearchParams } from 'react-router-dom';
import { useBenchmarks, useLeaderboard, useStages, type LeaderboardView } from '../api/client';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { LoadError, Loading } from '../components/ui';
import styles from './LeaderboardPage.module.css';

const VIEWS: { view: LeaderboardView; label: string }[] = [
  { view: 'combination', label: '模型 × 框架' }, { view: 'model', label: '按模型' }, { view: 'harness', label: '按框架' },
];

/** One benchmark at a time: switching the benchmark or the view only changes the table. */
export function LeaderboardPage() {
  const [search, setSearch] = useSearchParams();
  const stages = useStages();
  const benchmarks = useBenchmarks();
  const benchmarkId = search.get('bench') ?? 'bench-a';
  const view = (search.get('view') ?? 'combination') as LeaderboardView;
  const board = useLeaderboard(benchmarkId, view);
  const choose = (next: Record<string, string>) => setSearch({ bench: benchmarkId, view, ...next }, { replace: true });
  if (stages.error || benchmarks.error) {
    return <div className="page"><LoadError error={(stages.error ?? benchmarks.error)!} /></div>;
  }
  if (!stages.data || !benchmarks.data) {
    return <div className="page"><Loading /></div>;
  }
  const benchmark = benchmarks.data.find(item => item.id === benchmarkId) ?? benchmarks.data[0];
  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className="t-display">排行榜</h1>
        <p className="t-lead c-muted">各评测基准独立排名，不计算综合分。所有成绩均在统一的评测框架、轮次预算与执行环境下取得。</p>
      </header>
      <div className={styles.picker}>
        <div className={styles.groups}>
          {stages.data.filter(stage => stage.benchmarkIds.length > 0).map(stage => (
            <div key={stage.id} className={styles.group}>
              <p className="t-micro c-faint"><span className={stage.half === 'dev' ? styles.dotDev : styles.dotOps} />{stage.id} {stage.name}</p>
              <div className={styles.pills}>
                {stage.benchmarkIds.map(id => (
                  <button key={id} type="button" aria-pressed={id === benchmark.id} className={`${styles.pill} loop-edge t-small`} onClick={() => choose({ bench: id })}>
                    {benchmarks.data.find(item => item.id === id)?.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <span className="t-micro c-faint">其余环节的评测基准建设中</span>
      </div>
      <div className={styles.boardHead}>
        <div className={styles.title}>
          <h2 className="t-bench">{benchmark.name}</h2>
          <span className="t-micro c-faint">{benchmark.stage.id} {benchmark.stage.name} · 指标：{benchmark.metric.name} · {benchmark.version} · {benchmark.updatedOn} 更新</span>
        </div>
        <div className={styles.tools}>
          <div className={styles.segmented} role="group" aria-label="排行方式">
            {VIEWS.map(item => <button key={item.view} type="button" aria-pressed={item.view === view} className="loop-edge t-micro" onClick={() => choose({ view: item.view })}>{item.label}</button>)}
          </div>
          <Link className="link-arrow t-small" to={`/benchmarks/${benchmark.id}`}>评测基准详情</Link>
        </div>
      </div>
      {board.error && <LoadError error={board.error} />}
      {board.data
        ? <LeaderboardTable benchmarkId={benchmark.id} entries={board.data} metric={benchmark.metric} half={benchmark.stage.half} />
        : !board.error && <Loading />}
      <p className={`${styles.note} t-micro c-faint`}>{benchmark.metric.name}为每道任务 {benchmark.runsPerTask} 次独立运行的平均值。点击任一行，可查看该组合在本评测基准上的全部运行记录。</p>
    </div>
  );
}
