import type {
  ConsoleTaskDetail, ConsoleTaskEntry, ConsoleTaskRow, EntrantMark, Locale, ReferenceFile, ResultCounts, TagCount, TaskCheckResults, TaskGrading,
  TaskOrder, TaskResults, TaskRevision, TaskSpread, ValidationRun,
} from '../api/types';
import { benchmarkById, benchmarkRef, hasBenchmark, type TaskKind } from './benchmarks';
import { harnessRef, modelRef } from './catalog';
import { fractionOf, hashOf, pickOf } from './hash';
import { resultCountsOf } from './results';
import { runFactsOf, runRowOf, taskVersionOf, type RunFact } from './runIndex';
import { INSTRUCTION_TAIL, REPORT_SCHEMA, checksOf, environmentOf, planOf } from './runs';
import { byteLengthOf, checkFileOf, directoryEntriesOf, taskFileOf, taskFilesOf } from './taskFiles';
import { taskOf, tasksOf, type TaskRecord } from './tasks';
import { TOOL_PLAN } from './trajectories';

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
  const grouped = Map.groupBy(runFactsOf(benchmarkId), fact => fact.task.id);
  factsByTaskCache.set(benchmarkId, grouped);
  return grouped;
}

export function taskResultCountsOf(benchmarkId: string, taskId: string): ResultCounts {
  return resultCountsOf(runFactsByTask(benchmarkId).get(taskId) ?? []);
}

/** How a task's counted runs fall, or nothing while none counts. */
export function spreadOf(result: ResultCounts): TaskSpread | undefined {
  const counted = result.passed + result.failed;
  if (counted === 0) {
    return undefined;
  }
  return result.passed === counted ? 'saturated' : result.passed === 0 ? 'unsolved' : 'discriminating';
}

/** Whether each combination, in ranking order, passed the task at least once. */
export function entrantMarksOf(benchmarkId: string, taskId: string, locale: Locale): EntrantMark[] {
  const facts = runFactsByTask(benchmarkId).get(taskId) ?? [];
  return benchmarkById(benchmarkId).ranking.map(([modelId, harnessId]) => ({
    model: modelRef(modelId, locale), harness: harnessRef(harnessId, locale),
    solved: facts.some(fact => fact.key.modelId === modelId && fact.key.harnessId === harnessId && fact.outcome === 'passed'),
  }));
}

export function taskRowOf(benchmarkId: string, task: TaskRecord, locale: Locale): ConsoleTaskRow {
  const result = taskResultCountsOf(benchmarkId, task.id);
  const spread = spreadOf(result);
  return {
    id: task.id, title: task.title, tags: task.tags, version: taskVersionOf(benchmarkId, task.id), result, ...(spread && { spread }),
    entrants: entrantMarksOf(benchmarkId, task.id, locale),
  };
}

/** Every tag of a benchmark's tasks and how many tasks carry it, the commonest first. */
export function tagCountsOf(benchmarkId: string): TagCount[] {
  const counts = Map.groupBy(tasksOf(benchmarkId).flatMap(task => task.tags), tag => tag);
  return [...counts].map(([tag, tasks]) => ({ tag, tasks: tasks.length })).sort((a, b) => b.tasks - a.tasks || a.tag.localeCompare(b.tag));
}

export interface TaskFilter {
  q: string;
  tag: string;
  spread?: TaskSpread;
  order: TaskOrder;
}

/** The tasks a filter selects, in its order; a task without a counted run sorts last by pass rate. */
export function filteredTasksOf(benchmarkId: string, filter: TaskFilter): TaskRecord[] {
  const rates = new Map(tasksOf(benchmarkId).map(task => [task.id, taskResultCountsOf(benchmarkId, task.id)]));
  const rateOf = (task: TaskRecord) => rates.get(task.id)?.passRate;
  const matching = tasksOf(benchmarkId).filter(task => (!filter.q || task.id.includes(filter.q) || task.title.includes(filter.q))
    && (!filter.tag || task.tags.includes(filter.tag))
    && (!filter.spread || spreadOf(rates.get(task.id) ?? resultCountsOf([])) === filter.spread));
  switch (filter.order) {
    case 'id': return matching.toSorted((a, b) => a.id.localeCompare(b.id));
    case 'hardest': return matching.toSorted((a, b) => (rateOf(a) ?? Infinity) - (rateOf(b) ?? Infinity));
    case 'easiest': return matching.toSorted((a, b) => (rateOf(b) ?? -Infinity) - (rateOf(a) ?? -Infinity));
  }
}

/** The tools a harness offers on a task of the kind: those its runs call, and submitting. */
export function toolsOf(kind: TaskKind): string[] {
  return [...new Set([...TOOL_PLAN[kind], 'submit'])];
}

export function consoleTaskOf(benchmarkId: string, task: TaskRecord, locale: Locale): ConsoleTaskDetail {
  const { kind } = benchmarkById(benchmarkId);
  const checks = checksOf(kind, task.id);
  const result = taskResultCountsOf(benchmarkId, task.id);
  const spread = spreadOf(result);
  return {
    id: task.id, title: task.title, benchmark: benchmarkRef(benchmarkId), tags: task.tags, version: taskVersionOf(benchmarkId, task.id),
    instruction: `${task.statement}\n\n${INSTRUCTION_TAIL[kind]}`, reportSchema: REPORT_SCHEMA[kind], environment: environmentOf(kind, task),
    tools: toolsOf(kind), acceptance: checks.map(check => ({ checkId: check.id, requirement: check.title })), result, ...(spread && { spread }),
    entrants: entrantMarksOf(benchmarkId, task.id, locale),
    sizes: { checks: checks.length, files: taskFilesOf(benchmarkId, task.id)?.length ?? 0, revisions: revisionsOf(benchmarkId, task).length },
  };
}

const PASS_RULES: Record<TaskKind, string> = {
  coding: '全部检查通过才判为通过，任一检查未通过即判为失败。模型复核类检查取裁判多次评分的中位数。',
  testing: '测试须在正确版本上全部通过，并检出全部缺陷版本，才判为通过。',
  ops: '服务健康检查通过、错误率恢复到基线且根因判定正确，才判为通过。',
  rca: '参考链路的节点全部召回且顺序一致，才判为通过；节点召回率另行计分。',
};

export function taskGradingOf(benchmarkId: string, task: TaskRecord): TaskGrading {
  const { kind } = benchmarkById(benchmarkId);
  return {
    passRule: PASS_RULES[kind],
    checks: checksOf(kind, task.id).map(check => {
      const file = checkFileOf(check, task.id);
      return { id: check.id, title: check.title, method: check.method, ...(check.samples && { samples: check.samples }), code: { path: file.path, source: file.text } };
    }),
    verifier: [
      { label: '入口脚本', value: 'tests/test.sh', format: 'code' }, { label: '超时', value: '900 秒' },
      { label: '资源', value: '2 核 CPU · 4 GB 内存' }, { label: '日志', value: '/logs/verifier', format: 'code' },
    ],
  };
}

export function referenceFilesOf(benchmarkId: string, taskId: string): ReferenceFile[] {
  return (taskFilesOf(benchmarkId, taskId) ?? []).flatMap(file => (file.withheld ? [{ reason: file.withheld, file: taskFileOf(file) }] : []));
}

/** The oracle passes and the no-op agent fails, as they should, except on the rare task whose oracle does not pass. */
export function validationsOf(benchmarkId: string, taskId: string): ValidationRun[] {
  const version = taskVersionOf(benchmarkId, taskId);
  const oracle = fractionOf(`oracle:${benchmarkId}.${taskId}`) < 0.03 ? 'failed' : 'passed';
  const at = (agent: string) => new Date(Date.parse('2026-11-17T08:00:00Z') + (hashOf(`${agent}:${benchmarkId}.${taskId}`) % 36000) * 1000).toISOString();
  return [
    { agent: 'oracle', outcome: oracle, expected: oracle === 'passed', version, finishedAt: at('oracle') },
    { agent: 'nop', outcome: 'failed', expected: true, version, finishedAt: at('nop') },
  ];
}

export function taskEntrantRunsOf(benchmarkId: string, taskId: string, locale: Locale): TaskResults {
  const byEntrant = Map.groupBy(runFactsByTask(benchmarkId).get(taskId) ?? [], fact => `${fact.key.modelId}-${fact.key.harnessId}`);
  const entrants = [...byEntrant.values()].map(facts => ({
    model: modelRef(facts[0].key.modelId, locale), harness: harnessRef(facts[0].key.harnessId, locale),
    runs: facts.map(fact => runRowOf(fact, locale)), result: resultCountsOf(facts),
  }));
  return { entrants: entrants.sort((a, b) => (b.result.passRate ?? -1) - (a.result.passRate ?? -1)), validations: validationsOf(benchmarkId, taskId) };
}

/** Each check against each combination: of a combination's counted runs, how many passed the check. */
export function checkResultsOf(benchmarkId: string, taskId: string, locale: Locale): TaskCheckResults {
  const { kind, ranking } = benchmarkById(benchmarkId);
  const facts = (runFactsByTask(benchmarkId).get(taskId) ?? []).filter(fact => fact.outcome !== 'executionFailed');
  const failing = new Map(facts.map(fact => [fact.runId, fact.outcome === 'failed' ? planOf(fact.runId)?.failingIds ?? [] : []]));
  return {
    entrants: ranking.map(([modelId, harnessId]) => ({ model: modelRef(modelId, locale), harness: harnessRef(harnessId, locale) })),
    checks: checksOf(kind, taskId).map(check => ({
      id: check.id, title: check.title, method: check.method,
      byEntrant: ranking.map(([modelId, harnessId]) => {
        const runs = facts.filter(fact => fact.key.modelId === modelId && fact.key.harnessId === harnessId);
        return { passed: runs.filter(fact => !failing.get(fact.runId)?.includes(check.id)).length, counted: runs.length };
      }),
    })),
  };
}

const EDIT_NOTES = ['补充任务说明中的边界条件', '修正环境的依赖版本', '新增一项隐藏测试', '更换示例数据，避免与公开代码重合'];
const GRADING_NOTES = ['放宽报告格式的检查', '修正评分脚本对空结果的判断', '复核结论为评分错误，修订对应检查'];
const AUTHORS = ['lin.fang', 'zhou.yu', 'chen.qi'];

/** The versions that led to a task's current one, newest first; this round's runs all answered the current version. */
export function revisionsOf(benchmarkId: string, task: TaskRecord): TaskRevision[] {
  const key = `${benchmarkId}.${task.id}`;
  const count = 1 + (hashOf(`revisions:${key}`) % 4);
  const facts = runFactsByTask(benchmarkId).get(task.id) ?? [];
  return Array.from({ length: count }, (_, index): TaskRevision => {
    const current = index === 0;
    const created = index === count - 1;
    const change = created ? 'created' : fractionOf(`change:${key}.${index}`) < 0.6 ? 'edit' : 'reviseGrading';
    const note = created ? '首次登记' : pickOf(change === 'edit' ? EDIT_NOTES : GRADING_NOTES, `note:${key}.${index}`);
    return {
      version: current ? taskVersionOf(benchmarkId, task.id) : hashOf(`version:${key}.${index}`).toString(16).padStart(8, '0').slice(0, 7),
      change, note, author: pickOf(AUTHORS, `author:${key}.${index}`),
      registeredAt: new Date(Date.parse('2026-11-12T10:00:00Z') - index * 9 * 86400_000 - (hashOf(`at:${key}.${index}`) % 28800) * 1000).toISOString(),
      current,
      runs: current ? facts.length : 0,
      counted: current ? facts.filter(fact => fact.outcome !== 'executionFailed').length : 0,
    };
  });
}

/** A directory's entries as the console lists them: every file with its size, and what the public site withholds marked. */
export function consoleEntriesOf(benchmarkId: string, taskId: string, directory: string): ConsoleTaskEntry[] | undefined {
  const files = taskFilesOf(benchmarkId, taskId);
  const entries = files && directoryEntriesOf(files, directory);
  return entries?.map(entry => {
    const file = files?.find(candidate => candidate.path === entry.path);
    return {
      path: entry.path, kind: entry.kind, ...(file && { size: byteLengthOf(file.text) }), ...(entry.withheld && { withheldFromPublic: entry.withheld }),
    };
  });
}
