import { consoleHuntVerdictValues } from '../api/schema';
import type { HuntTrialQuery, HuntVerdict } from '../api/types';
import { consoleBenchmarkPath } from './console';

/** Trials per page of a hunt's trial list. */
export const HUNT_TRIAL_PAGE_SIZE = 25;

/** The trial list's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseHuntTrialQuery(params: URLSearchParams): HuntTrialQuery {
  const verdict = params.get('verdict') ?? undefined;
  const offset = Number(params.get('offset') ?? 0);
  if (verdict !== undefined && !consoleHuntVerdictValues.includes(verdict as HuntVerdict)) {
    throw new Error(`no hunt verdict ${verdict}`);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset % HUNT_TRIAL_PAGE_SIZE !== 0) {
    throw new Error(`no page of trials starts at ${params.get('offset')}`);
  }
  return { facet: params.get('facet') ?? '', verdict: verdict as HuntVerdict | undefined, offset };
}

/** The trial list's address parameters, leaving out what is unset; an offset of 0 is the first page and goes unsaid. */
export function huntTrialSearch(query: Partial<HuntTrialQuery>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query) as [string, string | number | undefined][]) {
    if (value !== undefined && value !== '' && value !== 0) {
      params.set(name, String(value));
    }
  }
  return params;
}

export function analysisPath(benchmarkId: string): string {
  return `${consoleBenchmarkPath(benchmarkId)}/analysis`;
}

export function huntPath(benchmarkId: string, huntId: string, query: Partial<HuntTrialQuery> = {}): string {
  const search = huntTrialSearch(query).toString();
  return `${analysisPath(benchmarkId)}/${huntId}${search ? `?${search}` : ''}`;
}
