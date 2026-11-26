import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { combinationKey } from '../../api/constraints';
import { consoleReviewFilterValues, runOutcomeValues } from '../../api/schema';
import type { ConsoleBenchmark, ConsoleRunQuery, ReviewFilter, RunOutcome, RunRow } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { useLocale } from '../../i18n/localeContext';
import { dateTimeOf, groupedNumber } from '../../i18n/locales';
import { EVERY_CHOICE } from '../../routes/console';
import { consoleRunPath } from '../../routes/consoleRuns';
import { SearchField, Select } from '../../ui/controls';
import table from '../../ui/table.module.css';
import { ModelLabel } from '../model/ModelBadge';
import { FailureClassTag } from '../result/FailureClassTag';
import { formatCost } from '../result/presentation';
import { OutcomeBadge } from './Outcome';
import styles from './RunTable.module.css';

/**
 * The run list's search and filters, then `children`, the chips that let go of what the list keeps to. A list that
 * keeps to no combination chooses one here; one that keeps to some shows them among its chips instead.
 */
export function RunFilters({ benchmark, query, onChange, children }: { benchmark: ConsoleBenchmark; query: ConsoleRunQuery; onChange: (next: Partial<ConsoleRunQuery>) => void; children: ReactNode }) {
  const { t } = useTranslation();
  const keyed = new Map(benchmark.entrants.map(entrant => [combinationKey(entrant.model.id, entrant.harness.id), entrant]));
  const choose = (key: string) => {
    const entrant = keyed.get(key);
    if (!entrant) {
      throw new Error(`${benchmark.id} has no combination ${key}`);
    }
    onChange({ model: entrant.model.id, harness: entrant.harness.id });
  };
  return (
    <div className={styles.filters} role="search" aria-label={t('console.runs.filters')}>
      <SearchField label={t('console.runs.search')} value={query.q} onChange={q => onChange({ q })} className={styles.search} />
      {query.model === undefined && (
        <Select
          label={t('console.runs.combinationFilter')} value={EVERY_CHOICE} onChange={choose}
          choices={[
            { value: EVERY_CHOICE, label: t('console.runs.everyCombination') },
            ...[...keyed].map(([key, { model, harness }]) => ({ value: key, label: `${model.name} · ${harness.name}` })),
          ]}
        />
      )}
      <Select
        label={t('console.runs.outcomeFilter')} value={query.outcome ?? EVERY_CHOICE} onChange={outcome => onChange({ outcome: outcome === EVERY_CHOICE ? undefined : outcome as RunOutcome })}
        choices={[{ value: EVERY_CHOICE, label: t('console.runs.everyOutcome') }, ...runOutcomeValues.map(outcome => ({ value: outcome, label: t(`runs.outcome.${outcome}`) }))]}
      />
      <Select
        label={t('console.runs.reviewFilter')} value={query.review ?? EVERY_CHOICE} onChange={review => onChange({ review: review === EVERY_CHOICE ? undefined : review as ReviewFilter })}
        choices={[{ value: EVERY_CHOICE, label: t('console.runs.everyReview') }, ...consoleReviewFilterValues.map(review => ({ value: review, label: t(`console.runs.review.${review}`) }))]}
      />
      {children}
    </div>
  );
}

/** One row per run; the row opens the run. */
export function RunTable({ benchmarkId, rows }: { benchmarkId: string; rows: RunRow[] }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <div className={clsx(table.table, styles.table)} role="table" aria-label={t('console.runs.title')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">{t('console.runs.column.task')}</span>
        <span role="columnheader">{t('console.runs.column.entrant')}</span>
        <span role="columnheader">{t('console.runs.column.outcome')}</span>
        <span role="columnheader">{t('console.runs.column.review')}</span>
        <span role="columnheader">{t('console.runs.column.steps')}</span>
        <span role="columnheader">{t('console.runs.column.cost')}</span>
        <span role="columnheader">{t('console.runs.column.finishedAt')}</span>
      </div>
      {rows.map(run => {
        const to = consoleRunPath(benchmarkId, run.id);
        return (
          <div key={run.id} className={clsx(table.row, table.link)} role="row">
            <span role="cell" className={styles.task}><LocaleLink to={to} className={clsx(table.primary, 't-label')}>{run.task.title}</LocaleLink><span className="t-mono c-faint">{run.task.id} · {run.taskVersion}</span></span>
            <span role="cell" className={styles.entrant}>
              <ModelLabel model={run.model} />
              <span className="t-small c-muted">{run.harness.name} · {t('console.runs.attempt', { attempt: run.attempt })}</span>
            </span>
            <span role="cell"><OutcomeBadge outcome={run.outcome} /></span>
            <span role="cell">{run.outcome === 'failed' && <FailureClassTag failureClass={run.failureClass} />}</span>
            <span role="cell" className="t-numeric c-muted">{groupedNumber(locale, run.steps)}</span>
            <span role="cell" className="t-numeric c-muted">{formatCost(run.costUsd)}</span>
            <span role="cell" className="t-mono c-faint">{dateTimeOf(locale, run.finishedAt)}</span>
          </div>
        );
      })}
    </div>
  );
}
