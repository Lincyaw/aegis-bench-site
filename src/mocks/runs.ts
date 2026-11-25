import type { Locale, RecentRun, RunDetail } from '../api/types';
import { benchmarkOf, benchmarkRef, taskRefOf } from './benchmarks';
import { harnessRef, modelRef } from './catalog';
import { openedIndexes, readRunRecord, readTrajectory, recordedRunOf } from './records';
import { timelineOf } from './trajectories';

/** A run's detail: its record, with each step of its trajectory marked by the benchmark's rules, or nothing when there is no such run. */
export async function runDetailOf(runId: string, locale: Locale): Promise<RunDetail | undefined> {
  const located = openedIndexes().runs.get(runId);
  if (!located) {
    return undefined;
  }
  const { benchmarkId, fact } = located;
  const [run, trajectory] = await Promise.all([readRunRecord(benchmarkId, runId), readTrajectory(benchmarkId, runId)]);
  const { record } = benchmarkOf(benchmarkId);
  const harness = harnessRef(fact.harnessId, locale);
  return {
    id: fact.id, benchmark: benchmarkRef(benchmarkId), task: taskRefOf(benchmarkId, fact.taskId),
    model: modelRef(fact.modelId, locale), harness, attempt: fact.attempt, attemptCount: record.runsPerTask, outcome: fact.outcome,
    metrics: { steps: fact.steps, ...run.metrics, costUsd: fact.costUsd },
    input: { ...run.input, harness: { ...harness, ...run.input.harness } },
    output: run.output, grading: run.grading, ...(run.failure && { failure: run.failure }),
    timeline: timelineOf(trajectory, record.changeTools),
  };
}

/** The runs a benchmark page lists as examples, each result in its benchmark's own words. */
export function recentRunsOf(runIds: string[], locale: Locale): Promise<RecentRun[]> {
  return Promise.all(runIds.map(async runId => {
    const { benchmarkId } = recordedRunOf(runId);
    const [detail, run] = await Promise.all([runDetailOf(runId, locale), readRunRecord(benchmarkId, runId)]);
    if (!detail) {
      throw new Error(`run ${runId} has no detail`);
    }
    return {
      runId, model: detail.model, task: detail.task, outcome: detail.outcome, resultLabel: run.resultLabel[locale],
      stepCount: detail.metrics.steps, durationMinutes: detail.metrics.durationMinutes, timeline: detail.timeline,
    };
  }));
}
