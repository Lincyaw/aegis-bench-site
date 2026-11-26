import { createContext } from 'react';
import type { PageSections } from '../../components/benchmark/SectionBar';

/** Lets a page hand its section links to the floating nav once the page's own section bar has scrolled away. */
export const PageSectionsContext = createContext<(sections: PageSections | null) => void>(() => undefined);
