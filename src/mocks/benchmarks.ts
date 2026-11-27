import type { BenchmarkDetail, BenchmarkRef, BenchmarkSummary, LeaderboardEntry, LeaderboardView, Locale, Stage, TaskRecord, TaskRef } from '../api/types';
import { stageRef } from './catalog';
import { openedIndexes, type BenchmarkIndexes } from './records';

export function hasBenchmark(benchmarkId: string): boolean {
  return openedIndexes().benchmarks.some(benchmark => benchmark.record.id === benchmarkId);
}

/** A benchmark's record, tasks, runs, hunts and releases. */
export function benchmarkOf(benchmarkId: string): BenchmarkIndexes {
  const benchmark = openedIndexes().benchmarks.find(candidate => candidate.record.id === benchmarkId);
  if (!benchmark) {
    throw new Error(`unknown benchmark ${benchmarkId}`);
  }
  return benchmark;
}

export function benchmarkRef(benchmarkId: string): BenchmarkRef {
  const { id, name, shortName } = benchmarkOf(benchmarkId).record;
  return { id, name, shortName };
}

export function taskOf(benchmarkId: string, taskId: string): TaskRecord | undefined {
  return benchmarkOf(benchmarkId).tasks.find(task => task.id === taskId);
}

/** The id and title of a task a run or a hunt names, which the benchmark has. */
export function taskRefOf(benchmarkId: string, taskId: string): TaskRef {
  const task = taskOf(benchmarkId, taskId);
  if (!task) {
    throw new Error(`${benchmarkId} has no task ${taskId}`);
  }
  return { id: task.id, title: task.title };
}

/** Whether a task's id or title holds the search text; every task matches an empty search. */
export function matchesTaskSearch(task: TaskRef, q: string): boolean {
  return !q || task.id.includes(q) || task.title.includes(q);
}

/** The eight stages, each with the benchmarks published at it. */
export function stagesWithBenchmarks(locale: Locale): Stage[] {
  const { catalog, benchmarks } = openedIndexes();
  return catalog.stages.map(stage => ({
    ...stageRef(stage.id, locale),
    summary: stage.summary[locale],
    benchmarks: benchmarks.filter(benchmark => benchmark.record.stageId === stage.id).map(benchmark => benchmarkRef(benchmark.record.id)),
  }));
}

/** The combination view, or each model's (or harness's) best combination, re-ranked. */
export function leaderboardView(entries: LeaderboardEntry[], view: LeaderboardView): LeaderboardEntry[] {
  if (view === 'combination') {
    return entries;
  }
  const groupOf = (entry: LeaderboardEntry) => (view === 'model' ? entry.model.id : entry.harness.id);
  const best = entries.filter((entry, index) => entries.findIndex(other => groupOf(other) === groupOf(entry)) === index);
  return best.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/** What the public site shows of a benchmark beyond its record: its summary and its ranked combinations. */
export interface BenchmarkShowing {
  summary: string;
  entries: LeaderboardEntry[];
}

export function benchmarkSummary(benchmarkId: string, showing: BenchmarkShowing, locale: Locale): BenchmarkSummary {
  const { record, tasks } = benchmarkOf(benchmarkId);
  return {
    ...benchmarkRef(benchmarkId), version: record.version, stage: stageRef(record.stageId, locale), summary: showing.summary,
    taskCount: tasks.length, combinationCount: showing.entries.length, runsPerTask: record.runsPerTask,
    metric: { ...record.metric, name: record.metric.name[locale] }, updatedOn: record.updatedOn,
    topThree: showing.entries.slice(0, 3),
  };
}

export function benchmarkDetail(benchmarkId: string, showing: BenchmarkShowing, locale: Locale): BenchmarkDetail {
  const { action, change, submitPassed, submitFailed } = benchmarkOf(benchmarkId).record.timelineLegend;
  return {
    ...benchmarkSummary(benchmarkId, showing, locale), topFive: showing.entries.slice(0, 5),
    timelineLegend: { action: action[locale], change: change[locale], submitPassed: submitPassed[locale], submitFailed: submitFailed[locale] },
  };
}
