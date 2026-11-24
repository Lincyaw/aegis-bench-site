import type { CombinationRuns, RunOutcome } from '../api/client';
import { RUN_TABS, type RunTab } from './presentation';

/** How many tasks the task list shows at first and adds each time the reader asks for more. */
export const TASK_PAGE_SIZE = 14;

/** The outcome filter that shows every run. */
export const EVERY_OUTCOME = 'all';
export const OUTCOME_FILTERS = [EVERY_OUTCOME, 'failed', 'passed'] as const satisfies readonly (typeof EVERY_OUTCOME | RunOutcome)[];
export type OutcomeFilter = (typeof OUTCOME_FILTERS)[number];

/** The state of the run records page, as its address keeps it. */
export interface RunRecordsQuery {
  q: string;

  /** A model and harness pair, as combinationKey writes it */
  combination?: string;

  outcome: OutcomeFilter;
  task?: string;
  run?: string;
  tab?: RunTab;
  step?: number;
  check?: string;
}

/** The combination filter's choice that shows every combination; a select's choices cannot be empty. */
export const EVERY_COMBINATION = 'all';

export function combinationKey(modelId: string, harnessId: string): string {
  return `${modelId}-${harnessId}`;
}

/** The page's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseRunRecordsQuery(params: URLSearchParams): RunRecordsQuery {
  const outcome = params.get('outcome') ?? EVERY_OUTCOME;
  const tab = params.get('tab') ?? undefined;
  const step = params.get('step') ?? undefined;
  if (!OUTCOME_FILTERS.some(filter => filter === outcome)) {
    throw new Error(`no outcome filter ${outcome}`);
  }
  if (tab !== undefined && !RUN_TABS.some(candidate => candidate === tab)) {
    throw new Error(`no run tab ${tab}`);
  }
  if (step !== undefined && !/^[1-9]\d*$/.test(step)) {
    throw new Error(`no step ${step}`);
  }
  return {
    q: params.get('q') ?? '', combination: params.get('combination') ?? undefined, outcome: outcome as OutcomeFilter,
    task: params.get('task') ?? undefined, run: params.get('run') ?? undefined, tab: tab as RunTab | undefined,
    step: step === undefined ? undefined : Number(step), check: params.get('check') ?? undefined,
  };
}

/** The address search of a page state; empty values and the default filter are left out. */
export function runRecordsSearch(query: Partial<RunRecordsQuery>): string {
  const entries = Object.entries(query).filter(([key, value]) => value !== undefined && value !== '' && !(key === 'outcome' && value === EVERY_OUTCOME));
  const search = new URLSearchParams(entries.map(([key, value]) => [key, String(value)])).toString();
  return search && `?${search}`;
}

export function runRecordsPath(benchmarkId: string, query: Partial<RunRecordsQuery> = {}): string {
  return `/benchmarks/${benchmarkId}/runs${runRecordsSearch(query)}`;
}

/** Choosing a task, a run or a filter starts the views below it afresh. */
export function withTask(query: RunRecordsQuery, task: string | undefined): RunRecordsQuery {
  return { ...query, task, run: undefined, tab: undefined, step: undefined, check: undefined };
}

export function withRun(query: RunRecordsQuery, run: string | undefined): RunRecordsQuery {
  return { ...query, run, tab: undefined, step: undefined, check: undefined };
}

export function withSearch(query: RunRecordsQuery, q: string): RunRecordsQuery {
  return { ...withTask(query, undefined), q };
}

export function withFilter(query: RunRecordsQuery, filter: Pick<RunRecordsQuery, 'combination' | 'outcome'>): RunRecordsQuery {
  return { ...withRun(query, undefined), ...filter };
}

/** The detail's view: its tab and, within it, the step or check it opens. */
export function withView(query: RunRecordsQuery, view: { tab: RunTab; step?: number; check?: string }): RunRecordsQuery {
  return { ...query, tab: view.tab, step: view.step, check: view.check };
}

/** A wide window shows the three panes together; a narrow one shows one level at a time. */
export type RunRecordsLevel = 'threePanes' | 'tasks' | 'runs' | 'detail';

export function runRecordsLevel(query: RunRecordsQuery, narrow: boolean): RunRecordsLevel {
  return !narrow ? 'threePanes' : query.run ? 'detail' : query.task ? 'runs' : 'tasks';
}

/** The run a task opens on: the first run of the shown combinations with the filtered outcome (failed by default), else the first. */
export function defaultRunId(combinations: CombinationRuns[], outcome: OutcomeFilter): string | undefined {
  const wanted: RunOutcome = outcome === 'passed' ? 'passed' : 'failed';
  const runs = combinations.flatMap(combination => combination.runs);
  return (runs.find(run => run.outcome === wanted) ?? runs[0])?.id;
}
