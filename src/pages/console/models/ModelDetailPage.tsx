import { clsx } from 'clsx';
import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleModel, useModelTaskPage, type ModelTaskQuery } from '../../../api/consoleClient';
import { consoleTaskOrderValues, consoleTaskSpreadValues } from '../../../api/schema';
import type { HarnessResult, ModelTaskRow, TaskOrder, TaskSpread } from '../../../api/types';
import { VendorBadge } from '../../../components/model/ModelBadge';
import { FailureBar, FailureLegend } from '../../../components/result/FailureBar';
import { PassRate } from '../../../components/result/PassRate';
import { formatCost, formatRate } from '../../../components/result/presentation';
import { OutcomeDot } from '../../../components/run/Outcome';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { useLocale } from '../../../i18n/localeContext';
import { groupedNumber } from '../../../i18n/locales';
import { EVERY_CHOICE, consoleBenchmarkPath } from '../../../routes/console';
import { MODEL_TASK_PAGE_SIZE, consoleModelPath, consoleModelsPath, modelTaskSearch, parseModelTaskQuery } from '../../../routes/consoleModels';
import { consoleRunPath } from '../../../routes/consoleRuns';
import { consoleTaskPath } from '../../../routes/consoleTasks';
import { StatTile, StatTiles } from '../../../ui/content';
import { SearchField, SegmentedControl, Select } from '../../../ui/controls';
import controls from '../../../ui/controls.module.css';
import { Hint } from '../../../ui/hint';
import { Pager } from '../../../ui/navigation';
import table from '../../../ui/table.module.css';
import styles from './ModelPages.module.css';

/**
 * A model on a benchmark, on every task or on one collection's: over all its harnesses or narrowed to one, each
 * harness's result, and its runs task by task.
 */
export function ModelDetailPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { benchmarkId = '', modelId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const query = parseModelTaskQuery(params);
  // The results in view stay until the next ones arrive.
  const shown = parseModelTaskQuery(new URLSearchParams(useDeferredValue(params.toString())));
  const detail = useConsoleModel(benchmark.id, modelId, shown);
  const page = useModelTaskPage(benchmark.id, modelId, shown, MODEL_TASK_PAGE_SIZE);
  const update = (next: Partial<ModelTaskQuery>) => setParams(modelTaskSearch({ ...query, offset: 0, ...next }), { replace: true, preventScrollReset: true });
  const scope = query.harness ? detail.byHarness.find(entry => entry.harness.id === query.harness)?.result : detail.result;
  if (!scope) {
    throw new Error(`${detail.model.name} did not run in harness ${query.harness}`);
  }
  const last = Math.min(query.offset + MODEL_TASK_PAGE_SIZE, page.total);
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader
        crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.models.title'), to: consoleModelsPath(benchmark.id) }, { label: detail.model.name }]}
        title={detail.model.name} lead={t('console.model.lead', { vendor: detail.model.vendor, count: detail.byHarness.length })}
      />
      <div className={styles.scope}>
        <VendorBadge model={detail.model} />
        <SegmentedControl
          label={t('console.model.harnessLabel')} value={query.harness || EVERY_CHOICE} onChange={harness => update({ harness: harness === EVERY_CHOICE ? '' : harness })}
          choices={[{ value: EVERY_CHOICE, label: t('console.model.allHarnesses') }, ...detail.byHarness.map(({ harness }) => ({ value: harness.id, label: harness.name }))]}
        />
        {query.tag && <CollectionChip benchmarkId={benchmark.id} modelId={detail.model.id} query={query} />}
        {query.task && <TaskChip benchmarkId={benchmark.id} modelId={detail.model.id} query={query} />}
      </div>
      <StatTiles>
        <StatTile label={t('console.model.stats.passRate')} value={scope.passRate === undefined ? '—' : formatRate(scope.passRate)} />
        <StatTile label={t('console.model.stats.everyTime')} value={t('console.overview.tasksOf', { solved: scope.solvedEveryTime, total: scope.tasks })} />
        <StatTile label={t('console.model.stats.steps')} value={scope.meanSteps === undefined ? '—' : groupedNumber(locale, Math.round(scope.meanSteps))} />
        <StatTile label={t('console.model.stats.cost')} value={scope.meanCostUsd === undefined ? '—' : formatCost(scope.meanCostUsd)} />
      </StatTiles>
      <section className={styles.section}>
        <h2 className="t-heading">{t('console.model.byHarness')}</h2>
        <HarnessTable results={detail.byHarness} current={query.harness} onPick={harness => update({ harness })} />
      </section>
      <section className={styles.section}>
        <header className={styles.sectionHead}>
          <h2 className="t-heading">{t('console.model.tasks')}</h2>
          <p className="t-small c-muted">{t('console.model.tasksLead')}</p>
        </header>
        <div className={styles.filters}>
          <SearchField label={t('console.tasks.search')} value={query.q} onChange={q => update({ q })} className={styles.search} />
          <Select
            label={t('console.tasks.spreadFilter')} value={query.spread ?? EVERY_CHOICE} onChange={spread => update({ spread: spread === EVERY_CHOICE ? undefined : spread as TaskSpread })}
            choices={[{ value: EVERY_CHOICE, label: t('console.tasks.everySpread') }, ...consoleTaskSpreadValues.map(spread => ({ value: spread, label: t(`console.tasks.spread.${spread}`) }))]}
          />
          <Select
            label={t('console.tasks.orderFilter')} value={query.order} onChange={order => update({ order: order as TaskOrder })}
            choices={consoleTaskOrderValues.map(order => ({ value: order, label: t(`console.tasks.order.${order}`) }))}
          />
        </div>
        {page.items.length === 0 ? <p className="t-small c-muted">{t('console.tasks.empty')}</p> : <ModelTaskTable benchmarkId={benchmark.id} modelId={detail.model.id} harness={query.harness} rows={page.items} />}
        <footer className={styles.footer}>
          <FailureLegend />
          {page.total > MODEL_TASK_PAGE_SIZE && (
            <Pager
              label={t('console.model.range', { from: query.offset + 1, to: last, total: page.total })} atStart={query.offset === 0} atEnd={last >= page.total}
              onPrevious={() => update({ offset: query.offset - MODEL_TASK_PAGE_SIZE })} onNext={() => update({ offset: query.offset + MODEL_TASK_PAGE_SIZE })}
            />
          )}
        </footer>
      </section>
    </div>
  );
}

/** The collection the page keeps to, which the reader can let go of to see every task. */
export function CollectionChip({ benchmarkId, modelId, query }: { benchmarkId: string; modelId: string; query: ModelTaskQuery }) {
  const { t } = useTranslation();
  return (
    <Hint content={t('console.model.collection.hint')}>
      <LocaleLink
        className={clsx(controls.pill, controls.small, styles.focus, 'loop-edge')} aria-label={t('console.model.collection.clear', { tag: query.tag })}
        to={consoleModelPath(benchmarkId, modelId, { ...query, tag: '', offset: 0 })} replace preventScrollReset
      >
        {t('console.model.collection.name', { tag: query.tag })}<span aria-hidden="true">×</span>
      </LocaleLink>
    </Hint>
  );
}

/** The one task the page keeps to, as the collection's matrix cell it was opened from did; the reader can let it go. */
export function TaskChip({ benchmarkId, modelId, query }: { benchmarkId: string; modelId: string; query: ModelTaskQuery }) {
  const { t } = useTranslation();
  return (
    <Hint content={t('console.model.task.hint')}>
      <LocaleLink
        className={clsx(controls.pill, controls.small, styles.focus, 'loop-edge')} aria-label={t('console.model.task.clear', { task: query.task })}
        to={consoleModelPath(benchmarkId, modelId, { ...query, task: '', offset: 0 })} replace preventScrollReset
      >
        {t('console.model.task.name', { task: query.task })}<span aria-hidden="true">×</span>
      </LocaleLink>
    </Hint>
  );
}

/** The model's result with each harness; a row narrows the page to that harness. */
export function HarnessTable({ results, current, onPick }: { results: HarnessResult[]; current: string; onPick: (harness: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className={clsx(table.table, styles.harnesses)} role="table" aria-label={t('console.model.byHarness')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">{t('console.model.harnessLabel')}</span>
        <span role="columnheader">{t('console.models.column.passRate')}</span>
        <span role="columnheader">{t('console.models.column.everyTime')}</span>
        <span role="columnheader">{t('console.models.column.once')}</span>
        <span role="columnheader">{t('console.models.column.cost')}</span>
        <span role="columnheader">{t('console.models.column.failures')}</span>
      </div>
      {results.map(({ harness, result }) => (
        <div key={harness.id} className={clsx(table.row, table.link, harness.id === current && styles.current)} role="row" aria-current={harness.id === current ? 'true' : undefined} onClick={() => onPick(harness.id)}>
          <span role="cell" className="t-label">{harness.name}</span>
          <span role="cell"><PassRate rate={result.passRate} /></span>
          <span role="cell" className="t-numeric c-muted">{t('console.overview.tasksOf', { solved: result.solvedEveryTime, total: result.tasks })}</span>
          <span role="cell" className="t-numeric c-muted">{t('console.overview.tasksOf', { solved: result.solvedOnce, total: result.tasks })}</span>
          <span role="cell" className="t-numeric c-muted">{result.meanCostUsd === undefined ? '—' : formatCost(result.meanCostUsd)}</span>
          <span role="cell"><FailureBar result={result} /></span>
        </div>
      ))}
    </div>
  );
}

/** The model's runs on each task, grouped by harness; each dot opens its run. */
export function ModelTaskTable({ benchmarkId, modelId, harness, rows }: { benchmarkId: string; modelId: string; harness: string; rows: ModelTaskRow[] }) {
  const { t } = useTranslation();
  return (
    <div className={clsx(table.table, styles.tasks)} role="table" aria-label={t('console.model.tasks')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">{t('console.model.column.task')}</span>
        <span role="columnheader">{t('console.model.column.runs')}</span>
        <span role="columnheader">{t('console.model.column.passRate')}</span>
        <span role="columnheader">{t('console.model.column.failures')}</span>
      </div>
      {rows.map(row => (
        <div key={row.task.id} className={table.row} role="row">
          <span role="cell" className={styles.task}><LocaleLink to={consoleTaskPath(benchmarkId, row.task.id, { tab: 'runs', model: modelId, harness: harness || undefined })} className="t-label">{row.task.title}</LocaleLink><span className="t-mono c-faint">{row.task.id}</span></span>
          <span role="cell" className={styles.runGroups}>
            {[...Map.groupBy(row.runs, run => run.harness.id).values()].map(runs => (
              <span key={runs[0].harness.id} className={styles.runGroup}>
                {runs.map(run => {
                  const label = t('console.model.runOf', { harness: run.harness.name, attempt: run.attempt, outcome: t(`runs.outcome.${run.outcome}`) });
                  return <LocaleLink key={run.id} className={styles.runDot} to={consoleRunPath(benchmarkId, run.id)} title={label} aria-label={label}><OutcomeDot outcome={run.outcome} /></LocaleLink>;
                })}
              </span>
            ))}
          </span>
          <span role="cell"><PassRate rate={row.result.passRate} /></span>
          <span role="cell"><FailureBar result={row.result} /></span>
        </div>
      ))}
    </div>
  );
}
