import { clsx } from 'clsx';
import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleModel, useModelTaskPage } from '../../../api/consoleClient';
import { consoleTaskOrderValues, consoleTaskSpreadValues } from '../../../api/schema';
import type { ModelTaskQuery, TaskOrder, TaskSpread } from '../../../api/types';
import { VendorBadge } from '../../../components/model/ModelBadge';
import { HarnessTable, ModelTaskTable } from '../../../components/model/ModelResults';
import { FailureLegend } from '../../../components/result/FailureBar';
import { formatCost, formatRate } from '../../../components/result/presentation';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { useLocale } from '../../../i18n/localeContext';
import { groupedNumber } from '../../../i18n/locales';
import { EVERY_CHOICE, consoleBenchmarkPath } from '../../../routes/console';
import { MODEL_TASK_PAGE_SIZE, consoleModelPath, consoleModelsPath, modelTaskSearch, parseModelTaskQuery } from '../../../routes/consoleModels';
import { StatTile, StatTiles } from '../../../ui/content';
import { SearchField, SegmentedControl, Select } from '../../../ui/controls';
import controls from '../../../ui/controls.module.css';
import { Hint } from '../../../ui/hint';
import { Pager } from '../../../ui/navigation';
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
        <HarnessTable benchmarkId={benchmark.id} modelId={detail.model.id} query={query} results={detail.byHarness} />
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
