import { clsx } from 'clsx';
import { useRef, type ComponentProps, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LocaleLink } from '../i18n/LocaleRouting';
import { CopyButton } from '../ui/controls';
import { Tag } from '../ui/content';
import { CITATION_ANCHOR } from './library';
import content from '../ui/content.module.css';
import styles from './blocks.module.css';

/** Blocks an editor writes in a document; each lays out its children the site's way. */

/** Numbered steps along a line, such as what an agent receives, how it works and what it submits. */
export function Flow({ children }: { children: ReactNode }) {
  return <ol className={styles.flow}>{children}</ol>;
}

export function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className={styles.step}>
      <span className={styles.stepLine} aria-hidden="true" />
      <h3>{title}</h3>
      <div>{children}</div>
    </li>
  );
}

/** A public task quoted as its text, with its id and title. */
export function Sample({ task, title, children }: { task: string; title: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className={clsx(content.panel, styles.sample)}>
      <p className={styles.sampleHead}><Tag>{t('articles.sample')}</Tag><span className="t-mono c-faint">{task}</span><span className="t-micro c-muted">{title}</span></p>
      <div className="t-small">{children}</div>
    </div>
  );
}

/** Labelled conditions in two-column rows. */
export function Facts({ children }: { children: ReactNode }) {
  return <dl className={styles.facts}>{children}</dl>;
}

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="t-micro c-faint">{label}</dt><dd className="t-small">{children}</dd></div>;
}

export function Versions({ children }: { children: ReactNode }) {
  return <ol className={styles.versions}>{children}</ol>;
}

export function Version({ tag, date, children }: { tag: string; date: string; children: ReactNode }) {
  return <li><span className="t-label">{tag}</span><span className="t-mono c-faint">{date}</span><span className="t-small c-muted">{children}</span></li>;
}

/** Questions that open to their answers; the first is open. */
export function Faq({ children }: { children: ReactNode }) {
  return <div className={styles.faq}>{children}</div>;
}

export function Question({ title, open = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  return <details open={open}><summary>{title}</summary><div>{children}</div></details>;
}

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

/** A remark set apart from the running text. */
export function Callout({ children }: { children: ReactNode }) {
  return <aside className={clsx(content.panel, styles.callout, 't-small')}>{children}</aside>;
}

/** A link in a document: a site path stays in the reader's language, any other address opens in a new tab. */
export function DocumentLink({ href = '', children, ...props }: ComponentProps<'a'>) {
  return href.startsWith('/')
    ? <LocaleLink to={href} {...props}>{children}</LocaleLink>
    : <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>;
}
