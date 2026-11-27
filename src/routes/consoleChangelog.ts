import { consoleRevisionChangeValues } from '../api/schema';
import type { ChangelogQuery } from '../api/types';
import { parseChoice, parseOffset, type AddressTable } from './address';

/** Task versions per page of the changelog. */
export const CHANGELOG_PAGE_SIZE = 25;

/** Every parameter the changelog keeps in its address, with the value the address leaves unsaid. */
export const CHANGELOG_PARAMS: AddressTable<ChangelogQuery> = { benchmark: undefined, change: undefined, offset: 0 };

/** The changelog's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseChangelogQuery(params: URLSearchParams): ChangelogQuery {
  return { benchmark: params.get('benchmark') ?? undefined, change: parseChoice(params, 'change', consoleRevisionChangeValues), offset: parseOffset(params, CHANGELOG_PAGE_SIZE) };
}
