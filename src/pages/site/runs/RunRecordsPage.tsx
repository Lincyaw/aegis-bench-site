import { clsx } from 'clsx';
import { Suspense, useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  useBenchmark, useCombinationTaskPages, useCombinations, useTaskComparison, useTaskFile, useTaskPages, useTaskRuns, useTrajectories,
  type BenchmarkDetail, type Combination, type TaskPage, type TaskSummary,
} from '../../../api/client';
import type { ComparisonSource } from '../../../components/comparison/comparison';
import { RunComparison, TaskInput } from '../../../components/comparison/TaskComparison';
import { CombinationLabel, VendorBadge } from '../../../components/model/ModelBadge';
import { HuggingFaceBoundary } from '../../../components/run/HuggingFace';
import { OutcomeDot } from '../../../components/run/Outcome';
import { CombinationColumn, Pane, PaneEmpty, PaneHead, PaneList, PaneMore, RunChips, TaskColumn, TaskModeSwitch } from '../../../components/run/RunRecords';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { COMPARISON_NAVIGATE_OPTIONS, type ComparisonView } from '../../../routes/comparison';
import {
  EVERY_COMBINATION, OUTCOME_FILTERS, RUN_RECORD_VIEWS, TASK_PAGE_SIZE, combinationKey, defaultRunId, parseRunRecordsQuery,
  runRecordsLevel, runRecordsPath, runRecordsSearch, withCombination, withDetail, withFilter, withRecordsView, withRun, withSearch, withTask,
  type RunRecordsLevel, type RunRecordsQuery,
} from '../../../routes/runRecords';
import { BENCHMARKS_PATH, INSTRUCTION_PATH, benchmarkPath, stagePath, taskFilesPath } from '../../../routes/site';
import { Loading } from '../../../ui/content';
import { SearchField, SegmentedControl, Select } from '../../../ui/controls';
import controls from '../../../ui/controls.module.css';
import { NARROW_QUERY, useMediaQuery } from '../../../ui/media';
import { Breadcrumbs } from '../../../ui/navigation';
import { RunDetailPanel } from './RunDetailPanel';
import styles from './RunRecordsPage.module.css';

/**
 * Every published run, by task or by model. By task: the tasks, then each combination's runs of the chosen task and
 * the chosen run, or the task's runs compared. By model: the combinations, then the chosen one's runs task by task and
 * the chosen run.
 */
export function RunRecordsPage() {
  const { benchmarkId = '' } = useParams();
  const [search, setSearch] = useSearchParams();
  const narrow = useMediaQuery(NARROW_QUERY);
  const benchmark = useBenchmark(benchmarkId);
  const query = parseRunRecordsQuery(search);
  const level = runRecordsLevel(query, narrow);
  const update = (next: RunRecordsQuery) => {
    const sameChoice = next.by === query.by && next.combination === query.combination && next.task === query.task && next.run === query.run && next.mode === query.mode;
    // Only a narrow window replacing one level with another starts again from the top.
    setSearch(runRecordsSearch(next), { replace: sameChoice, preventScrollReset: runRecordsLevel(next, narrow) === level });
  };
  const compare = (next: RunRecordsQuery) => setSearch(runRecordsSearch(next), COMPARISON_NAVIGATE_OPTIONS);
  return (
    <div className={styles.workspace} data-half={benchmark.stage.half}>
      <RunToolbar benchmark={benchmark} query={query} onQuery={update} />
      <div className={styles.browser}>
        {query.by === 'task' && <TaskView benchmark={benchmark} query={query} level={level} onQuery={update} onCompare={compare} />}
        {query.by === 'model' && (query.combination || !query.task || !query.run
          ? <ModelView benchmark={benchmark} query={query} level={level} onQuery={update} />
          : (
            <Suspense fallback={<Loading />}>
              <RunModelView benchmark={benchmark} query={query} task={query.task} run={query.run} level={level} onQuery={update} />
            </Suspense>
          ))}
      </div>
    </div>
  );
}

export function RunToolbar({ benchmark, query, onQuery }: { benchmark: BenchmarkDetail; query: RunRecordsQuery; onQuery: (query: RunRecordsQuery) => void }) {
  const { t } = useTranslation();
  const combinations = useCombinations(benchmark.id);
  return (
    <header className={styles.toolbar}>
      <h1 className="visually-hidden">{t('runs.pageTitle', { benchmark: benchmark.name })}</h1>
      <Breadcrumbs className={styles.crumbs} crumbs={[
        { label: t('site.nav.benchmarks'), to: BENCHMARKS_PATH }, { label: `${benchmark.stage.id} ${benchmark.stage.name}`, to: stagePath(benchmark.stage.id) },
        { label: benchmark.name, to: benchmarkPath(benchmark.id) }, { label: t('benchmarks.runRecords') },
      ]} />
      <SegmentedControl
        label={t('runs.records.label')} value={query.by}
        choices={RUN_RECORD_VIEWS.map(view => ({ value: view, label: t(`runs.records.${view}`) }))}
        onChange={by => onQuery(withRecordsView(query, by))}
      />
      <SearchField className={styles.search} label={t('runs.search')} value={query.q} onChange={q => onQuery(withSearch(query, q))} />
      {query.by === 'task' && (
        <Select
          className={styles.filter}
          label={t('runs.combinationFilter')}
          value={query.combination ?? EVERY_COMBINATION}
          choices={[{ value: EVERY_COMBINATION, label: t('runs.everyCombination') }, ...combinations.map(entry => ({ value: combinationKey(entry.model.id, entry.harness.id), label: `${entry.model.name} · ${entry.harness.name}` }))]}
          onChange={value => onQuery(withFilter(query, { combination: value === EVERY_COMBINATION ? undefined : value, outcome: query.outcome }))}
        />
      )}
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

/** The tasks, then the chosen task's runs by combination with the chosen run, or the task's runs compared. */
export function TaskView({ benchmark, query, level, onQuery, onCompare }: {
  benchmark: BenchmarkDetail; query: RunRecordsQuery; level: RunRecordsLevel; onQuery: (query: RunRecordsQuery) => void; onCompare: (query: RunRecordsQuery) => void;
}) {
  // The list keeps showing the last results while a new search or combination loads; a combination's pass rates are its own.
  const taskPages = useTaskPages(benchmark.id, useDeferredValue(query.q), useDeferredValue(query.combination), TASK_PAGE_SIZE);
  if (taskPages.isFetchNextPageError) {
    throw taskPages.error;
  }
  const tasks: TaskPage = { items: taskPages.data.pages.flatMap(page => page.items), total: taskPages.data.pages[0].total };
  const taskId = query.task ?? (level === 'threePanes' ? tasks.items[0]?.id : undefined);
  return (
    <>
      {(level === 'threePanes' || level === 'list') && (
        <TaskColumn tasks={tasks} currentTask={taskId} onTask={task => onQuery(withTask(query, task))} loadingMore={taskPages.isFetchingNextPage} onMore={() => void taskPages.fetchNextPage()} />
      )}
      {level !== 'list' && taskId && (
        <Suspense fallback={<Pane><Loading /></Pane>}>
          {query.mode === 'compare'
            ? <TaskCompareArea benchmark={benchmark} taskId={taskId} query={query} level={level} onQuery={onQuery} onCompare={onCompare} />
            : <TaskRunsArea benchmark={benchmark} taskId={taskId} summary={tasks.items.find(task => task.id === taskId)} query={query} level={level} onQuery={onQuery} />}
        </Suspense>
      )}
    </>
  );
}

/**
 * The chosen task's combinations and, beside them, the chosen run; on a narrow window, whichever level is open. The
 * task's pass rate is the one the task list gives it, the combination kept to's when there is one.
 */
export function TaskRunsArea({ benchmark, taskId, summary, query, level, onQuery }: {
  benchmark: BenchmarkDetail; taskId: string; summary: TaskSummary | undefined; query: RunRecordsQuery; level: RunRecordsLevel; onQuery: (query: RunRecordsQuery) => void;
}) {
  const { t } = useTranslation();
  const taskRuns = useTaskRuns(benchmark.id, taskId);
  const combinations = taskRuns.combinations.filter(combination => !query.combination || combinationKey(combination.model.id, combination.harness.id) === query.combination);
  // A task the list has not loaded yet is rated over all its runs until it has.
  const passRate = (summary ?? taskRuns.task).passRate;
  const runId = query.run ?? (level === 'threePanes' ? defaultRunId(combinations.flatMap(combination => combination.runs), query.outcome) : undefined);
  return (
    <>
      {(level === 'threePanes' || level === 'runs') && (
        <Pane label={t('runs.runs')}>
          <PaneHead className={styles.stacked}>
            {level === 'runs' && <button type="button" className={clsx(styles.back, 't-micro c-muted')} onClick={() => onQuery(withTask(query, undefined))}>‹ {t('runs.allTasks')}</button>}
            <span className="t-label">{taskRuns.task.id} {taskRuns.task.title}</span>
            <span className="t-micro c-faint">{t('runs.taskSummary', { combinations: combinations.length, runs: taskRuns.runsPerTask, rate: Math.round(passRate * 100) })}</span>
            <LocaleLink className={clsx(controls.textLink, styles.taskFiles, 't-micro')} to={taskFilesPath(benchmark.id, taskRuns.task.id)}>{t('tasks.files')}</LocaleLink>
            <span className={styles.modeSwitch}><TaskModeSwitch query={query} onQuery={onQuery} /></span>
          </PaneHead>
          <PaneList>
            {combinations.map(({ model, harness, runs }) => (
              <li key={combinationKey(model.id, harness.id)} className={styles.combination}>
                <p className={styles.comboName}>
                  <CombinationLabel model={model} harness={harness} />
                  <span className="t-numeric c-muted">{runs.filter(run => run.outcome === 'passed').length} / {runs.length}</span>
                </p>
                <RunChips runs={runs} runId={runId} outcome={query.outcome} labelOf={run => t('runs.runOf', { model: model.name, harness: harness.name, attempt: run.attempt })} onRun={run => onQuery(withRun(query, run))} />
              </li>
            ))}
          </PaneList>
        </Pane>
      )}
      {(level === 'threePanes' || level === 'detail') && (
        <RunDetailColumn benchmark={benchmark} runId={runId} query={query} back={level === 'detail' ? t('runs.allRunsOf', { task: taskRuns.task.id }) : undefined} onQuery={onQuery} />
      )}
    </>
  );
}

/** The chosen run in full; on a narrow window it leads back to the runs it was chosen from. */
export function RunDetailColumn({ benchmark, runId, query, back, onQuery }: { benchmark: BenchmarkDetail; runId: string | undefined; query: RunRecordsQuery; back: string | undefined; onQuery: (query: RunRecordsQuery) => void }) {
  const { t } = useTranslation();
  return (
    <Pane label={t('runs.detailLabel')} className={styles.detail}>
      {back && <button type="button" className={clsx(styles.detailBack, 't-micro c-muted')} onClick={() => onQuery(withRun(query, undefined))}>‹ {back}</button>}
      {runId ? (
        <HuggingFaceBoundary resetKey={runId}>
          <Suspense fallback={<Loading />}>
            <RunDetailPanel runId={runId} legend={benchmark.timelineLegend} view={{ tab: query.tab, step: query.step, check: query.check }} onView={view => onQuery(withDetail(query, view))} />
          </Suspense>
        </HuggingFaceBoundary>
      ) : <p className="t-small c-faint">{t('runs.chooseRun')}</p>}
    </Pane>
  );
}

/** The chosen task's runs compared across the width beside the tasks: its input, the runs to choose from, the comparison. */
export function TaskCompareArea({ benchmark, taskId, query, level, onQuery, onCompare }: {
  benchmark: BenchmarkDetail; taskId: string; query: RunRecordsQuery; level: RunRecordsLevel; onQuery: (query: RunRecordsQuery) => void; onCompare: (query: RunRecordsQuery) => void;
}) {
  const { t } = useTranslation();
  const taskRuns = useTaskRuns(benchmark.id, taskId);
  // The combination filter narrows the runs to choose from as it narrows the runs listed.
  const entrants = taskRuns.combinations.filter(combination => !query.combination || combinationKey(combination.model.id, combination.harness.id) === query.combination);
  const onView = (view: ComparisonView) => onCompare({ ...query, ...view });
  const useComparison = (runIds: string[]) => useTaskComparison(benchmark.id, taskId, runIds);
  const source: ComparisonSource = {
    useComparison, useTrajectories, runPath: runId => runRecordsPath(benchmark.id, { task: taskId, run: runId, combination: query.combination }),
  };
  return (
    <Pane label={t('compare.label')} className={styles.compareArea}>
      <div className={styles.compareHead}>
        {level === 'runs' && <button type="button" className={clsx(styles.back, 't-micro c-muted')} onClick={() => onQuery(withTask(query, undefined))}>‹ {t('runs.allTasks')}</button>}
        <span className="t-label">{taskRuns.task.id} {taskRuns.task.title}</span>
        <TaskModeSwitch query={query} onQuery={onQuery} />
      </div>
      <HuggingFaceBoundary resetKey={taskId}>
        <Suspense fallback={<Loading />}><PublicTaskInput benchmarkId={benchmark.id} taskId={taskId} /></Suspense>
      </HuggingFaceBoundary>
      <RunComparison entrants={entrants} source={source} view={query} onView={onView} />
    </Pane>
  );
}

/** The task text every run received, as the task publishes it in instruction.md. */
export function PublicTaskInput({ benchmarkId, taskId }: { benchmarkId: string; taskId: string }) {
  const file = useTaskFile(benchmarkId, taskId, INSTRUCTION_PATH);
  if (file.text === undefined) {
    throw new Error(`${taskId}'s ${INSTRUCTION_PATH} is not text`);
  }
  return <TaskInput instruction={file.text} />;
}

/** A chosen run without its combination, as the task view leaves it, opens the model view on the combination that ran it. */
export function RunModelView({ benchmark, query, task, run, level, onQuery }: {
  benchmark: BenchmarkDetail; query: RunRecordsQuery; task: string; run: string; level: RunRecordsLevel; onQuery: (query: RunRecordsQuery) => void;
}) {
  const { combinations } = useTaskRuns(benchmark.id, task);
  const holder = combinations.find(combination => combination.runs.some(candidate => candidate.id === run));
  if (!holder) {
    throw new Error(`${run} is not a published run of ${task}`);
  }
  return <ModelView benchmark={benchmark} query={{ ...query, combination: combinationKey(holder.model.id, holder.harness.id) }} level={level} onQuery={onQuery} />;
}

/** The combinations, then the chosen one's runs task by task with the chosen run. */
export function ModelView({ benchmark, query, level, onQuery }: { benchmark: BenchmarkDetail; query: RunRecordsQuery; level: RunRecordsLevel; onQuery: (query: RunRecordsQuery) => void }) {
  const combinations = useCombinations(benchmark.id);
  const keyOf = (entry: Combination) => combinationKey(entry.model.id, entry.harness.id);
  const chosen = query.combination ?? (level === 'threePanes' && combinations[0] ? keyOf(combinations[0]) : undefined);
  const entry = combinations.find(candidate => keyOf(candidate) === chosen);
  if (chosen && !entry) {
    throw new Error(`${benchmark.id} publishes no combination ${chosen}`);
  }
  return (
    <>
      {(level === 'threePanes' || level === 'list') && (
        <CombinationColumn combinations={combinations} current={chosen} onCombination={key => onQuery(withCombination(query, key))} />
      )}
      {level !== 'list' && entry && (
        <Suspense fallback={<Pane><Loading /></Pane>}>
          <CombinationRunsArea benchmark={benchmark} entry={entry} query={query} level={level} onQuery={onQuery} />
        </Suspense>
      )}
    </>
  );
}

/** The chosen combination's runs task by task and, beside them, the chosen run; on a narrow window, whichever level is open. */
export function CombinationRunsArea({ benchmark, entry, query, level, onQuery }: { benchmark: BenchmarkDetail; entry: Combination; query: RunRecordsQuery; level: RunRecordsLevel; onQuery: (query: RunRecordsQuery) => void }) {
  const { t } = useTranslation();
  const { model, harness } = entry;
  // The list keeps showing the last results while a new search loads.
  const pages = useCombinationTaskPages(benchmark.id, combinationKey(model.id, harness.id), useDeferredValue(query.q), TASK_PAGE_SIZE);
  if (pages.isFetchNextPageError) {
    throw pages.error;
  }
  const rows = pages.data.pages.flatMap(page => page.items);
  const total = pages.data.pages[0].total;
  const runId = query.run ?? (level === 'threePanes' ? defaultRunId(rows.flatMap(row => row.runs), query.outcome) : undefined);
  return (
    <>
      {(level === 'threePanes' || level === 'runs') && (
        <Pane label={t('runs.runs')}>
          <PaneHead className={styles.stacked}>
            {level === 'runs' && <button type="button" className={clsx(styles.back, 't-micro c-muted')} onClick={() => onQuery(withCombination(query, undefined))}>‹ {t('runs.combinations')}</button>}
            <span className={styles.comboName}><VendorBadge model={model} /><span className="t-label">{model.name}</span><span className="t-micro c-faint">{harness.name}</span></span>
            <span className="t-micro c-faint">{t('runs.combinationTasks', { count: total })}</span>
          </PaneHead>
          <PaneList>
            {rows.map(({ task, runs }) => (
              <li key={task.id} className={styles.combination}>
                <p className={styles.comboName}>
                  <span className="t-mono c-faint">{task.id}</span><span className="t-small">{task.title}</span>
                  <span className="t-numeric c-muted">{runs.filter(run => run.outcome === 'passed').length} / {runs.length}</span>
                </p>
                <RunChips runs={runs} runId={runId} outcome={query.outcome} labelOf={run => t('runs.runOf', { model: model.name, harness: harness.name, attempt: run.attempt })} onRun={run => onQuery(withRun(withTask(query, task.id), run))} />
              </li>
            ))}
            {rows.length === 0 && <PaneEmpty>{t('runs.noTasks')}</PaneEmpty>}
          </PaneList>
          {rows.length < total && (
            <PaneMore label={t('runs.loadMore', { shown: rows.length, total })} loading={pages.isFetchingNextPage} onClick={() => void pages.fetchNextPage()} />
          )}
        </Pane>
      )}
      {(level === 'threePanes' || level === 'detail') && (
        <RunDetailColumn benchmark={benchmark} runId={runId} query={query} back={level === 'detail' ? `${model.name} · ${harness.name}` : undefined} onQuery={onQuery} />
      )}
    </>
  );
}
