import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CopyButton } from '../../ui/controls';
import styles from './Citation.module.css';

/** The anchor of a citation, which a page's head can link to. */
export const CITATION_ANCHOR = 'cite';

/** A citation the reader can copy; its child is the BibTeX code block. */
export function Citation({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const entry = useRef<HTMLDivElement>(null);
  const entryText = () => {
    if (!entry.current) {
      throw new Error('The citation is not rendered');
    }
    return entry.current.textContent;
  };
  return (
    <div className={styles.citation} id={CITATION_ANCHOR}>
      <div ref={entry}>{children}</div>
      <CopyButton label={t('ui.copyBibtex')} text={entryText} />
    </div>
  );
}
