import type { FailureClass, Locale, RunOutcome, RunRow } from '../api/types';
import { benchmarkById } from './benchmarks';
import { EVALUATED_IN, RUNS_PER_TASK, harnessRef, modelRef } from './catalog';
import { hashOf } from './hash';
import { costUsdOf, failureClassOf, isReviewed, outcomeOf, runIdOf, stepCountOf, stepTimeOf, type RunKey } from './runs';
import { tasksOf, type TaskRecord } from './tasks';

/** What lists and aggregates read of one run, without generating its whole record. */
export interface RunFact {
  key: RunKey;
  runId: string;
  task: TaskRecord;
  outcome: RunOutcome;
  steps: number;
  costUsd: number;
  finishedAt: string;

  /** The class a review gave a failed run; absent while the failure is unreviewed and for other outcomes */
  failureClass?: FailureClass;
}

/** The version of a task its runs answered: a short hash of the task's content. */
export function taskVersionOf(benchmarkId: string, taskId: string): string {
  return hashOf(`version:${benchmarkId}.${taskId}`).toString(16).padStart(8, '0').slice(0, 7);
}

/** The evaluation batch of a combination's runs in this round. */
export function batchOf(modelId: string, harnessId: string): string {
  return `${EVALUATED_IN}-${modelId}-${harnessId}`;
}

const indexCache = new Map<string, RunFact[]>();

/** Every run of a benchmark: each task, each ranked combination, each attempt. */
export function runFactsOf(benchmarkId: string): RunFact[] {
  const cached = indexCache.get(benchmarkId);
  if (cached) {
    return cached;
  }
  const { ranking } = benchmarkById(benchmarkId);
  const facts = tasksOf(benchmarkId).flatMap(task => ranking.flatMap(([modelId, harnessId]) => Array.from({ length: RUNS_PER_TASK }, (_, index): RunFact => {
    const key = { benchmarkId, taskId: task.id, modelId, harnessId, attempt: index + 1 };
    const runId = runIdOf(benchmarkId, task.id, modelId, harnessId, key.attempt);
    const outcome = outcomeOf(key);
    const steps = stepCountOf(runId, outcome);
    const reviewed = outcome === 'failed' && isReviewed(runId);
    return {
      key, runId, task, outcome, steps, costUsd: costUsdOf(key, steps), finishedAt: stepTimeOf(runId, steps),
      ...(reviewed && { failureClass: failureClassOf(runId) }),
    };
  })));
  indexCache.set(benchmarkId, facts);
  return facts;
}

export function runRowOf(fact: RunFact, locale: Locale): RunRow {
  const { key } = fact;
  return {
    id: fact.runId, task: { id: fact.task.id, title: fact.task.title }, model: modelRef(key.modelId, locale), harness: harnessRef(key.harnessId, locale),
    attempt: key.attempt, outcome: fact.outcome, finishedAt: fact.finishedAt, steps: fact.steps, costUsd: fact.costUsd,
    taskVersion: taskVersionOf(key.benchmarkId, key.taskId), batch: batchOf(key.modelId, key.harnessId),
    ...(fact.failureClass && { failureClass: fact.failureClass }),
  };
}
