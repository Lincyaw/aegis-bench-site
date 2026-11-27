import { clsx } from 'clsx';
import { Suspense, useDeferredValue, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useCollectionMatrix, useCollectionModels, useCollections, useConsoleBenchmark } from '../../../api/consoleClient';
import { consoleTaskOrderValues } from '../../../api/schema';
import type { ConsoleBenchmark, TaskOrder } from '../../../api/types';
import { CostFrontierChart, FailureChart, RankingChart } from '../../../components/collection/CollectionCharts';
import { VendorBadge } from '../../../components/model/ModelBadge';
import { FailureLegend } from '../../../components/result/FailureBar';
import { ResultTable } from '../../../components/result/ResultTable';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { consoleBenchmarkPath } from '../../../routes/console';
import { searchOf } from '../../../routes/address';
import {
  COLLECTION_CHARTS, COLLECTION_PARAMS, COLLECTION_TABS, MATRIX_PAGE_SIZE, collectionPath, collectionsPath, parseCollectionView, type CollectionView,
} from '../../../routes/consoleCollections';
import { consoleModelPath } from '../../../routes/consoleModels';
import { consoleTaskPath } from '../../../routes/consoleTasks';
import { Loading, Tag } from '../../../ui/content';
import { SegmentedControl, Select } from '../../../ui/controls';
import { InfoHint } from '../../../ui/hint';
import { Pager, Tab, TabRow } from '../../../ui/navigation';
import table from '../../../ui/table.module.css';
import styles from './CollectionPages.module.css';

/** One collection: its tasks against every model, every model's result on them, and charts that compare the models. */
export function CollectionPage() {
  const { t } = useTranslation();
  const { benchmarkId = '', tag = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const collection = useCollections(benchmark.id).find(candidate => candidate.tag === tag);
  if (!collection) {
    throw new Error(`no collection ${tag} in ${benchmark.name}`);
  }
  const view = parseCollectionView(params);
  const onView = (next: Partial<CollectionView>) => setParams(searchOf(COLLECTION_PARAMS, { ...view, ...next }), { replace: true, preventScrollReset: true });
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader
        crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.collections.title'), to: collectionsPath(benchmark.id) }, { label: tag }]}
        title={tag} lead={t('console.collection.lead', { count: collection.taskCount, tag })}
      />
      <TabRow current={view.tab} className={styles.tabs} aria-label={t('console.collection.tabList')}>
        {COLLECTION_TABS.map(tab => (
          <Tab key={tab} id={tab} current={view.tab} to={collectionPath(benchmark.id, tag, { ...view, tab })}>{t(`console.collection.tabs.${tab}`)}</Tab>
        ))}
      </TabRow>
      <Suspense fallback={<Loading />}>
        {view.tab === 'matrix' && <CollectionMatrix benchmark={benchmark} tag={tag} view={view} onView={onView} />}
        {view.tab === 'models' && <CollectionModels benchmark={benchmark} tag={tag} />}
        {view.tab === 'analysis' && <CollectionAnalysis benchmark={benchmark} tag={tag} view={view} onView={onView} />}
      </Suspense>
    </div>
  );
}

/** The collection's tasks against every model; each cell opens that model's runs on the task. */
export function CollectionMatrix({ benchmark, tag, view, onView }: { benchmark: ConsoleBenchmark; tag: string; view: CollectionView; onView: (next: Partial<CollectionView>) => void }) {
  const { t } = useTranslation();
  // The page in view stays until the next one arrives.
  const shown = useDeferredValue(view);
  const page = useCollectionMatrix(benchmark.id, tag, shown.order, shown.offset, MATRIX_PAGE_SIZE);
  const columns = { '--columns': `minmax(12rem, 1.6fr) repeat(${page.models.length}, minmax(4.5rem, 1fr))` } as CSSProperties;
  const last = Math.min(view.offset + MATRIX_PAGE_SIZE, page.total);
  return (
    <div className={styles.section}>
      <Select
        className={styles.order} label={t('console.tasks.orderFilter')} value={view.order} onChange={order => onView({ order: order as TaskOrder, offset: 0 })}
        choices={consoleTaskOrderValues.map(order => ({ value: order, label: t(`console.tasks.order.${order}`) }))}
      />
      <div className={styles.matrixScroll}>
        <div className={clsx(table.table, styles.matrix)} style={columns} role="table" aria-label={t('console.collection.tabs.matrix')}>
          <div className={clsx(table.row, table.head)} role="row">
            <span role="columnheader">
              <span className="visually-hidden">{t('console.collection.column.task')}</span>
              <InfoHint label={t('ui.about', { subject: t('console.collection.tabs.matrix') })}>{t('console.collection.matrixNote')}</InfoHint>
            </span>
            {page.models.map(model => <span key={model.id} role="columnheader" className={styles.matrixHead}><VendorBadge model={model} /><span className="t-micro">{model.name}</span></span>)}
          </div>
          {page.items.map(row => (
            <div key={row.task.id} className={table.row} role="row">
              <span role="rowheader" className={styles.task}><LocaleLink to={consoleTaskPath(benchmark.id, row.task.id)} className="t-small">{row.task.title}</LocaleLink><span className="t-mono c-faint">{row.task.id}</span></span>
              {row.cells.map(({ passed, counted, passRate }, index) => {
                const model = page.models[index];
                const label = t('console.collection.cell', { model: model.name, task: row.task.title, passed, counted });
                return (
                  <LocaleLink
                    key={model.id} role="cell" className={clsx(styles.cell, 't-micro')} to={consoleModelPath(benchmark.id, model.id, { tag, task: row.task.id })} title={label} aria-label={label}
                    style={{ '--share': passRate } as CSSProperties}
                  >
                    {passed} / {counted}
                  </LocaleLink>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {page.total > MATRIX_PAGE_SIZE && (
        <Pager
          className={styles.pager} label={t('console.collection.range', { from: view.offset + 1, to: last, total: page.total })} atStart={view.offset === 0} atEnd={last >= page.total}
          onPrevious={() => onView({ offset: view.offset - MATRIX_PAGE_SIZE })} onNext={() => onView({ offset: view.offset + MATRIX_PAGE_SIZE })}
        />
      )}
    </div>
  );
}

/** Every model's result on the collection's tasks; a row opens the model on them. */
export function CollectionModels({ benchmark, tag }: { benchmark: ConsoleBenchmark; tag: string }) {
  const { t } = useTranslation();
  const models = useCollectionModels(benchmark.id, tag);
  return (
    <div className={styles.section}>
      <ResultTable
        label={t('console.collection.tabs.models')} heads={[t('console.models.column.model')]} lead="minmax(14rem, 1.6fr)"
        rows={models.map(({ model, result, onCostFrontier }) => ({
          id: model.id, result,
          cells: [
            <span key="model" role="cell" className={styles.model}>
              <VendorBadge model={model} />
              <LocaleLink className={clsx(table.primary, 't-label')} to={consoleModelPath(benchmark.id, model.id, { tag })}>{model.name}</LocaleLink>
              {onCostFrontier && <Tag dashed>{t('console.collection.frontier')}</Tag>}
            </span>,
          ],
        }))}
      />
      <FailureLegend />
    </div>
  );
}

/** Charts that compare the models on the collection: their pass rates, their cost against pass rate, and why they fail. */
export function CollectionAnalysis({ benchmark, tag, view, onView }: { benchmark: ConsoleBenchmark; tag: string; view: CollectionView; onView: (next: Partial<CollectionView>) => void }) {
  const { t } = useTranslation();
  const models = useCollectionModels(benchmark.id, tag);
  const notes = { ranking: t('console.collection.rankingNote'), cost: t('console.collection.costNote'), failures: t('console.collection.failuresNote') };
  return (
    <div className={styles.section}>
      <div className={styles.switch}>
        <SegmentedControl
          label={t('console.collection.chartLabel')} value={view.chart} onChange={chart => onView({ chart })}
          choices={COLLECTION_CHARTS.map(chart => ({ value: chart, label: t(`console.collection.charts.${chart}`) }))}
        />
        <InfoHint label={t('ui.about', { subject: t(`console.collection.charts.${view.chart}`) })}>
          <p>{notes[view.chart]}</p><p>{t('console.collection.tableNote')}</p>
        </InfoHint>
      </div>
      <figure className={styles.figure}>
        {view.chart === 'ranking' && <RankingChart models={models} />}
        {view.chart === 'cost' && <CostFrontierChart models={models} />}
        {view.chart === 'failures' && <FailureChart models={models} />}
      </figure>
    </div>
  );
}
