import { clsx } from 'clsx';
import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleRunPage, type ConsoleRunQuery } from '../../../api/consoleClient';
import { consoleReviewFilterValues, runOutcomeValues } from '../../../api/schema';
import type { ConsoleBenchmark, ReviewFilter, RunOutcome, RunRow } from '../../../api/types';
import { ModelLabel } from '../../../components/model/ModelBadge';
import { FailureClassTag } from '../../../components/result/FailureClassTag';
import { formatCost } from '../../../components/result/presentation';
import { OutcomeBadge } from '../../../components/run/Outcome';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { useLocale, useLocalizedNavigate } from '../../../i18n/localeContext';
import { dateTimeOf, groupedNumber } from '../../../i18n/locales';
import { EVERY_CHOICE, consoleBenchmarkPath } from '../../../routes/console';
import { RUN_LIST_PAGE_SIZE, consoleRunPath, isFilteredRunQuery, parseRunQuery, runQuerySearch } from '../../../routes/consoleRuns';
import { combinationKey } from '../../../routes/runRecords';
import { SearchField, Select } from '../../../ui/controls';
import controls from '../../../ui/controls.module.css';
import { Hint } from '../../../ui/hint';
import { Pager } from '../../../ui/navigation';
import table from '../../../ui/table.module.css';
import styles from './RunListPage.module.css';

/** A benchmark's runs, newest first; the filters and the page live in the address. */
export function RunListPage() {
  const { t } = useTranslation();
  const { benchmarkId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const query = parseRunQuery(params);
  // The page in view stays until the next one arrives.
  const page = useConsoleRunPage(benchmark.id, parseRunQuery(new URLSearchParams(useDeferredValue(params.toString()))), RUN_LIST_PAGE_SIZE);
  const update = (next: Partial<ConsoleRunQuery>) => setParams(runQuerySearch({ ...query, offset: 0, ...next }), { replace: true, preventScrollReset: true });
  const last = Math.min(query.offset + RUN_LIST_PAGE_SIZE, page.total);
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.runs.title') }]} title={t('console.runs.title')}
        lead={isFilteredRunQuery(query) ? t('console.runs.leadFiltered', { count: page.total, total: benchmark.runCount }) : t('console.runs.lead', { count: benchmark.runCount })}
      />
      <RunFilters benchmark={benchmark} query={query} onChange={update} />
      {page.items.length === 0 ? <p className="t-small c-muted">{t('console.runs.empty')}</p> : <RunTable benchmarkId={benchmark.id} rows={page.items} />}
      {page.total > RUN_LIST_PAGE_SIZE && (
        <Pager
          className={styles.pager} label={t('console.runs.range', { from: query.offset + 1, to: last, total: page.total })}
          atStart={query.offset === 0} atEnd={last >= page.total}
          onPrevious={() => update({ offset: query.offset - RUN_LIST_PAGE_SIZE })} onNext={() => update({ offset: query.offset + RUN_LIST_PAGE_SIZE })}
        />
      )}
    </div>
  );
}

export function RunFilters({ benchmark, query, onChange }: { benchmark: ConsoleBenchmark; query: ConsoleRunQuery; onChange: (next: Partial<ConsoleRunQuery>) => void }) {
  const { t } = useTranslation();
  const entrants = benchmark.entrants.filter(({ model }) => !query.model || model.id === query.model);
  return (
    <div className={styles.filters} role="search" aria-label={t('console.runs.filters')}>
      <SearchField label={t('console.runs.search')} value={query.q} onChange={q => onChange({ q })} className={styles.search} />
      <Select
        label={t('console.runs.combinationFilter')} value={query.combination || EVERY_CHOICE} onChange={combination => onChange({ combination: combination === EVERY_CHOICE ? '' : combination })}
        choices={[
          { value: EVERY_CHOICE, label: t('console.runs.everyCombination') },
          ...entrants.map(({ model, harness }) => ({ value: combinationKey(model.id, harness.id), label: `${model.name} · ${harness.name}` })),
        ]}
      />
      <Select
        label={t('console.runs.outcomeFilter')} value={query.outcome ?? EVERY_CHOICE} onChange={outcome => onChange({ outcome: outcome === EVERY_CHOICE ? undefined : outcome as RunOutcome })}
        choices={[{ value: EVERY_CHOICE, label: t('console.runs.everyOutcome') }, ...runOutcomeValues.map(outcome => ({ value: outcome, label: t(`runs.outcome.${outcome}`) }))]}
      />
      <Select
        label={t('console.runs.reviewFilter')} value={query.review ?? EVERY_CHOICE} onChange={review => onChange({ review: review === EVERY_CHOICE ? undefined : review as ReviewFilter })}
        choices={[{ value: EVERY_CHOICE, label: t('console.runs.everyReview') }, ...consoleReviewFilterValues.map(review => ({ value: review, label: t(`console.runs.review.${review}`) }))]}
      />
      {query.model && <ModelFocusChip benchmark={benchmark} modelId={query.model} onClear={() => onChange({ model: '' })} />}
    </div>
  );
}

/** The model the list keeps to, which the reader can let go of to see every model's runs. */
export function ModelFocusChip({ benchmark, modelId, onClear }: { benchmark: ConsoleBenchmark; modelId: string; onClear: () => void }) {
  const { t } = useTranslation();
  const entrant = benchmark.entrants.find(candidate => candidate.model.id === modelId);
  if (!entrant) {
    throw new Error(`no model ${modelId} ran on ${benchmark.id}`);
  }
  const { name } = entrant.model;
  return (
    <Hint content={t('console.runs.modelFocus.hint')}>
      <button type="button" className={clsx(controls.pill, controls.small, styles.focus, 'loop-edge')} aria-label={t('console.runs.modelFocus.clear', { name })} onClick={onClear}>
        {name}<span aria-hidden="true">×</span>
      </button>
    </Hint>
  );
}

/** One row per run; the row opens the run. */
export function RunTable({ benchmarkId, rows }: { benchmarkId: string; rows: RunRow[] }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useLocalizedNavigate();
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
          <div key={run.id} className={clsx(table.row, table.link)} role="row" onClick={event => { if (!(event.target as HTMLElement).closest('a')) { navigate(to); } }}>
            <span role="cell" className={styles.task}><LocaleLink to={to} className="t-label">{run.task.title}</LocaleLink><span className="t-mono c-faint">{run.task.id} · {run.taskVersion}</span></span>
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
