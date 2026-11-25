import type { ChangelogQuery } from '../api/consoleClient';
import { consoleRevisionChangeValues } from '../api/schema';
import type { RevisionChange } from '../api/types';

/** Task versions per page of the changelog. */
export const CHANGELOG_PAGE_SIZE = 25;

/** The changelog's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseChangelogQuery(params: URLSearchParams): ChangelogQuery {
  const change = params.get('change') ?? undefined;
  const offset = Number(params.get('offset') ?? 0);
  if (change !== undefined && !consoleRevisionChangeValues.includes(change as RevisionChange)) {
    throw new Error(`no change of a task is called ${change}`);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset % CHANGELOG_PAGE_SIZE !== 0) {
    throw new Error(`no page of the changelog starts at ${params.get('offset')}`);
  }
  return { benchmarkId: params.get('benchmark') ?? '', change: change as RevisionChange | undefined, offset };
}

/** The changelog's address parameters, leaving out what equals the default. */
export function changelogQuerySearch(query: ChangelogQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.benchmarkId) {
    params.set('benchmark', query.benchmarkId);
  }
  if (query.change) {
    params.set('change', query.change);
  }
  if (query.offset > 0) {
    params.set('offset', String(query.offset));
  }
  return params;
}
