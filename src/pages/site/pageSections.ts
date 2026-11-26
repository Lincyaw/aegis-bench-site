import { createContext } from 'react';
import type { PageSection } from '../../ui/navigation';

/** The section links of the page being read and the one in view. */
export interface PageSections {
  sections: PageSection[];
  current: string;
}

/** Lets a page hand its section links to the floating nav once the page's own section bar has scrolled away. */
export const PageSectionsContext = createContext<(sections: PageSections | null) => void>(() => undefined);
