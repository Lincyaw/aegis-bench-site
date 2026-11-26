import { consoleHuntVerdictValues } from '../api/schema';
import type { HuntTrialQuery, HuntVerdict } from '../api/types';
import { pathWithSearch, searchOf, type AddressTable } from './address';
import { consoleBenchmarkPath } from './console';

/** Trials per page of a hunt's trial list. */
export const HUNT_TRIAL_PAGE_SIZE = 25;

/** Every parameter a hunt's trial list keeps in its address, with the value the address leaves unsaid. */
export const HUNT_TRIAL_PARAMS: AddressTable<HuntTrialQuery> = { facet: undefined, verdict: undefined, offset: 0 };

/** The trial list's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseHuntTrialQuery(params: URLSearchParams): HuntTrialQuery {
  const verdict = params.get('verdict') ?? undefined;
  const offset = Number(params.get('offset') ?? HUNT_TRIAL_PARAMS.offset);
  if (verdict !== undefined && !consoleHuntVerdictValues.includes(verdict as HuntVerdict)) {
    throw new Error(`no hunt verdict ${verdict}`);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset % HUNT_TRIAL_PAGE_SIZE !== 0) {
    throw new Error(`no page of trials starts at ${params.get('offset')}`);
  }
  return { facet: params.get('facet') ?? undefined, verdict: verdict as HuntVerdict | undefined, offset };
}

export function analysisPath(benchmarkId: string): string {
  return `${consoleBenchmarkPath(benchmarkId)}/analysis`;
}

export function huntPath(benchmarkId: string, huntId: string, query: Partial<HuntTrialQuery> = {}): string {
  return pathWithSearch(`${analysisPath(benchmarkId)}/${huntId}`, searchOf(HUNT_TRIAL_PARAMS, query));
}
