import { clsx } from 'clsx';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LocaleLink } from '../i18n/LocaleRouting';
import { Tag } from '../ui/content';
import { InfoHint } from '../ui/hint';
import { MinusIcon, PlusIcon } from '../ui/icons';
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
  return <details open={open}><summary>{title}<PlusIcon /><MinusIcon /></summary><div>{children}</div></details>;
}

/**
 * What explains a section, such as how its part of the evaluation works, written into the section's heading as
 * `## Title<About text="…" />` and kept behind an ⓘ beside the title. The text is an attribute so the section's anchor
 * and its name in the section links are the title alone.
 */
export function About({ text }: { text: string }) {
  const { t } = useTranslation();
  return <span className={styles.about}><InfoHint label={t('articles.aboutSection')}>{text}</InfoHint></span>;
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
