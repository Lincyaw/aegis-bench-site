import { consoleRevisionChangeValues } from '../api/schema';
import type { ChangelogQuery, RevisionChange } from '../api/types';
import type { AddressTable } from './address';

/** Task versions per page of the changelog. */
export const CHANGELOG_PAGE_SIZE = 25;

/** Every parameter the changelog keeps in its address, with the value the address leaves unsaid. */
export const CHANGELOG_PARAMS: AddressTable<ChangelogQuery> = { benchmark: undefined, change: undefined, offset: 0 };

/** The changelog's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseChangelogQuery(params: URLSearchParams): ChangelogQuery {
  const change = params.get('change') ?? undefined;
  const offset = Number(params.get('offset') ?? CHANGELOG_PARAMS.offset);
  if (change !== undefined && !consoleRevisionChangeValues.includes(change as RevisionChange)) {
    throw new Error(`no change of a task is called ${change}`);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset % CHANGELOG_PAGE_SIZE !== 0) {
    throw new Error(`no page of the changelog starts at ${params.get('offset')}`);
  }
  return { benchmark: params.get('benchmark') ?? undefined, change: change as RevisionChange | undefined, offset };
}
