import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { consoleTaskOrderValues, consoleTaskSpreadValues } from '../../api/schema';
import type { ConsoleTaskQuery, ConsoleTaskRow, TagCount, TaskOrder, TaskSpread } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { useLocale } from '../../i18n/localeContext';
import { groupedNumber } from '../../i18n/locales';
import { EVERY_CHOICE } from '../../routes/console';
import { consoleTaskPath } from '../../routes/consoleTasks';
import { Tag } from '../../ui/content';
import { SearchField, Select } from '../../ui/controls';
import { InfoHint } from '../../ui/hint';
import table from '../../ui/table.module.css';
import { EntrantDots, PassRate } from '../result/PassRate';
import styles from './TaskTable.module.css';

export function TaskFilters({ query, tags, onChange }: { query: ConsoleTaskQuery; tags: TagCount[]; onChange: (next: Partial<ConsoleTaskQuery>) => void }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <div className={styles.filters} role="search" aria-label={t('console.tasks.filters')}>
      <SearchField label={t('console.tasks.search')} value={query.q} onChange={q => onChange({ q })} className={styles.search} />
      <Select
        variant="quiet" label={t('console.tasks.tagFilter')} value={query.tag ?? EVERY_CHOICE} onChange={tag => onChange({ tag: tag === EVERY_CHOICE ? undefined : tag })}
        choices={[{ value: EVERY_CHOICE, label: t('console.tasks.everyTag') }, ...tags.map(({ tag, tasks }) => ({ value: tag, label: `${tag} · ${groupedNumber(locale, tasks)}` }))]}
      />
      <Select
        variant="quiet" label={t('console.tasks.spreadFilter')} value={query.spread ?? EVERY_CHOICE} onChange={spread => onChange({ spread: spread === EVERY_CHOICE ? undefined : spread as TaskSpread })}
        choices={[{ value: EVERY_CHOICE, label: t('console.tasks.everySpread') }, ...consoleTaskSpreadValues.map(spread => ({ value: spread, label: t(`console.tasks.spread.${spread}`) }))]}
      />
      <Select
        variant="quiet" label={t('console.tasks.orderFilter')} value={query.order} onChange={order => onChange({ order: order as TaskOrder })}
        choices={consoleTaskOrderValues.map(order => ({ value: order, label: t(`console.tasks.order.${order}`) }))}
      />
    </div>
  );
}

/** One row per task; the row opens the task. */
export function TaskTable({ benchmarkId, rows }: { benchmarkId: string; rows: ConsoleTaskRow[] }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <div className={clsx(table.table, styles.table)} role="table" aria-label={t('console.tasks.title')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">{t('console.tasks.column.task')}</span>
        <span role="columnheader">{t('console.tasks.column.tags')}</span>
        <span role="columnheader" className={table.hinted}>
          {t('console.tasks.column.entrants')}<InfoHint label={t('ui.about', { subject: t('console.tasks.column.entrants') })}>{t('console.tasks.legend')}</InfoHint>
        </span>
        <span role="columnheader">{t('console.tasks.column.passRate')}</span>
        <span role="columnheader">{t('console.tasks.column.counted')}</span>
        <span role="columnheader">{t('console.tasks.column.version')}</span>
      </div>
      {rows.map(row => {
        const to = consoleTaskPath(benchmarkId, row.id);
        return (
          <div key={row.id} className={clsx(table.row, table.link)} role="row">
            <span role="cell" className={styles.task}><LocaleLink to={to} className={clsx(table.primary, 't-label')}>{row.title}</LocaleLink><span className="t-mono c-faint">{row.id}</span></span>
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
