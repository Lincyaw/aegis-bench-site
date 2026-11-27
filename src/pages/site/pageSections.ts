import { createContext, useContext } from 'react';
import type { PageSections } from '../../ui/navigation';

/** Lets a page hand its section links to the floating nav once the page's own section bar has scrolled away. */
export const PageSectionsContext = createContext<((sections: PageSections | null) => void) | null>(null);

export function useHandPageSections(): (sections: PageSections | null) => void {
  const handToNav = useContext(PageSectionsContext);
  if (!handToNav) {
    throw new Error('A page hands its sections to the nav inside the site layout');
  }
  return handToNav;
}
