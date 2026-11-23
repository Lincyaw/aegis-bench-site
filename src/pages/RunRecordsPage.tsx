import { useState, useSyncExternalStore } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useBenchmark, useLeaderboard, useTaskRuns, useTasks, type CombinationRuns, type RunOutcome } from '../api/client';
import { RunDetailPanel, type RunTab } from '../components/RunDetailPanel';
import { Breadcrumbs, LoadError, Loading, OutcomeDot, VendorBadge } from '../components/ui';
import styles from './RunRecordsPage.module.css';

const PAGE_SIZE = 14;
const NARROW = '(max-width: 760px)';

function useNarrow(): boolean {
  return useSyncExternalStore(
    notify => { const query = matchMedia(NARROW); query.addEventListener('change', notify); return () => query.removeEventListener('change', notify); },
    () => matchMedia(NARROW).matches,
  );
}

type OutcomeFilter = 'all' | 'failed' | 'passed';

/** The run a task opens on: the first failed run of the first shown combination, else its first run. */
function defaultRun(combinations: CombinationRuns[], filter: OutcomeFilter): string | undefined {
  const wanted: RunOutcome = filter === 'passed' ? 'passed' : 'failed';
  const runs = combinations.flatMap(item => item.runs);
  return (runs.find(run => run.outcome === wanted) ?? runs[0])?.id;
}

export function RunRecordsPage() {
  const { benchmarkId = '' } = useParams();
  const [search, setSearch] = useSearchParams();
  const narrow = useNarrow();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const q = search.get('q') ?? '';
  const combination = search.get('model') ?? '';
  const filter = (search.get('outcome') ?? 'all') as OutcomeFilter;
  const benchmark = useBenchmark(benchmarkId);
  const board = useLeaderboard(benchmarkId, 'combination');
  const tasks = useTasks(benchmarkId, q, limit);
  const taskId = search.get('task') ?? (narrow ? undefined : tasks.data?.items[0]?.id);
  const taskRuns = useTaskRuns(benchmarkId, taskId);

  const update = (changes: Record<string, string | undefined>, reset: string[] = []) => {
    const next = new URLSearchParams(search);
    reset.forEach(key => next.delete(key));
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setSearch(next, { replace: !('task' in changes || 'run' in changes) });
  };

  if (benchmark.error) {
    return <div className="page"><LoadError error={benchmark.error} /></div>;
  }
  if (!benchmark.data) {
    return <div className="page"><Loading /></div>;
  }
  const data = benchmark.data;
  const combinations = (taskRuns.data?.combinations ?? []).filter(item => !combination || `${item.model.id}-${item.harness.id}` === combination);
  const runId = search.get('run') ?? (narrow ? undefined : defaultRun(combinations, filter));
  const level = !narrow ? 'all' : runId ? 'detail' : taskId ? 'runs' : 'tasks';
  const half = data.stage.half === 'dev' ? 'var(--brand-dev)' : 'var(--brand-ops)';

  const taskColumn = (
    <div className={styles.column} aria-label="任务">
      <div className={styles.columnHead}><span className="t-label">任务</span><span className="t-micro c-faint">{tasks.data?.total ?? data.taskCount} 道</span></div>
      <ol className={styles.scroll}>
        {tasks.data?.items.map(task => (
          <li key={task.id}>
            <button type="button" className={`${styles.task} ${task.id === taskId ? styles.selected : ''}`} onClick={() => update({ task: task.id }, ['run', 'tab', 'step', 'check'])} aria-current={task.id === taskId}>
              <span className={styles.taskTop}><span className="t-mono c-faint">{task.id}</span><span className="t-micro c-faint">通过率 {Math.round(task.passRate * 100)}%</span></span>
              <span className="t-small">{task.title}</span>
            </button>
          </li>
        ))}
        {tasks.data?.items.length === 0 && <li className={`${styles.empty} t-small c-faint`}>没有匹配的任务</li>}
      </ol>
      {tasks.data && tasks.data.items.length < tasks.data.total && (
        <button type="button" className={`${styles.more} t-micro c-muted`} onClick={() => setLimit(limit + PAGE_SIZE)}>显示 {tasks.data.items.length} / {tasks.data.total} 道 · 继续加载</button>
      )}
    </div>
  );

  const runColumn = (
    <div className={styles.column} aria-label="运行">
      <div className={`${styles.columnHead} ${styles.stacked}`}>
        {narrow && <button type="button" className="t-micro c-muted" onClick={() => update({}, ['task', 'run', 'tab', 'step', 'check'])}>‹ 全部任务</button>}
        <span className="t-label">{taskRuns.data ? `${taskRuns.data.task.id} ${taskRuns.data.task.title}` : '选择任务'}</span>
        {taskRuns.data && <span className="t-micro c-faint">{taskRuns.data.combinations.length} 个组合 · 每个组合 {taskRuns.data.runsPerTask} 次运行 · 通过率 {Math.round(taskRuns.data.task.passRate * 100)}%</span>}
      </div>
      {taskRuns.error && <LoadError error={taskRuns.error} />}
      <ol className={styles.scroll}>
        {combinations.map(item => (
          <li key={`${item.model.id}-${item.harness.id}`} className={styles.combination}>
            <p className={styles.comboName}>
              <VendorBadge model={item.model} /><span className="t-small">{item.model.name}</span><span className="t-micro c-faint">{item.harness.name}</span>
              <span className="t-numeric c-muted">{item.runs.filter(run => run.outcome === 'passed').length} / {item.runs.length}</span>
            </p>
            <span className={styles.chips}>
              {item.runs.map(run => (
                <button
                  key={run.id}
                  type="button"
                  className={`${styles.chip} ${run.id === runId ? styles.chipSelected : ''} ${filter !== 'all' && run.outcome !== filter ? styles.dimmed : ''}`}
                  onClick={() => update({ run: run.id }, ['tab', 'step', 'check'])}
                  aria-label={`${item.model.name} · ${item.harness.name} 第 ${run.attempt} 次`}
                  aria-current={run.id === runId}
                >
                  <OutcomeDot outcome={run.outcome} /><span className="t-micro">{run.attempt}</span>
                </button>
              ))}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );

  const detailColumn = (
    <div className={`${styles.column} ${styles.detail}`} aria-label="运行详情">
      {narrow && <button type="button" className={`${styles.back} t-micro c-muted`} onClick={() => update({}, ['run', 'tab', 'step', 'check'])}>‹ {taskRuns.data?.task.id ?? '返回'} 的全部运行</button>}
      {runId
        ? <RunDetailPanel
            runId={runId}
            legend={data.timelineLegend}
            tab={(search.get('tab') ?? undefined) as RunTab | undefined}
            step={search.get('step') ? Number(search.get('step')) : undefined}
            check={search.get('check') ?? undefined}
            onChange={next => update({ tab: next.tab, step: next.step ? String(next.step) : undefined, check: next.check }, ['step', 'check'])}
          />
        : <p className="t-small c-faint">选择一次运行，查看给模型的输入、模型的输出、评分方式、失败原因与执行轨迹。</p>}
    </div>
  );

  return (
    <div className={`page ${styles.page}`} style={{ '--half-colour': half } as React.CSSProperties}>
      <header className={styles.head}>
        <Breadcrumbs items={[{ label: '评测基准', to: '/benchmarks' }, { label: `${data.stage.id} ${data.stage.name}`, to: `/benchmarks#stage-${data.stage.id}` }, { label: data.name, to: `/benchmarks/${data.id}` }, { label: '运行记录' }]} />
        <h1 className="t-display">{data.name} 运行记录</h1>
        <p className="t-lead c-muted">全部公开任务的运行记录。选择任务与运行，即可查看给模型的输入、模型的输出、评分方式、失败原因与执行轨迹。</p>
      </header>
      <div className={styles.filters}>
        <label className={styles.search}>
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="搜索任务编号或名称" value={q} onChange={event => update({ q: event.target.value }, ['task', 'run', 'tab', 'step', 'check'])} />
        </label>
        <select aria-label="组合" value={combination} onChange={event => update({ model: event.target.value }, ['run', 'tab', 'step', 'check'])}>
          <option value="">全部组合</option>
          {board.data?.map(entry => <option key={`${entry.model.id}-${entry.harness.id}`} value={`${entry.model.id}-${entry.harness.id}`}>{entry.model.name} · {entry.harness.name}</option>)}
        </select>
        <select aria-label="结果" value={filter} onChange={event => update({ outcome: event.target.value === 'all' ? undefined : event.target.value }, ['run', 'tab', 'step', 'check'])}>
          <option value="all">全部结果</option>
          <option value="failed">只看未通过</option>
          <option value="passed">只看通过</option>
        </select>
        <span className={`${styles.legend} t-micro c-faint`}><span><OutcomeDot outcome="passed" />通过</span><span><OutcomeDot outcome="failed" />未通过</span><span><OutcomeDot outcome="executionFailed" />执行失败</span></span>
      </div>
      <div className={styles.browser} data-level={level}>
        {(level === 'all' || level === 'tasks') && taskColumn}
        {(level === 'all' || level === 'runs') && runColumn}
        {(level === 'all' || level === 'detail') && detailColumn}
      </div>
      <p className={`${styles.footnote} t-micro c-faint`}>
        执行失败的运行不计入成绩。完整排行榜见 <Link className="c-muted" to={`/leaderboard?bench=${data.id}`}>{data.name} 排行榜</Link>。
      </p>
    </div>
  );
}
