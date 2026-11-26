import { createContext, useContext } from 'react';

/** The address the reader last opened at each site path during the visit, its filters and tabs included. */
export const TrailContext = createContext<Map<string, string> | null>(null);

/** Where a link back to a page leads: the address the reader last had it at, with its filters, or the page itself. */
export function useReturnPath(): (path: string) => string {
  const trail = useContext(TrailContext);
  if (!trail) {
    throw new Error('a link back to a page renders inside a locale root, which keeps the trail');
  }
  return path => trail.get(path.split(/[?#]/)[0]) ?? path;
}
