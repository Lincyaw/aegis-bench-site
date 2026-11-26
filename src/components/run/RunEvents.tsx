import { clsx } from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RunEvent } from '../../api/types';
import controls from '../../ui/controls.module.css';
import { AtifFields } from '../trajectory/AtifStep';
import styles from './RunEvents.module.css';

/**
 * A run's events as the API returns them: each row shows its index, kind, tool and the first line of its excerpt,
 * and opens in place to the whole record, every field under its own name; nothing is translated, renamed or regrouped.
 */
export function RunEventList({ events, onStep }: { events: RunEvent[]; onStep: (step: number) => void }) {
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
              <span className={clsx(styles.excerpt, 't-small')}>{event.excerpt.split('\n')[0]}</span>
            </button>
            {open && (
              <div className={styles.record}>
                <AtifFields record={event} />
                <button type="button" className={clsx(controls.textLink, 't-micro')} onClick={() => onStep(event.stepId)}>{t('console.run.events.inTrajectory')}</button>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
