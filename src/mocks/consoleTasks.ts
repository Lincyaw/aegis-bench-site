import type {
  ConsoleTaskDetail, ConsoleTaskEntry, ConsoleTaskRow, EntrantMark, Locale, ReferenceFile, ResultCounts, RunFact, TagCount, TaskCheckResults, TaskGrading,
  TaskOrder, TaskRecord, TaskResults, TaskRevision, TaskSpread,
} from '../api/types';
import { benchmarkOf, benchmarkRef, hasBenchmark, matchesTaskSearch, taskOf } from './benchmarks';
import { combinationKey, harnessRef, keepsTo, modelRef, type CombinationScope } from './catalog';
import { runRowOf } from './consoleRuns';
import { huggingFacePageOf, readTaskFile, taskDirectoryOf } from './records';
import { rankingIn, resultCountsOf } from './results';
import { directoryEntriesOf, taskFileOf } from './taskFiles';

/*
 * The console's view of a benchmark's tasks: every run that answered them, how their grading decides, the files the
 * public site withholds, and the versions each task went through.
 */

/** Tasks per page of the console's task list when a request names no limit, as the spec declares. */
export const DEFAULT_CONSOLE_TASK_PAGE_SIZE = 20;

/** The task a request names, or nothing when the benchmark or the task does not exist. */
export function namedTaskOf(benchmarkId: string, taskId: string): TaskRecord | undefined {
  return hasBenchmark(benchmarkId) ? taskOf(benchmarkId, taskId) : undefined;
}

const factsByTaskCache = new Map<string, Map<string, RunFact[]>>();

/** A benchmark's runs, grouped by the task they answered. */
export function runFactsByTask(benchmarkId: string): Map<string, RunFact[]> {
  const cached = factsByTaskCache.get(benchmarkId);
  if (cached) {
    return cached;
  }
  const grouped = Map.groupBy(benchmarkOf(benchmarkId).runs, fact => fact.taskId);
  factsByTaskCache.set(benchmarkId, grouped);
  return grouped;
}

export function taskResultCountsOf(benchmarkId: string, taskId: string): ResultCounts {
  return resultCountsOf(runFactsByTask(benchmarkId).get(taskId) ?? []);
}

/** The scope that keeps to every combination. */
export const ALL_COMBINATIONS: CombinationScope = { model: '', harness: '' };

/** A task's runs by the combinations a scope keeps to. */
export function taskFactsIn(benchmarkId: string, taskId: string, scope: CombinationScope): RunFact[] {
  return (runFactsByTask(benchmarkId).get(taskId) ?? []).filter(fact => keepsTo(scope, fact.modelId, fact.harnessId));
}

/** How a task's counted runs fall, or nothing while none counts. */
export function spreadOf(result: ResultCounts): TaskSpread | undefined {
  const counted = result.passed + result.failed;
  if (counted === 0) {
    return undefined;
  }
  return result.passed === counted ? 'saturated' : result.passed === 0 ? 'unsolved' : 'discriminating';
}

/** Whether each combination a scope keeps to, in ranking order, passed the task at least once. */
export function entrantMarksOf(benchmarkId: string, taskId: string, scope: CombinationScope, locale: Locale): EntrantMark[] {
  const facts = taskFactsIn(benchmarkId, taskId, scope);
  return rankingIn(benchmarkId, scope).map(({ modelId, harnessId }) => ({
    model: modelRef(modelId, locale), harness: harnessRef(harnessId, locale),
    solved: facts.some(fact => fact.modelId === modelId && fact.harnessId === harnessId && fact.outcome === 'passed'),
  }));
}

export function taskRowOf(benchmarkId: string, task: TaskRecord, locale: Locale): ConsoleTaskRow {
  const result = taskResultCountsOf(benchmarkId, task.id);
  const spread = spreadOf(result);
  return {
    id: task.id, title: task.title, tags: task.tags, version: task.version, result, ...(spread && { spread }),
    entrants: entrantMarksOf(benchmarkId, task.id, ALL_COMBINATIONS, locale),
  };
}

/** Every tag of a benchmark's tasks and how many tasks carry it, the commonest first. */
export function tagCountsOf(benchmarkId: string): TagCount[] {
  const counts = Map.groupBy(benchmarkOf(benchmarkId).tasks.flatMap(task => task.tags), tag => tag);
  return [...counts].map(([tag, tasks]) => ({ tag, tasks: tasks.length })).sort((a, b) => b.tasks - a.tasks || a.tag.localeCompare(b.tag));
}

export interface TaskFilter {
  q: string;
  tag: string;
  spread?: TaskSpread;
  order: TaskOrder;
}

/** Tasks in an order: by pass rate, a task without a counted run last, or by id. */
export function sortedTasks<Item>(items: Item[], order: TaskOrder, idOf: (item: Item) => string, rateOf: (item: Item) => number | undefined): Item[] {
  switch (order) {
    case 'id': return items.toSorted((a, b) => idOf(a).localeCompare(idOf(b)));
    case 'hardest': return items.toSorted((a, b) => (rateOf(a) ?? Infinity) - (rateOf(b) ?? Infinity));
    case 'easiest': return items.toSorted((a, b) => (rateOf(b) ?? -Infinity) - (rateOf(a) ?? -Infinity));
  }
}

/** The tasks a filter selects, in its order. */
export function filteredTasksOf(benchmarkId: string, filter: TaskFilter): TaskRecord[] {
  const { tasks } = benchmarkOf(benchmarkId);
  const results = new Map(tasks.map(task => [task.id, taskResultCountsOf(benchmarkId, task.id)]));
  const matching = tasks.filter(task => matchesTaskSearch(task, filter.q)
    && (!filter.tag || task.tags.includes(filter.tag))
    && (!filter.spread || spreadOf(results.get(task.id) ?? resultCountsOf([])) === filter.spread));
  return sortedTasks(matching, filter.order, task => task.id, task => results.get(task.id)?.passRate);
}

/** A task as the console shows it, with what the runs of the combinations a scope keeps to come to. */
export function consoleTaskOf(benchmarkId: string, task: TaskRecord, scope: CombinationScope, locale: Locale): ConsoleTaskDetail {
  const result = resultCountsOf(taskFactsIn(benchmarkId, task.id, scope));
  const spread = spreadOf(result);
  const huggingFaceUrl = huggingFacePageOf(benchmarkOf(benchmarkId).record, taskDirectoryOf(task.id));
  return {
    id: task.id, title: task.title, benchmark: benchmarkRef(benchmarkId), tags: task.tags, version: task.version,
    instruction: task.instruction, reportSchema: task.reportSchema, environment: task.environment, tools: task.tools,
    acceptance: task.checks.map(check => ({ checkId: check.id, requirement: check.title })), result, ...(spread && { spread }),
    entrants: entrantMarksOf(benchmarkId, task.id, scope, locale),
    sizes: { checks: task.checks.length, files: task.files.length, revisions: task.revisions.length },
    ...(huggingFaceUrl && { huggingFaceUrl }),
  };
}

/** How the task's grading decides, with each check's code as the task's directory holds it. */
export async function taskGradingOf(benchmarkId: string, task: TaskRecord): Promise<TaskGrading> {
  const { record } = benchmarkOf(benchmarkId);
  return {
    passRule: record.passRule,
    checks: await Promise.all(task.checks.map(async check => {
      const file = task.files.find(candidate => candidate.path === check.path);
      if (!file) {
        throw new Error(`check ${check.id} of ${task.id} names ${check.path}, which the task's files do not list`);
      }
      return {
        id: check.id, title: check.title, method: check.method, ...(check.samples && { samples: check.samples }),
        code: { path: check.path, source: await readTaskFile(record, task.id, file) },
      };
    })),
    verifier: task.verifier,
  };
}

/** The files the public site withholds, whole. */
export function referenceFilesOf(benchmarkId: string, task: TaskRecord): Promise<ReferenceFile[]> {
  return Promise.all(task.files.flatMap(file => (file.withheld ? [{ file, reason: file.withheld }] : []))
    .map(async ({ file, reason }) => ({ reason, file: await taskFileOf(benchmarkId, task.id, file) })));
}

/** The runs on a task of each combination a scope keeps to, best pass rate first, and the runs that check the task. */
export function taskEntrantRunsOf(benchmarkId: string, task: TaskRecord, scope: CombinationScope, locale: Locale): TaskResults {
  const byEntrant = Map.groupBy(taskFactsIn(benchmarkId, task.id, scope), fact => combinationKey(fact.modelId, fact.harnessId));
  const entrants = [...byEntrant.values()].map(facts => ({
    model: modelRef(facts[0].modelId, locale), harness: harnessRef(facts[0].harnessId, locale),
    runs: facts.map(fact => runRowOf(benchmarkId, fact, locale)), result: resultCountsOf(facts),
  }));
  return { entrants: entrants.sort((a, b) => (b.result.passRate ?? -1) - (a.result.passRate ?? -1)), validations: task.validations };
}

/** Each check against each combination a scope keeps to: of a combination's counted runs, how many passed the check. */
export function checkResultsOf(benchmarkId: string, task: TaskRecord, scope: CombinationScope, locale: Locale): TaskCheckResults {
  const ranking = rankingIn(benchmarkId, scope);
  const facts = taskFactsIn(benchmarkId, task.id, scope).filter(fact => fact.outcome !== 'executionFailed');
  return {
    entrants: ranking.map(({ modelId, harnessId }) => ({ model: modelRef(modelId, locale), harness: harnessRef(harnessId, locale) })),
    checks: task.checks.map(check => ({
      id: check.id, title: check.title, method: check.method,
      byEntrant: ranking.map(({ modelId, harnessId }) => {
        const runs = facts.filter(fact => fact.modelId === modelId && fact.harnessId === harnessId);
        return { passed: runs.filter(fact => !fact.failedChecks.includes(check.id)).length, counted: runs.length };
      }),
    })),
  };
}

/** The versions that led to a task's current one, newest first, each with the runs that answered it. */
export function revisionsOf(benchmarkId: string, task: TaskRecord): TaskRevision[] {
  const facts = runFactsByTask(benchmarkId).get(task.id) ?? [];
  return task.revisions.map(revision => {
    const answered = facts.filter(fact => fact.taskVersion === revision.version);
    return {
      ...revision, current: revision.version === task.version,
      runs: answered.length, counted: answered.filter(fact => fact.outcome !== 'executionFailed').length,
    };
  });
}

/** A directory's entries as the console lists them: every file with its size, and what the public site withholds marked. */
export function consoleEntriesOf(task: TaskRecord, directory: string): ConsoleTaskEntry[] | undefined {
  return directoryEntriesOf(task.files, directory)?.map(entry => {
    const file = task.files.find(candidate => candidate.path === entry.path);
    return {
      path: entry.path, kind: entry.kind, ...(file && { size: file.size }), ...(entry.withheld && { withheldFromPublic: entry.withheld }),
    };
  });
}
