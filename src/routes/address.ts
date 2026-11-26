import { LIST_SEPARATOR } from './comparison';

/*
 * How a page writes its state into its address: through a table of the parameters it keeps there, each with the value
 * the address leaves unsaid, so every page writes its address the same way and spells no default.
 */

/** What a page keeps under one parameter of its address: text, a number, a list of ids, or nothing. */
export type AddressValue = string | number | string[] | undefined;

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

/** A path and the parameters of its address; a path without parameters has no question mark. */
export function pathWithSearch(path: string, search: URLSearchParams): string {
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
