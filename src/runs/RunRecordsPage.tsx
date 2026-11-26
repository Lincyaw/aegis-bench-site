import { clsx } from 'clsx';
import { Suspense, useDeferredValue, type ButtonHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  useBenchmark, useCombinations, useRunTrajectory, useRuns, useTaskPages, useTaskRuns, type BenchmarkDetail, type CombinationRuns, type RunDetail, type TaskPage,
} from '../api/client';
import { LocaleLink } from '../i18n/LocaleRouting';
import { VendorBadge } from '../models/ModelBadge';
import { BENCHMARKS_PATH, benchmarkPath, stagePath } from '../site/siteMap';
import { taskFilesPath } from '../tasks/taskFiles';
import { Loading } from '../ui/content';
import { MoreButton, SearchField, SegmentedControl, Select } from '../ui/controls';
import controls from '../ui/controls.module.css';
import { NARROW_QUERY, useMediaQuery } from '../ui/media';
import { Breadcrumbs } from '../ui/navigation';
import { HuggingFaceBoundary } from './HuggingFace';
import { OutcomeDot } from './Outcome';
import { RunsSideBySide, SingleRunComparison } from './RunComparison';
import { RunDetailPanel, RunTitle } from './RunDetailPanel';
import {
  EVERY_COMBINATION, EVERY_OUTCOME, MAX_COMPARED_RUNS, OUTCOME_FILTERS, RUN_RECORDS_VIEWS, TASK_PAGE_SIZE, combinationKey, defaultRunId, parseRunRecordsQuery,
  runRecordsLevel, runRecordsSearch, withComparedRun, withFilter, withRun, withRunsView, withSearch, withTask, withView, type RunRecordsLevel, type RunRecordsQuery,
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
  // Choices in the comparison show at once, outside a transition, so the next choice builds on them while the runs load.
  const choose = (next: RunRecordsQuery) => setSearch(runRecordsSearch(next), { replace: true, preventScrollReset: true, flushSync: true });
  // The comparison needs a wide window; a narrow one browses whatever the address asks for.
  const comparing = query.view === 'compare' && !narrow;
  return (
    <div className={styles.workspace} data-half={benchmark.stage.half}>
      <RunToolbar benchmark={benchmark} query={query} onQuery={update} />
      <div className={clsx(styles.browser, comparing && styles.comparing)}>
        {comparing && taskId && (
          <Suspense fallback={<div className={styles.column}><Loading /></div>}>
            <ComparisonArea benchmark={benchmark} taskId={taskId} query={query} onQuery={choose} />
          </Suspense>
        )}
        {!comparing && (level === 'threePanes' || level === 'tasks') && (
          <TaskColumn tasks={tasks} currentTask={taskId} onTask={task => update(withTask(query, task))} loadingMore={taskPages.isFetchingNextPage} onMore={() => void taskPages.fetchNextPage()} />
        )}
        {!comparing && level !== 'tasks' && taskId && (
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
  const narrow = useMediaQuery(NARROW_QUERY);
  const combinations = useCombinations(benchmark.id);
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
      {!narrow && (
        <SegmentedControl
          label={t('runs.view.label')}
          choices={RUN_RECORDS_VIEWS.map(view => ({ value: view, label: t(`runs.view.${view}`) }))}
          value={query.view}
          onChange={view => onQuery(withRunsView(query, view))}
        />
      )}
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
        <MoreButton className={styles.more} label={t('runs.loadMore', { shown: tasks.items.length, total: tasks.total })} loading={loadingMore} onClick={onMore} />
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
            <LocaleLink className={clsx(controls.textLink, styles.taskFiles, 't-micro')} to={taskFilesPath(benchmark.id, taskRuns.task.id)}>{t('tasks.files')}</LocaleLink>
          </div>
          <ol className={styles.scroll}>
            {combinations.map(combination => (
              <CombinationRow
                key={combinationKey(combination.model.id, combination.harness.id)} combination={combination} query={query}
                chipState={run => ({ 'aria-current': run === runId ? 'true' : undefined })} onRun={run => onQuery(withRun(query, run))}
              />
            ))}
          </ol>
        </div>
      )}
      {(level === 'threePanes' || level === 'detail') && (
        <div className={clsx(styles.column, styles.detail)} aria-label={t('runs.detailLabel')}>
          {level === 'detail' && <button type="button" className={clsx(styles.detailBack, 't-micro c-muted')} onClick={() => onQuery(withRun(query, undefined))}>‹ {t('runs.allRunsOf', { task: taskRuns.task.id })}</button>}
          {runId ? (
            <HuggingFaceBoundary resetKey={runId}>
              <Suspense fallback={<Loading />}>
                <RunDetailPanel runId={runId} legend={benchmark.timelineLegend} view={{ tab: query.tab, step: query.step, check: query.check }} onView={view => onQuery(withView(query, view))} />
              </Suspense>
            </HuggingFaceBoundary>
          ) : <p className="t-small c-faint">{t('runs.chooseRun')}</p>}
        </div>
      )}
    </>
  );
}

/**
 * The task's combinations to choose runs from for comparing, and the runs chosen laid out side by side. Until the reader
 * chooses, the comparison shows the run the task would open on.
 */
export function ComparisonArea({ benchmark, taskId, query, onQuery }: { benchmark: BenchmarkDetail; taskId: string; query: RunRecordsQuery; onQuery: (query: RunRecordsQuery) => void }) {
  const { t } = useTranslation();
  const taskRuns = useTaskRuns(benchmark.id, taskId);
  const combinations = taskRuns.combinations.filter(combination => !query.combination || combinationKey(combination.model.id, combination.harness.id) === query.combination);
  const opening = defaultRunId(combinations, query.outcome);
  const chosen = query.compare.length > 0 ? query.compare : opening ? [opening] : [];
  // Before any choice the comparison shows the opening run, and the first choice adds to it.
  const choosing = { ...query, compare: chosen };
  // The runs shown stay until the newly chosen ones load, so the chips answer every choice at once and each builds on the last.
  const shown = useDeferredValue(chosen.join(','));
  return (
    <>
      <div className={styles.column} aria-label={t('runs.runs')}>
        <div className={clsx(styles.columnHead, styles.stacked)}>
          <button type="button" className={clsx(styles.back, 't-micro c-muted')} onClick={() => onQuery(withRunsView(query, 'browse'))}>‹ {t('runs.allTasks')}</button>
          <span className="t-label">{taskRuns.task.id} {taskRuns.task.title}</span>
          <span className="t-micro c-faint">{t('runs.compare.chosen', { count: chosen.length, max: MAX_COMPARED_RUNS })}</span>
        </div>
        <ol className={styles.scroll}>
          {combinations.map(combination => (
            <CombinationRow
              key={combinationKey(combination.model.id, combination.harness.id)} combination={combination} query={query}
              chipState={run => ({ 'aria-pressed': chosen.includes(run), disabled: !chosen.includes(run) && chosen.length >= MAX_COMPARED_RUNS })}
              onRun={run => onQuery(withComparedRun(choosing, run))}
            />
          ))}
        </ol>
      </div>
      <div className={clsx(styles.column, styles.detail)} aria-label={t('runs.view.compare')}>
        {shown !== '' ? (
          <HuggingFaceBoundary resetKey={shown}>
            <Suspense fallback={<Loading />}>
              <ComparedRuns runIds={shown.split(',')} onOpen={runId => onQuery({ ...query, compare: [runId] })} onRemove={runId => onQuery(withComparedRun(choosing, runId))} />
            </Suspense>
          </HuggingFaceBoundary>
        ) : <p className={clsx(styles.compareHead, 't-small c-faint')}>{t('runs.compare.pick', { max: MAX_COMPARED_RUNS })}</p>}
      </div>
    </>
  );
}

/** One run with its whole trajectory beside its checks, or several runs aligned check by check. */
export function ComparedRuns({ runIds, onOpen, onRemove }: { runIds: string[]; onOpen: (runId: string) => void; onRemove: (runId: string) => void }) {
  const runs = useRuns(runIds);
  return runs.length === 1 ? <OneRunCompared run={runs[0]} /> : <RunsSideBySide runs={runs} onOpen={onOpen} onRemove={onRemove} />;
}

export function OneRunCompared({ run }: { run: RunDetail }) {
  const trajectory = useRunTrajectory(run.id);
  return (
    <>
      <header className={styles.compareHead}><RunTitle run={run} /></header>
      <SingleRunComparison run={run} trajectory={trajectory} />
    </>
  );
}

/** A combination's runs of the task, each a chip whose state the view decides; runs outside the outcome filter are dimmed. */
export function CombinationRow({ combination, query, chipState, onRun }: {
  combination: CombinationRuns;
  query: RunRecordsQuery;
  chipState: (run: string) => Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-current' | 'aria-pressed' | 'disabled'>;
  onRun: (run: string) => void;
}) {
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
            {...chipState(run.id)}
          >
            <OutcomeDot outcome={run.outcome} />{run.attempt}
          </button>
        ))}
      </span>
    </li>
  );
}
