import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleModel, useModelTaskPage } from '../../../api/consoleClient';
import type { ModelTaskQuery } from '../../../api/types';
import { VendorBadge } from '../../../components/model/ModelBadge';
import { HarnessTable, ModelTaskTable } from '../../../components/model/ModelResults';
import { FailureLegend } from '../../../components/result/FailureBar';
import { NO_VALUE, formatCost, formatRate } from '../../../components/result/presentation';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { TaskFilters } from '../../../components/task/TaskTable';
import { useLocale } from '../../../i18n/localeContext';
import { groupedNumber } from '../../../i18n/locales';
import { EVERY_CHOICE, searchOf } from '../../../routes/address';
import { consoleBenchmarkPath } from '../../../routes/console';
import { MODEL_TASK_PAGE_SIZE, MODEL_TASK_PARAMS, consoleModelPath, consoleModelsPath, parseModelTaskQuery } from '../../../routes/consoleModels';
import { HintedHeading, StatTile, StatTiles } from '../../../ui/content';
import { ScopeChip, SegmentedControl } from '../../../ui/controls';
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
  const update = (next: Partial<ModelTaskQuery>) => setParams(searchOf(MODEL_TASK_PARAMS, { ...query, offset: 0, ...next }), { replace: true, preventScrollReset: true });
  const shownResult = query.harness ? detail.byHarness.find(entry => entry.harness.id === query.harness)?.result : detail.result;
  if (!shownResult) {
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
          label={t('console.model.harnessLabel')} value={query.harness ?? EVERY_CHOICE} onChange={harness => update({ harness: harness === EVERY_CHOICE ? undefined : harness })}
          choices={[{ value: EVERY_CHOICE, label: t('console.model.allHarnesses') }, ...detail.byHarness.map(({ harness }) => ({ value: harness.id, label: harness.name }))]}
        />
        {query.tag && <ScopeChip name={t('console.scope.collection', { tag: query.tag })} to={consoleModelPath(benchmark.id, detail.model.id, { ...query, tag: undefined, offset: 0 })} />}
        {query.task && <ScopeChip name={t('console.scope.task', { task: query.task })} to={consoleModelPath(benchmark.id, detail.model.id, { ...query, task: undefined, offset: 0 })} />}
      </div>
      <StatTiles>
        <StatTile label={t('console.model.stats.passRate')} value={shownResult.passRate === undefined ? NO_VALUE : formatRate(shownResult.passRate)} />
        <StatTile label={t('console.model.stats.everyTime')} value={t('console.overview.tasksOf', { solved: shownResult.solvedEveryTime, total: shownResult.tasks })} />
        <StatTile label={t('console.model.stats.steps')} value={shownResult.meanSteps === undefined ? NO_VALUE : groupedNumber(locale, Math.round(shownResult.meanSteps))} />
        <StatTile label={t('console.model.stats.cost')} value={shownResult.meanCostUsd === undefined ? NO_VALUE : formatCost(shownResult.meanCostUsd)} />
      </StatTiles>
      <section className={styles.section}>
        <h2 className="t-heading">{t('console.model.byHarness')}</h2>
        <HarnessTable benchmarkId={benchmark.id} modelId={detail.model.id} query={query} results={detail.byHarness} />
      </section>
      <section className={styles.section}>
        <HintedHeading rank="h2" className="t-heading" title={t('console.model.tasks')} about={t('console.model.tasksNote')} />
        <TaskFilters query={query} onChange={update} />
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
