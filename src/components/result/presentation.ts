import { failureClassValues } from '../../api/schema';
import type { Metric, ResultCounts } from '../../api/types';

/** What stands where a figure has no value, such as the pass rate of a task no run has counted. */
export const NO_VALUE = '—';

/** How a model run under a harness is named in running text, a choice or a label. */
export function combinationName(model: { name: string }, harness: { name: string }): string {
  return `${model.name} · ${harness.name}`;
}

/** How a stage of the lifecycle is named: its number and its name. */
export function stageName(stage: { id: string; name: string }): string {
  return `${stage.id} ${stage.name}`;
}

export function formatScore(score: number, metric: Metric): string {
  return metric.unit === 'percent' ? `${(score * 100).toFixed(1)}%` : score.toFixed(2);
}

/** The kinds of failure, in the order bars stack them: the classes reviews give, then the failures no review has classed. */
export const FAILURE_KINDS = [...failureClassValues, 'unreviewed'] as const;
export type FailureKind = (typeof FAILURE_KINDS)[number];

export function failureCountOf(result: ResultCounts, kind: FailureKind): number {
  switch (kind) {
    case 'modelError': return result.modelErrors;
    case 'gradingError': return result.gradingErrors;
    case 'constructionProblem': return result.constructionProblems;
    case 'unreviewed': return result.unreviewed;
  }
}

/** Steps of a chart's axis: round values from 0, about `count` of them, that cover the largest value. */
export function axisSteps(largest: number, count: number): number[] {
  const rough = largest / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map(factor => factor * magnitude).find(candidate => candidate >= rough) ?? 10 * magnitude;
  return Array.from({ length: Math.ceil(largest / step) + 1 }, (_, index) => index * step);
}

/** A share as a percentage with one decimal, such as 45.1%. */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/** An amount in US dollars to the cent. */
export function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}
