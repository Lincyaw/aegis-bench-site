import { consoleHuntVerdictValues } from '../api/schema';
import type { HuntTrialQuery } from '../api/types';
import { parseChoice, parseOffset, pathWithSearch, searchOf, type AddressTable } from './address';
import { benchmarkSectionPath } from './console';

/** Trials per page of a hunt's trial list. */
export const HUNT_TRIAL_PAGE_SIZE = 25;

/** Every parameter a hunt's trial list keeps in its address, with the value the address leaves unsaid. */
export const HUNT_TRIAL_PARAMS: AddressTable<HuntTrialQuery> = { facet: undefined, verdict: undefined, offset: 0 };

/** The trial list's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseHuntTrialQuery(params: URLSearchParams): HuntTrialQuery {
  return { facet: params.get('facet') ?? undefined, verdict: parseChoice(params, 'verdict', consoleHuntVerdictValues), offset: parseOffset(params, HUNT_TRIAL_PAGE_SIZE) };
}

export function analysisPath(benchmarkId: string): string {
  return benchmarkSectionPath(benchmarkId, 'analysis');
}

export function huntPath(benchmarkId: string, huntId: string, query: Partial<HuntTrialQuery> = {}): string {
  return pathWithSearch(`${analysisPath(benchmarkId)}/${huntId}`, searchOf(HUNT_TRIAL_PARAMS, query));
}
