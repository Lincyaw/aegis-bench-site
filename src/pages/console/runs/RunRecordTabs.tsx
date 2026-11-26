import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRunEvents } from '../../../api/consoleClient';
import { consoleRunEventKindValues } from '../../../api/schema';
import type { ConsoleRunDetail, RunEventKind, RunEventQuery } from '../../../api/types';
import { RunEventList } from '../../../components/run/RunEvents';
import { EVERY_CHOICE } from '../../../routes/console';
import { EVENT_PAGE_SIZE } from '../../../routes/consoleRuns';
import { SearchField, Select } from '../../../ui/controls';
import { Pager } from '../../../ui/navigation';
import styles from './RunDetailPage.module.css';

/* The records behind a run that only the console shows: its trajectory's raw events. */

/** The run's trajectory as events in the order they happened, filtered by kind or text; an event opens to its record. */
export function RunEventsTab({ run, onStep }: { run: ConsoleRunDetail; onStep: (step: number) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState<RunEventQuery>({ q: '', offset: 0 });
  const page = useRunEvents(run.id, useDeferredValue(query), EVENT_PAGE_SIZE);
  const last = Math.min(query.offset + EVENT_PAGE_SIZE, page.total);
  return (
    <div className={styles.tab}>
      <div className={styles.filters}>
        <Select
          label={t('console.run.events.kindFilter')} value={query.kind ?? EVERY_CHOICE}
          onChange={kind => setQuery({ ...query, kind: kind === EVERY_CHOICE ? undefined : kind as RunEventKind, offset: 0 })}
          choices={[{ value: EVERY_CHOICE, label: t('console.run.events.everyKind') }, ...consoleRunEventKindValues.map(kind => ({ value: kind, label: kind }))]}
        />
        <SearchField label={t('console.run.events.search')} value={query.q} onChange={q => setQuery({ ...query, q, offset: 0 })} />
      </div>
      {page.items.length === 0 ? <p className="t-small c-muted">{t('console.run.events.empty')}</p> : <RunEventList events={page.items} onStep={onStep} />}
      {page.total > EVENT_PAGE_SIZE && (
        <Pager
          label={t('console.run.events.range', { from: query.offset + 1, to: last, total: page.total })} atStart={query.offset === 0} atEnd={last >= page.total}
          onPrevious={() => setQuery({ ...query, offset: query.offset - EVENT_PAGE_SIZE })} onNext={() => setQuery({ ...query, offset: query.offset + EVENT_PAGE_SIZE })}
        />
      )}
      <p className="t-micro c-faint">{t('console.run.events.note')}</p>
    </div>
  );
}
