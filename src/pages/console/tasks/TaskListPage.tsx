import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleTaskPage } from '../../../api/consoleClient';
import type { ConsoleTaskQuery } from '../../../api/types';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { TaskFilters, TaskTable } from '../../../components/task/TaskTable';
import { searchOf } from '../../../routes/address';
import { consoleBenchmarkPath } from '../../../routes/console';
import { TASK_LIST_PAGE_SIZE, TASK_QUERY_PARAMS, parseTaskQuery } from '../../../routes/consoleTasks';
import { Pager } from '../../../ui/navigation';
import styles from './TaskListPage.module.css';

/** A benchmark's tasks, hardest first, with what each combination made of them; the filters and the page live in the address. */
export function TaskListPage() {
  const { t } = useTranslation();
  const { benchmarkId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const query = parseTaskQuery(params);
  // The page in view stays until the next one arrives.
  const page = useConsoleTaskPage(benchmark.id, parseTaskQuery(new URLSearchParams(useDeferredValue(params.toString()))), TASK_LIST_PAGE_SIZE);
  const update = (next: Partial<ConsoleTaskQuery>) => setParams(searchOf(TASK_QUERY_PARAMS, { ...query, offset: 0, ...next }), { replace: true, preventScrollReset: true });
  const last = Math.min(query.offset + TASK_LIST_PAGE_SIZE, page.total);
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.tasks.title') }]} title={t('console.tasks.title')} about={t('console.tasks.about')} lead={t('console.tasks.lead', { count: benchmark.taskCount })} />
      <TaskFilters query={query} tags={page.tags} onChange={update} />
      {page.items.length === 0 ? <p className="t-small c-muted">{t('console.tasks.empty')}</p> : <TaskTable benchmarkId={benchmark.id} rows={page.items} />}
      {page.total > TASK_LIST_PAGE_SIZE && (
        <Pager
          className={styles.pager} label={t('console.tasks.range', { from: query.offset + 1, to: last, total: page.total })}
          atStart={query.offset === 0} atEnd={last >= page.total}
          onPrevious={() => update({ offset: query.offset - TASK_LIST_PAGE_SIZE })} onNext={() => update({ offset: query.offset + TASK_LIST_PAGE_SIZE })}
        />
      )}
    </div>
  );
}
