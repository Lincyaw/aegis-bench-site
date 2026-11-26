import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleRunPage } from '../../../api/consoleClient';
import type { ConsoleRunQuery } from '../../../api/types';
import { CombinationScopeChip } from '../../../components/model/ModelBadge';
import { RunFilters, RunTable } from '../../../components/run/RunTable';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { searchOf } from '../../../routes/address';
import { consoleBenchmarkPath } from '../../../routes/console';
import { RUN_LIST_PAGE_SIZE, RUN_QUERY_PARAMS, consoleRunsPath, isFilteredRunQuery, parseRunQuery } from '../../../routes/consoleRuns';
import { ScopeChip } from '../../../ui/controls';
import { Pager } from '../../../ui/navigation';
import styles from './RunListPage.module.css';

/** A benchmark's runs, newest first; the filters, the task and combinations it keeps to, and the page live in the address. */
export function RunListPage() {
  const { t } = useTranslation();
  const { benchmarkId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const query = parseRunQuery(params);
  // The page in view stays until the next one arrives.
  const page = useConsoleRunPage(benchmark.id, parseRunQuery(new URLSearchParams(useDeferredValue(params.toString()))), RUN_LIST_PAGE_SIZE);
  const update = (next: Partial<ConsoleRunQuery>) => setParams(searchOf(RUN_QUERY_PARAMS, { ...query, offset: 0, ...next }), { replace: true, preventScrollReset: true });
  const last = Math.min(query.offset + RUN_LIST_PAGE_SIZE, page.total);
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.runs.title') }]} title={t('console.runs.title')} about={t('console.runs.about')}
        lead={isFilteredRunQuery(query) ? t('console.runs.leadFiltered', { count: page.total, total: benchmark.runCount }) : t('console.runs.lead', { count: benchmark.runCount })}
      />
      <RunFilters benchmark={benchmark} query={query} onChange={update}>
        {query.task && <ScopeChip name={t('console.scope.task', { task: query.task })} to={consoleRunsPath(benchmark.id, { ...query, offset: 0, task: undefined })} />}
        {query.model && (
          <CombinationScopeChip entrants={benchmark.entrants} scope={query} to={consoleRunsPath(benchmark.id, { ...query, offset: 0, model: undefined, harness: undefined })} />
        )}
      </RunFilters>
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
