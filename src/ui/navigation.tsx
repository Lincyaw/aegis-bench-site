import { clsx } from 'clsx';
import { useLayoutEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LocaleLink } from '../i18n/LocaleRouting';
import { useReturnPath } from '../i18n/trail';
import { IconButton } from './controls';
import { ArrowIcon } from './icons';
import styles from './navigation.module.css';

export interface Crumb {
  label: string;

  /** Site path of the crumb; the last crumb, the current page, has none */
  to?: string;
}

/** The pages above the current one; each leads back to its page as the reader last had it, filters included. */
export function Breadcrumbs({ crumbs, className }: { crumbs: Crumb[]; className?: string }) {
  const { t } = useTranslation();
  const returnPath = useReturnPath();
  return (
    <nav className={clsx(styles.crumbs, 't-small', className)} aria-label={t('ui.breadcrumbs')}>
      {crumbs.map((crumb, index) => (
        <span key={crumb.label}>
          {index > 0 && <span className={styles.slash}>/</span>}
          {crumb.to ? <LocaleLink to={returnPath(crumb.to)}>{crumb.label}</LocaleLink> : <span aria-current="page" className="c-main">{crumb.label}</span>}
        </span>
      ))}
    </nav>
  );
}

/**
 * A row of tabs with one ∞ gradient bar under the current tab, which slides when the current tab changes. Each child
 * marks itself with `data-tab`; `current` names the child the bar sits under.
 */
export function TabRow({ current, className, children, ...attributes }: { current: string; className?: string; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  const row = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const rowElement = row.current;
    const barElement = bar.current;
    if (!rowElement || !barElement) {
      throw new Error('The tab row renders its elements before its layout effect runs');
    }
    const place = () => {
      const tab = rowElement.querySelector<HTMLElement>(`[data-tab="${CSS.escape(current)}"]`);
      barElement.style.opacity = tab ? '1' : '0';
      barElement.style.width = `${tab?.offsetWidth ?? 0}px`;
      barElement.style.transform = `translateX(${tab?.offsetLeft ?? 0}px)`;
    };
    place();
    // Tabs change width when fonts or counts arrive.
    const observer = new ResizeObserver(place);
    Array.from(rowElement.children).forEach(child => observer.observe(child));
    return () => observer.disconnect();
  }, [current]);
  return (
    <div ref={row} className={clsx(styles.tabs, className)} {...attributes}>
      {children}
      <span ref={bar} className={styles.indicator} aria-hidden="true" />
    </div>
  );
}

/**
 * A tab of a TabRow, the `current` one marked. A tab that is a link to its own address replaces the current entry of
 * the history; one that is a button belongs to a row with `role="tablist"`. `count` is the size of what it holds.
 */
export function Tab({ id, current, count, children, ...target }: { id: string; current: string; count?: number; children: ReactNode } & ({ to: string } | { onSelect: () => void })) {
  const content = <>{children}{count !== undefined && <span className={styles.count}>{count}</span>}</>;
  return 'to' in target
    ? <LocaleLink to={target.to} replace preventScrollReset data-tab={id} className={clsx(styles.tab, 't-small')} aria-current={id === current ? 'true' : undefined}>{content}</LocaleLink>
    : <button type="button" role="tab" data-tab={id} className={clsx(styles.tab, 't-small')} aria-selected={id === current} onClick={target.onSelect}>{content}</button>;
}

/** Turns a list a page back or forth, saying which items are in view; an end it has reached cannot be passed. */
export function Pager({ label, atStart, atEnd, onPrevious, onNext, className }: { label: string; atStart: boolean; atEnd: boolean; onPrevious: () => void; onNext: () => void; className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={clsx(styles.pager, className)}>
      <IconButton label={t('ui.previousPage')} disabled={atStart} onClick={onPrevious}><ArrowIcon direction="left" /></IconButton>
      <span className="t-micro c-muted">{label}</span>
      <IconButton label={t('ui.nextPage')} disabled={atEnd} onClick={onNext}><ArrowIcon direction="right" /></IconButton>
    </div>
  );
}

export interface PageSection {
  id: string;
  label: string;
}

/** The section links of the page being read and the one in view. */
export interface PageSections {
  sections: PageSection[];
  current: string;
}

/** Links to the sections of the page being read, with the one in view marked. */
export function SectionLinks({ sections, current, className }: { sections: PageSection[]; current: string; className?: string }) {
  return (
    <TabRow current={current} className={className}>
      {sections.map(section => (
        <a key={section.id} href={`#${section.id}`} data-tab={section.id} className={clsx(styles.tab, 't-small')} aria-current={section.id === current ? 'true' : undefined}>{section.label}</a>
      ))}
    </TabRow>
  );
}
