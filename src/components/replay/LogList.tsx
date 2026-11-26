import { clsx } from 'clsx';
import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LogEntry } from '../../api/types';
import { clockTime } from './panel';
import styles from './LogList.module.css';

/**
 * Log entries in the order they were written, as the world recorded them. A rule marks the current step's moment and
 * the list scrolls to it; entries after it are faded. An entry with a stack opens to its frames, innermost last, and a
 * frame in a file the world holds goes to that file.
 */
export function LogList({ entries, moment, onSelect }: { entries: LogEntry[]; moment: number | undefined; onSelect: (node: string) => void }) {
  const { t } = useTranslation();
  const list = useRef<HTMLOListElement>(null);
  const rule = useRef<HTMLLIElement>(null);
  const [open, setOpen] = useState<string[]>([]);
  const firstLater = moment === undefined ? -1 : entries.findIndex(entry => Date.parse(entry.at) > moment);
  useLayoutEffect(() => {
    const [box, marker] = [list.current, rule.current];
    if (box && marker) {
      box.scrollTop = marker.offsetTop - box.clientHeight / 2;
    }
  }, [moment]);
  return (
    <ol ref={list} className={styles.list}>
      {entries.map((entry, index) => {
        const expanded = open.includes(entry.id);
        const later = moment !== undefined && Date.parse(entry.at) > moment;
        return (
          <Fragment key={entry.id}>
            {index === firstLater && <li ref={rule} className={styles.rule} aria-hidden="true" title={t('console.replay.panel.now')} />}
            <li className={styles.entry} data-later={later ? '' : undefined}>
              <div className={styles.line}>
                <span className="t-mono c-faint">{clockTime(Date.parse(entry.at))}</span>
                <span className={clsx(styles.level, 't-mono')} data-level={entry.level}>{entry.level}</span>
                <span className={clsx(styles.message, 't-mono')}>{entry.message}</span>
                {entry.stack && (
                  <button
                    type="button" className={clsx(styles.toggle, 't-micro')} aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? open.filter(id => id !== entry.id) : [...open, entry.id])}
                  >
                    {t('console.replay.panel.stack', { count: entry.stack.length })}
                  </button>
                )}
              </div>
              {expanded && entry.stack && (
                <ol className={styles.frames}>
                  {entry.stack.map(({ function: name, file, line, node }, depth) => (
                    <li key={`${file}:${line}:${depth}`} className="t-mono">
                      <span className="c-muted">{name}</span>{' '}
                      {node === undefined
                        ? <span>{file}:{line}</span>
                        : <button type="button" className={styles.frame} onClick={() => onSelect(node)}>{file}:{line}</button>}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          </Fragment>
        );
      })}
      {firstLater < 0 && moment !== undefined && <li ref={rule} className={styles.rule} aria-hidden="true" title={t('console.replay.panel.now')} />}
    </ol>
  );
}
