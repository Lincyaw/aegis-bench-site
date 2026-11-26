import { clsx } from 'clsx';
import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRunEvents, type RunEventQuery } from '../../../api/consoleClient';
import { consoleRunEventKindValues } from '../../../api/schema';
import type { ConsoleRunDetail, RunEventKind } from '../../../api/types';
import { formatCost } from '../../../components/result/presentation';
import { useLocale } from '../../../i18n/localeContext';
import { dateTimeOf, groupedNumber } from '../../../i18n/locales';
import { EVERY_CHOICE } from '../../../routes/console';
import { EVENT_PAGE_SIZE } from '../../../routes/consoleRuns';
import { StatTile, StatTiles, Tag } from '../../../ui/content';
import controls from '../../../ui/controls.module.css';
import { SearchField, Select } from '../../../ui/controls';
import { Pager } from '../../../ui/navigation';
import table from '../../../ui/table.module.css';
import styles from './RunDetailPage.module.css';

/* The records behind a run that only the console shows: its trajectory's raw events, and what it consumed. */

/** The run's trajectory as events in the order they happened; a step opens in the trajectory. */
export function RunEventsTab({ run, onStep }: { run: ConsoleRunDetail; onStep: (step: number) => void }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [query, setQuery] = useState<RunEventQuery>({ q: '', offset: 0 });
  const page = useRunEvents(run.id, useDeferredValue(query), EVENT_PAGE_SIZE);
  const last = Math.min(query.offset + EVENT_PAGE_SIZE, page.total);
  return (
    <div className={styles.tab}>
      <div className={styles.filters}>
        <Select
          label={t('console.run.events.kindFilter')} value={query.kind ?? EVERY_CHOICE}
          onChange={kind => setQuery({ ...query, kind: kind === EVERY_CHOICE ? undefined : kind as RunEventKind, offset: 0 })}
          choices={[{ value: EVERY_CHOICE, label: t('console.run.events.everyKind') }, ...consoleRunEventKindValues.map(kind => ({ value: kind, label: t(`console.run.events.kind.${kind}`) }))]}
        />
        <SearchField label={t('console.run.events.search')} value={query.q} onChange={q => setQuery({ ...query, q, offset: 0 })} />
      </div>
      {page.items.length === 0 ? <p className="t-small c-muted">{t('console.run.events.empty')}</p> : (
        <ol className={styles.events}>
          {page.items.map(event => (
            <li key={event.index} className={clsx(styles.event, event.kind === 'error' && styles.failedEvent)}>
              <span className="t-mono c-faint">{event.index}</span>
              <button type="button" className={clsx(controls.textLink, 't-micro')} onClick={() => onStep(event.stepId)}>{t('console.run.events.step', { step: event.stepId })}</button>
              <Tag dashed={event.kind === 'error'}>{t(`console.run.events.kind.${event.kind}`)}</Tag>
              <span className={clsx(styles.excerpt, 't-small')}>{event.excerpt}</span>
              <span className="t-mono c-faint">{dateTimeOf(locale, event.at)}</span>
            </li>
          ))}
        </ol>
      )}
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

/** What the run consumed: tokens, cost and calls, and how often it called each tool. */
export function RunUsageTab({ run }: { run: ConsoleRunDetail }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { usage } = run;
  return (
    <div className={styles.tab}>
      <StatTiles>
        <StatTile label={t('console.run.usage.inputTokens')} value={groupedNumber(locale, usage.inputTokens)} note={`${t('console.run.usage.cachedTokens')} ${groupedNumber(locale, usage.cachedTokens)}`} />
        <StatTile label={t('console.run.usage.outputTokens')} value={groupedNumber(locale, usage.outputTokens)} />
        <StatTile label={t('console.run.usage.cost')} value={formatCost(usage.costUsd)} />
        <StatTile label={t('console.run.usage.modelCalls')} value={groupedNumber(locale, usage.modelCalls)} />
      </StatTiles>
      <section className={styles.tab}>
        <h2 className="t-heading">{t('console.run.usage.tools')}</h2>
        <div className={clsx(table.table, styles.tools)} role="table" aria-label={t('console.run.usage.tools')}>
          <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
            <span role="columnheader">{t('console.run.usage.column.tool')}</span>
            <span role="columnheader">{t('console.run.usage.column.calls')}</span>
            <span role="columnheader">{t('console.run.usage.column.failures')}</span>
          </div>
          {usage.toolCalls.map(tool => (
            <div key={tool.tool} className={table.row} role="row">
              <span role="cell" className="t-mono">{tool.tool}</span>
              <span role="cell" className="t-numeric">{tool.calls}</span>
              <span role="cell" className={clsx('t-numeric', tool.failures > 0 ? 'c-bad' : 'c-faint')}>{tool.failures}</span>
            </div>
          ))}
        </div>
      </section>
      <p className="t-micro c-faint">{t('console.run.usage.note')}</p>
    </div>
  );
}
