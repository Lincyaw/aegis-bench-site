import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleRunPage } from '../../../api/consoleClient';
import type { ConsoleBenchmark, ConsoleRunQuery } from '../../../api/types';
import { RunFilters, RunTable } from '../../../components/run/RunTable';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { consoleBenchmarkPath } from '../../../routes/console';
import { RUN_LIST_PAGE_SIZE, consoleRunsPath, isFilteredRunQuery, parseRunQuery, runQuerySearch } from '../../../routes/consoleRuns';
import { ScopeChip } from '../../../ui/controls';
import { Pager } from '../../../ui/navigation';
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
      <RunFilters benchmark={benchmark} query={query} onChange={update}>
        {query.model && <ModelScopeChip benchmark={benchmark} query={query} />}
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

/** The model the list keeps to, which the reader can let go of to see every model's runs. */
export function ModelScopeChip({ benchmark, query }: { benchmark: ConsoleBenchmark; query: ConsoleRunQuery }) {
  const entrant = benchmark.entrants.find(candidate => candidate.model.id === query.model);
  if (!entrant) {
    throw new Error(`no model ${query.model} ran on ${benchmark.id}`);
  }
  return <ScopeChip name={entrant.model.name} to={consoleRunsPath(benchmark.id, { ...query, offset: 0, model: '' })} />;
}
