import { clsx } from 'clsx';
import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleTaskPage, type ConsoleTaskQuery } from '../api/consoleClient';
import { consoleTaskOrderValues, consoleTaskSpreadValues } from '../api/schema';
import type { ConsoleTaskRow, TagCount, TaskOrder, TaskSpread } from '../api/types';
import { ConsoleHeader } from '../console/ConsoleHeader';
import { consoleBenchmarkPath } from '../console/consoleMap';
import { LocaleLink } from '../i18n/LocaleRouting';
import { useLocale, useLocalizedNavigate } from '../i18n/localeContext';
import { groupedNumber } from '../i18n/locales';
import { EntrantDots, PassRate } from '../results/PassRate';
import { Tag } from '../ui/content';
import { SearchField, Select } from '../ui/controls';
import { Pager } from '../ui/navigation';
import table from '../ui/table.module.css';
import { TASK_LIST_PAGE_SIZE, consoleTaskPath, parseTaskQuery, taskQuerySearch } from './consoleTaskQuery';
import styles from './TaskListPage.module.css';

/** The choice of a filter that keeps every task; no tag or spread is spelt this way. */
export const EVERY = 'all';

/** A benchmark's tasks, hardest first, with what each combination made of them; the filters and the page live in the address. */
export function TaskListPage() {
  const { t } = useTranslation();
  const { benchmarkId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const query = parseTaskQuery(params);
  // The page in view stays until the next one arrives.
  const page = useConsoleTaskPage(benchmark.id, parseTaskQuery(new URLSearchParams(useDeferredValue(params.toString()))), TASK_LIST_PAGE_SIZE);
  const update = (next: Partial<ConsoleTaskQuery>) => setParams(taskQuerySearch({ ...query, offset: 0, ...next }), { replace: true, preventScrollReset: true });
  const last = Math.min(query.offset + TASK_LIST_PAGE_SIZE, page.total);
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.tasks.title') }]} title={t('console.tasks.title')} lead={t('console.tasks.lead', { count: benchmark.taskCount })} />
      <TaskFilters query={query} tags={page.tags} onChange={update} />
      {page.items.length === 0 ? <p className="t-small c-muted">{t('console.tasks.empty')}</p> : <TaskTable benchmarkId={benchmark.id} rows={page.items} />}
      <footer className={styles.footer}>
        <p className="t-micro c-faint">{t('console.tasks.legend')}</p>
        {page.total > TASK_LIST_PAGE_SIZE && (
          <Pager
            label={t('console.tasks.range', { from: query.offset + 1, to: last, total: page.total })}
            atStart={query.offset === 0} atEnd={last >= page.total}
            onPrevious={() => update({ offset: query.offset - TASK_LIST_PAGE_SIZE })} onNext={() => update({ offset: query.offset + TASK_LIST_PAGE_SIZE })}
          />
        )}
      </footer>
    </div>
  );
}

export function TaskFilters({ query, tags, onChange }: { query: ConsoleTaskQuery; tags: TagCount[]; onChange: (next: Partial<ConsoleTaskQuery>) => void }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <div className={styles.filters} role="search" aria-label={t('console.tasks.filters')}>
      <SearchField label={t('console.tasks.search')} value={query.q} onChange={q => onChange({ q })} className={styles.search} />
      <Select
        label={t('console.tasks.tagFilter')} value={query.tag || EVERY} onChange={tag => onChange({ tag: tag === EVERY ? '' : tag })}
        choices={[{ value: EVERY, label: t('console.tasks.everyTag') }, ...tags.map(({ tag, tasks }) => ({ value: tag, label: `${tag} · ${groupedNumber(locale, tasks)}` }))]}
      />
      <Select
        label={t('console.tasks.spreadFilter')} value={query.spread ?? EVERY} onChange={spread => onChange({ spread: spread === EVERY ? undefined : spread as TaskSpread })}
        choices={[{ value: EVERY, label: t('console.tasks.everySpread') }, ...consoleTaskSpreadValues.map(spread => ({ value: spread, label: t(`console.tasks.spread.${spread}`) }))]}
      />
      <Select
        label={t('console.tasks.orderFilter')} value={query.order} onChange={order => onChange({ order: order as TaskOrder })}
        choices={consoleTaskOrderValues.map(order => ({ value: order, label: t(`console.tasks.order.${order}`) }))}
      />
    </div>
  );
}

/** One row per task; the row opens the task. */
export function TaskTable({ benchmarkId, rows }: { benchmarkId: string; rows: ConsoleTaskRow[] }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useLocalizedNavigate();
  return (
    <div className={clsx(table.table, styles.table)} role="table" aria-label={t('console.tasks.title')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">{t('console.tasks.column.task')}</span>
        <span role="columnheader">{t('console.tasks.column.tags')}</span>
        <span role="columnheader">{t('console.tasks.column.entrants')}</span>
        <span role="columnheader">{t('console.tasks.column.passRate')}</span>
        <span role="columnheader">{t('console.tasks.column.counted')}</span>
        <span role="columnheader">{t('console.tasks.column.version')}</span>
      </div>
      {rows.map(row => {
        const to = consoleTaskPath(benchmarkId, row.id);
        return (
          <div key={row.id} className={clsx(table.row, table.link)} role="row" onClick={event => { if (!(event.target as HTMLElement).closest('a')) { navigate(to); } }}>
            <span role="cell" className={styles.task}><LocaleLink to={to} className="t-label">{row.title}</LocaleLink><span className="t-mono c-faint">{row.id}</span></span>
            <span role="cell" className={styles.tags}>{row.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}</span>
            <span role="cell"><EntrantDots entrants={row.entrants} /></span>
            <span role="cell"><PassRate rate={row.result.passRate} /></span>
            <span role="cell" className="t-numeric c-muted">{groupedNumber(locale, row.result.passed + row.result.failed)}</span>
            <span role="cell" className="t-mono c-faint">{row.version}</span>
          </div>
        );
      })}
    </div>
  );
}
