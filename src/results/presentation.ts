import type { ResultCounts } from '../api/types';

/** The kinds of failure, in the order bars stack them: the classes reviews give, then the failures no review has classed. */
export const FAILURE_KINDS = ['modelError', 'gradingError', 'constructionProblem', 'unreviewed'] as const;
export type FailureKind = (typeof FAILURE_KINDS)[number];

export function failureCountOf(result: ResultCounts, kind: FailureKind): number {
  switch (kind) {
    case 'modelError': return result.modelErrors;
    case 'gradingError': return result.gradingErrors;
    case 'constructionProblem': return result.constructionProblems;
    case 'unreviewed': return result.unreviewed;
  }
}

/** A share as a percentage with one decimal, such as 45.1%. */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/** An amount in US dollars to the cent. */
export function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}
