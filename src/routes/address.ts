import { LIST_SEPARATOR } from './comparison';

/*
 * How a page writes its state into its address: through a table of the parameters it keeps there, each with the value
 * the address leaves unsaid, so every page writes its address the same way and spells no default.
 */

/** What a page keeps under one parameter of its address: text, a number, a list of ids, or nothing. */
export type AddressValue = string | number | boolean | string[] | undefined;

/** Every parameter a page keeps in its address, each with its default; a parameter the page may leave unset has none. */
export type AddressTable<State> = { readonly [Name in keyof Required<State>]: State[Name] };

/**
 * A page's state as the parameters of its address, through the page's table: a name the table lacks is never written,
 * and a value that is unset, an empty list or the default is left out. A list is its ids joined by commas.
 */
export function searchOf<State extends Partial<Record<keyof State, AddressValue>>>(table: AddressTable<State>, state: Partial<State>): URLSearchParams {
  const params = new URLSearchParams();
  for (const name of Object.keys(table) as (keyof State & string)[]) {
    const value: AddressValue = state[name];
    if (value !== undefined && value !== table[name] && !(Array.isArray(value) && value.length === 0)) {
      params.set(name, Array.isArray(value) ? value.join(LIST_SEPARATOR) : String(value));
    }
  }
  return params;
}

/** The choice of a filter that keeps everything; a select's choices cannot be empty, and no tag, spread, combination, outcome or review is spelt this way. */
export const EVERY_CHOICE = 'all';

/** A parameter naming one of a closed set, or nothing; a value outside the set fails the page rather than showing nothing. */
export function parseChoice<Value extends string>(params: URLSearchParams, name: string, values: readonly Value[]): Value | undefined {
  const raw = params.get(name);
  if (raw === null) {
    return undefined;
  }
  const value = values.find(candidate => candidate === raw);
  if (value === undefined) {
    throw new Error(`${name} is none of ${values.join(', ')}: ${raw}`);
  }
  return value;
}

/** The first row of a list page: a whole number of pages from 0; a list's address without one starts at the top. */
export function parseOffset(params: URLSearchParams, pageSize: number): number {
  const raw = params.get('offset') ?? '0';
  const offset = Number(raw);
  if (!Number.isInteger(offset) || offset < 0 || offset % pageSize !== 0) {
    throw new Error(`no page of ${pageSize} starts at ${raw}`);
  }
  return offset;
}

/** A step of a trajectory: ATIF numbers steps from 1, so anything else fails the page. */
export function parseStep(params: URLSearchParams): number | undefined {
  const raw = params.get('step');
  if (raw === null) {
    return undefined;
  }
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new Error(`no step ${raw}`);
  }
  return Number(raw);
}

/** What a route tells its layout: a page that fills the window below the bar scrolls inside its own panes, and the layout leaves its footer out. */
export interface RouteHandle {
  fillsWindow?: boolean;
}

/** Whether any route of the matched ones fills the window. */
export function fillsWindow(matches: { handle: unknown }[]): boolean {
  return matches.some(match => (match.handle as RouteHandle | undefined)?.fillsWindow);
}

/** A route's pattern as the router nests it: relative to the route above it, which the pattern starts with; the site's own routes sit under the empty parent. */
export function nestedRoute(parent: string, pattern: string): string {
  if (!pattern.startsWith(`${parent}/`)) {
    throw new Error(`${pattern} is not under ${parent || 'the site'}`);
  }
  return pattern.slice(parent.length + 1);
}

/** A path and the parameters of its address; a path without parameters has no question mark. */
export function pathWithSearch(path: string, search: URLSearchParams): string {
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
