import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useRunEvent, useRunEvents } from '../../../api/consoleClient';
import { consoleRunEventKindValues } from '../../../api/schema';
import type { ConsoleRunDetail } from '../../../api/types';
import { RunEventList, type RunEventSource } from '../../../components/run/RunEvents';
import { EVERY_CHOICE } from '../../../routes/address';
import { EVENT_PAGE_SIZE, type ConsoleRunView } from '../../../routes/consoleRuns';
import { SearchField, Select } from '../../../ui/controls';
import { InfoHint } from '../../../ui/hint';
import { Pager } from '../../../ui/navigation';
import styles from './RunDetailPage.module.css';

/**
 * The run's trajectory as events in the order they happened, filtered by kind or text; an event opens to its whole
 * record. The filter and the page are the run's address, so leaving the tab and coming back finds them as they were.
 */
export function RunEventsTab({ run, view, onView, onStep }: { run: ConsoleRunDetail; view: ConsoleRunView; onView: (view: Partial<ConsoleRunView>) => void; onStep: (step: number) => void }) {
  const { t } = useTranslation();
  // The page in view stays until the next one arrives.
  const page = useRunEvents(run.id, { kind: useDeferredValue(view.kind), q: useDeferredValue(view.q), offset: useDeferredValue(view.offset) }, EVENT_PAGE_SIZE);
  const source: RunEventSource = { useEvent: index => useRunEvent(run.id, index) };
  const last = Math.min(view.offset + EVENT_PAGE_SIZE, page.total);
  return (
    <div className={styles.tab}>
      <div className={styles.filters}>
        <Select
          variant="quiet" label={t('console.run.events.kindFilter')} value={view.kind ?? EVERY_CHOICE}
          onChange={kind => onView({ ...view, kind: kind === EVERY_CHOICE ? undefined : consoleRunEventKindValues.find(candidate => candidate === kind), offset: 0 })}
          choices={[{ value: EVERY_CHOICE, label: t('console.run.events.everyKind') }, ...consoleRunEventKindValues.map(kind => ({ value: kind, label: kind }))]}
        />
        <SearchField label={t('console.run.events.search')} value={view.q} onChange={q => onView({ ...view, q, offset: 0 })} />
        <InfoHint label={t('ui.about', { subject: t('console.run.tab.events') })}>{t('console.run.events.note')}</InfoHint>
      </div>
      {page.items.length === 0 ? <p className="t-small c-muted">{t('console.run.events.empty')}</p> : <RunEventList events={page.items} source={source} onStep={onStep} />}
      {page.total > EVENT_PAGE_SIZE && (
        <Pager
          label={t('console.run.events.range', { from: view.offset + 1, to: last, total: page.total })} atStart={view.offset === 0} atEnd={last >= page.total}
          onPrevious={() => onView({ ...view, offset: view.offset - EVENT_PAGE_SIZE })} onNext={() => onView({ ...view, offset: view.offset + EVENT_PAGE_SIZE })}
        />
      )}
    </div>
  );
}
