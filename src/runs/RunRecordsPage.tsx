import { clsx } from 'clsx';
import { Suspense, useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useBenchmark, useLeaderboard, useTaskPages, useTaskRuns, type BenchmarkDetail, type CombinationRuns, type TaskPage } from '../api/client';
import { VendorBadge } from '../models/ModelBadge';
import { BENCHMARKS_PATH, benchmarkPath, stagePath } from '../site/siteMap';
import { Loading } from '../ui/content';
import { SearchField, Select } from '../ui/controls';
import controls from '../ui/controls.module.css';
import { NARROW_QUERY, useMediaQuery } from '../ui/media';
import { Breadcrumbs } from '../ui/navigation';
import { OutcomeDot } from './Outcome';
import { RunDetailPanel } from './RunDetailPanel';
import {
  EVERY_COMBINATION, EVERY_OUTCOME, OUTCOME_FILTERS, TASK_PAGE_SIZE, combinationKey, defaultRunId, parseRunRecordsQuery, runRecordsLevel, runRecordsSearch,
  withFilter, withRun, withSearch, withTask, withView, type RunRecordsLevel, type RunRecordsQuery,
} from './runRecordsQuery';
import styles from './RunRecordsPage.module.css';

/** Every public task's runs: tasks, then each combination's runs of the chosen task, then the chosen run. */
export function RunRecordsPage() {
  const { benchmarkId = '' } = useParams();
  const [search, setSearch] = useSearchParams();
  const narrow = useMediaQuery(NARROW_QUERY);
  const benchmark = useBenchmark(benchmarkId);
  const query = parseRunRecordsQuery(search);
  const level = runRecordsLevel(query, narrow);
  // The list keeps showing the last results while a new search loads.
  const taskPages = useTaskPages(benchmark.id, useDeferredValue(query.q), TASK_PAGE_SIZE);
  if (taskPages.isFetchNextPageError) {
    throw taskPages.error;
  }
  const tasks: TaskPage = { items: taskPages.data.pages.flatMap(page => page.items), total: taskPages.data.pages[0].total };
  const taskId = query.task ?? (level === 'threePanes' ? tasks.items[0]?.id : undefined);
  const update = (next: RunRecordsQuery) => {
    // Only a narrow window replacing one level with another starts again from the top.
    setSearch(runRecordsSearch(next), { replace: next.task === query.task && next.run === query.run, preventScrollReset: runRecordsLevel(next, narrow) === level });
  };
  return (
    <div className={styles.workspace} data-half={benchmark.stage.half}>
      <RunToolbar benchmark={benchmark} query={query} onQuery={update} />
      <div className={styles.browser}>
        {(level === 'threePanes' || level === 'tasks') && (
          <TaskColumn tasks={tasks} currentTask={taskId} onTask={task => update(withTask(query, task))} loadingMore={taskPages.isFetchingNextPage} onMore={() => void taskPages.fetchNextPage()} />
        )}
        {level !== 'tasks' && taskId && (
          <Suspense fallback={<div className={styles.column}><Loading /></div>}>
            <TaskRunsArea benchmark={benchmark} taskId={taskId} query={query} level={level} onQuery={update} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export function RunToolbar({ benchmark, query, onQuery }: { benchmark: BenchmarkDetail; query: RunRecordsQuery; onQuery: (query: RunRecordsQuery) => void }) {
  const { t } = useTranslation();
  const combinations = useLeaderboard(benchmark.id, 'combination');
  return (
    <header className={styles.toolbar}>
      <h1 className="visually-hidden">{t('runs.pageTitle', { benchmark: benchmark.name })}</h1>
      <Breadcrumbs className={styles.crumbs} crumbs={[
        { label: t('site.nav.benchmarks'), to: BENCHMARKS_PATH }, { label: `${benchmark.stage.id} ${benchmark.stage.name}`, to: stagePath(benchmark.stage.id) },
        { label: benchmark.name, to: benchmarkPath(benchmark.id) }, { label: t('benchmarks.runRecords') },
      ]} />
      <SearchField className={styles.search} label={t('runs.search')} value={query.q} onChange={q => onQuery(withSearch(query, q))} />
      <Select
        className={styles.filter}
        label={t('runs.combinationFilter')}
        value={query.combination ?? EVERY_COMBINATION}
        choices={[{ value: EVERY_COMBINATION, label: t('runs.everyCombination') }, ...combinations.map(entry => ({ value: combinationKey(entry.model.id, entry.harness.id), label: `${entry.model.name} · ${entry.harness.name}` }))]}
        onChange={value => onQuery(withFilter(query, { combination: value === EVERY_COMBINATION ? undefined : value, outcome: query.outcome }))}
      />
      <Select
        className={styles.filter}
        label={t('runs.outcomeFilter')}
        value={query.outcome}
        choices={OUTCOME_FILTERS.map(filter => ({ value: filter, label: t(`runs.filter.${filter}`) }))}
        onChange={outcome => onQuery(withFilter(query, { combination: query.combination, outcome }))}
      />
      <span className={clsx(styles.legend, 't-micro c-faint')}>
        <span><OutcomeDot outcome="passed" />{t('runs.outcome.passed')}</span>
        <span><OutcomeDot outcome="failed" />{t('runs.outcome.failed')}</span>
        <span><OutcomeDot outcome="executionFailed" />{t('runs.notCounted')}</span>
      </span>
    </header>
  );
}

export function TaskColumn({ tasks, currentTask, onTask, loadingMore, onMore }: { tasks: TaskPage; currentTask: string | undefined; onTask: (task: string) => void; loadingMore: boolean; onMore: () => void }) {
  const { t } = useTranslation();
  return (
    <div className={styles.column} aria-label={t('runs.tasks')}>
      <div className={styles.columnHead}><span className="t-label">{t('runs.tasks')}</span><span className="t-micro c-faint">{t('benchmarks.tasks', { count: tasks.total })}</span></div>
      <ol className={styles.scroll}>
        {tasks.items.map(task => (
          <li key={task.id}>
            <button type="button" className={styles.task} onClick={() => onTask(task.id)} aria-current={task.id === currentTask ? 'true' : undefined}>
              <span className={styles.taskTop}><span className="t-mono c-faint">{task.id}</span><span className="t-micro c-faint">{t('runs.passRate', { rate: Math.round(task.passRate * 100) })}</span></span>
              <span className="t-small">{task.title}</span>
            </button>
          </li>
        ))}
        {tasks.items.length === 0 && <li className={clsx(styles.empty, 't-small c-faint')}>{t('runs.noTasks')}</li>}
      </ol>
      {tasks.items.length < tasks.total && (
        <button type="button" className={clsx(styles.more, 't-micro c-muted')} disabled={loadingMore} aria-busy={loadingMore} onClick={onMore}>{t('runs.loadMore', { shown: tasks.items.length, total: tasks.total })}</button>
      )}
    </div>
  );
}

/** The chosen task's combinations and, beside them, the chosen run; on a narrow window, whichever level is open. */
export function TaskRunsArea({ benchmark, taskId, query, level, onQuery }: { benchmark: BenchmarkDetail; taskId: string; query: RunRecordsQuery; level: RunRecordsLevel; onQuery: (query: RunRecordsQuery) => void }) {
  const { t } = useTranslation();
  const taskRuns = useTaskRuns(benchmark.id, taskId);
  const combinations = taskRuns.combinations.filter(combination => !query.combination || combinationKey(combination.model.id, combination.harness.id) === query.combination);
  const runId = query.run ?? (level === 'threePanes' ? defaultRunId(combinations, query.outcome) : undefined);
  return (
    <>
      {(level === 'threePanes' || level === 'runs') && (
        <div className={styles.column} aria-label={t('runs.runs')}>
          <div className={clsx(styles.columnHead, styles.stacked)}>
            {level === 'runs' && <button type="button" className={clsx(styles.back, 't-micro c-muted')} onClick={() => onQuery(withTask(query, undefined))}>‹ {t('runs.allTasks')}</button>}
            <span className="t-label">{taskRuns.task.id} {taskRuns.task.title}</span>
            <span className="t-micro c-faint">{t('runs.taskSummary', { combinations: taskRuns.combinations.length, runs: taskRuns.runsPerTask, rate: Math.round(taskRuns.task.passRate * 100) })}</span>
          </div>
          <ol className={styles.scroll}>
            {combinations.map(combination => <CombinationRow key={combinationKey(combination.model.id, combination.harness.id)} combination={combination} runId={runId} query={query} onRun={run => onQuery(withRun(query, run))} />)}
          </ol>
        </div>
      )}
      {(level === 'threePanes' || level === 'detail') && (
        <div className={clsx(styles.column, styles.detail)} aria-label={t('runs.detailLabel')}>
          {level === 'detail' && <button type="button" className={clsx(styles.detailBack, 't-micro c-muted')} onClick={() => onQuery(withRun(query, undefined))}>‹ {t('runs.allRunsOf', { task: taskRuns.task.id })}</button>}
          {runId ? (
            <Suspense fallback={<Loading />}>
              <RunDetailPanel runId={runId} legend={benchmark.timelineLegend} view={{ tab: query.tab, step: query.step, check: query.check }} onView={view => onQuery(withView(query, view))} />
            </Suspense>
          ) : <p className="t-small c-faint">{t('runs.chooseRun')}</p>}
        </div>
      )}
    </>
  );
}

/** A combination's runs of the task, each a chip; runs outside the outcome filter are dimmed. */
export function CombinationRow({ combination, runId, query, onRun }: { combination: CombinationRuns; runId: string | undefined; query: RunRecordsQuery; onRun: (run: string) => void }) {
  const { t } = useTranslation();
  const { model, harness, runs } = combination;
  return (
    <li className={styles.combination}>
      <p className={styles.comboName}>
        <VendorBadge model={model} /><span className="t-small">{model.name}</span><span className="t-micro c-faint">{harness.name}</span>
        <span className="t-numeric c-muted">{runs.filter(run => run.outcome === 'passed').length} / {runs.length}</span>
      </p>
      <span className={styles.chips}>
        {runs.map(run => (
          <button
            key={run.id}
            type="button"
            className={clsx(controls.pill, controls.small, styles.chip, 'loop-edge', query.outcome !== EVERY_OUTCOME && run.outcome !== query.outcome && styles.dimmed)}
            onClick={() => onRun(run.id)}
            aria-label={t('runs.runOf', { model: model.name, harness: harness.name, attempt: run.attempt })}
            aria-current={run.id === runId ? 'true' : undefined}
          >
            <OutcomeDot outcome={run.outcome} />{run.attempt}
          </button>
        ))}
      </span>
    </li>
  );
}
