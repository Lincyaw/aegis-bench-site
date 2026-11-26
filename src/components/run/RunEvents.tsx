import { clsx } from 'clsx';
import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RunEvent, RunEventRow } from '../../api/types';
import { Loading } from '../../ui/content';
import controls from '../../ui/controls.module.css';
import { AtifFields } from '../trajectory/AtifStep';
import { HuggingFaceBoundary } from './HuggingFace';
import styles from './RunEvents.module.css';

/**
 * A run's events as the API lists them: each row shows its index, kind, tool and excerpt, and opens in place to the
 * whole event, which `useEvent` reads by its index; every field shows under its own name, and nothing is translated,
 * renamed or regrouped.
 */
export function RunEventList({ events, useEvent, onStep }: { events: RunEventRow[]; useEvent: (index: number) => RunEvent; onStep: (step: number) => void }) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState<number>();
  return (
    <ol className={styles.events}>
      {events.map(event => {
        const open = event.index === opened;
        return (
          <li key={event.index} className={clsx(styles.event, event.kind === 'error' && styles.failed)}>
            <button type="button" className={styles.head} onClick={() => setOpened(open ? undefined : event.index)} aria-expanded={open}>
              <span className={clsx(styles.index, 't-mono c-faint')}>{event.index}</span>
              <span className="t-mono c-muted">{event.kind}</span>
              {event.tool && <span className="t-mono">{event.tool}</span>}
              <span className={clsx(styles.excerpt, 't-small')}>{event.excerpt}</span>
            </button>
            {open && (
              <div className={styles.record}>
                <HuggingFaceBoundary resetKey={String(event.index)}>
                  <Suspense fallback={<Loading />}>
                    <RunEventFields useEvent={useEvent} index={event.index} />
                  </Suspense>
                </HuggingFaceBoundary>
                <button type="button" className={clsx(controls.textLink, 't-micro')} onClick={() => onStep(event.stepId)}>{t('console.run.events.inTrajectory')}</button>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** One event as the API returns it, its record nested as the trajectory records it. */
export function RunEventFields({ useEvent, index }: { useEvent: (index: number) => RunEvent; index: number }) {
  return <AtifFields record={useEvent(index)} />;
}
