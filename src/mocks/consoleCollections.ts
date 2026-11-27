import type { CollectionModelResult, CollectionSummary, Locale, MatrixRow, ModelRef, TaskOrder, TaskRecord } from '../api/types';
import { benchmarkOf, hasBenchmark } from './benchmarks';
import { modelResultsOver } from './consoleModels';
import { runFactsByTask, sortedTasks, tagCountsOf, taskResultCountsOf } from './consoleTasks';
import { isCounted, resultCountsOf } from './results';

/*
 * Collections: the tasks of a benchmark that carry one tag, compared across models. Nothing about a collection is
 * stored; it is read from the tasks' tags and their runs.
 */

export function hasCollection(benchmarkId: string, tag: string): boolean {
  return hasBenchmark(benchmarkId) && benchmarkOf(benchmarkId).tasks.some(task => task.tags.includes(tag));
}

export function collectionTasksOf(benchmarkId: string, tag: string): TaskRecord[] {
  return benchmarkOf(benchmarkId).tasks.filter(task => task.tags.includes(tag));
}

/** The runs of every model on a collection's tasks. */
export function collectionFactsOf(benchmarkId: string, tag: string) {
  const facts = runFactsByTask(benchmarkId);
  return collectionTasksOf(benchmarkId, tag).flatMap(task => facts.get(task.id) ?? []);
}

/** One collection per tag, the largest first. */
export function collectionsOf(benchmarkId: string): CollectionSummary[] {
  return tagCountsOf(benchmarkId).map(({ tag, tasks }) => ({ tag, taskCount: tasks, result: resultCountsOf(collectionFactsOf(benchmarkId, tag)) }));
}

/** Every model on a collection, best pass rate first, each marked when no other passes more often for less. */
export function collectionModelsOf(benchmarkId: string, tag: string, locale: Locale): CollectionModelResult[] {
  const models = modelResultsOver(benchmarkId, collectionFactsOf(benchmarkId, tag), locale);
  return models.map(entry => {
    const { passRate, meanCostUsd } = entry.result;
    const dominated = passRate === undefined || meanCostUsd === undefined || models.some(({ result: other }) => other !== entry.result
      && other.passRate !== undefined && other.meanCostUsd !== undefined
      && other.passRate >= passRate && other.meanCostUsd <= meanCostUsd && (other.passRate > passRate || other.meanCostUsd < meanCostUsd));
    return { ...entry, onCostFrontier: !dominated };
  });
}

/** A collection's tasks in the order asked for, each against every model, and the models in their order. */
export function matrixOf(benchmarkId: string, tag: string, order: TaskOrder, locale: Locale): { models: ModelRef[]; rows: MatrixRow[] } {
  const models = collectionModelsOf(benchmarkId, tag, locale).map(entry => entry.model);
  const facts = runFactsByTask(benchmarkId);
  const tasks = sortedTasks(collectionTasksOf(benchmarkId, tag), order, task => task.id, task => taskResultCountsOf(benchmarkId, task.id).passRate);
  return {
    models,
    rows: tasks.map(task => {
      const counted = (facts.get(task.id) ?? []).filter(isCounted);
      return {
        task: { id: task.id, title: task.title },
        cells: models.map(model => {
          const runs = counted.filter(fact => fact.modelId === model.id);
          const passed = runs.filter(fact => fact.outcome === 'passed').length;
          return { passed, counted: runs.length, ...(runs.length > 0 && { passRate: passed / runs.length }) };
        }),
      };
    }),
  };
}
