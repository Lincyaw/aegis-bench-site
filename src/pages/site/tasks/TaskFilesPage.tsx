import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useBenchmark, useTask, useTaskEntryPages, useTaskFile } from '../../../api/client';
import { TaskFileBrowser, type TaskFileSource } from '../../../components/task/TaskFileBrowser';
import { searchOf } from '../../../routes/address';
import { runRecordsPath } from '../../../routes/runRecords';
import { BENCHMARKS_PATH, ENTRY_PAGE_SIZE, TASK_FILES_PARAMS, benchmarkPath, parseTaskFilesView, stagePath } from '../../../routes/site';
import { Breadcrumbs } from '../../../ui/navigation';
import styles from './TaskFilesPage.module.css';

/** A public task's Harbor directory, with the reference solution and answers listed but closed. */
export function TaskFilesPage() {
  const { t } = useTranslation();
  const { benchmarkId = '', taskId = '' } = useParams();
  const [search, setSearch] = useSearchParams();
  const benchmark = useBenchmark(benchmarkId);
  const task = useTask(benchmark.id, taskId);
  const source: TaskFileSource = {
    useDirectory: directory => {
      const pages = useTaskEntryPages(benchmark.id, task.id, directory, ENTRY_PAGE_SIZE);
      if (pages.isFetchNextPageError) {
        throw pages.error;
      }
      return {
        entries: pages.data.pages.flatMap(page => page.items).map(entry => ({
          path: entry.path, kind: entry.kind, size: entry.size, ...(entry.withheld && { mark: { label: t(`tasks.withheld.${entry.withheld}`), closed: true } }),
        })),
        total: pages.data.pages[0].total, loadingMore: pages.isFetchingNextPage, loadMore: () => void pages.fetchNextPage(),
      };
    },
    useFile: path => useTaskFile(benchmark.id, task.id, path),
  };
  return (
    <div className={styles.workspace} data-half={benchmark.stage.half}>
      <header className={styles.toolbar}>
        <h1 className="visually-hidden">{t('tasks.pageTitle', { task: `${task.id} ${task.title}` })}</h1>
        <Breadcrumbs crumbs={[
          { label: t('site.nav.benchmarks'), to: BENCHMARKS_PATH }, { label: `${benchmark.stage.id} ${benchmark.stage.name}`, to: stagePath(benchmark.stage.id) },
          { label: benchmark.name, to: benchmarkPath(benchmark.id) }, { label: t('benchmarks.runRecords'), to: runRecordsPath(benchmark.id, { task: task.id }) },
          { label: `${task.id} ${task.title}` },
        ]} />
      </header>
      <TaskFileBrowser
        className={styles.browser} source={source} about={t('tasks.harbor')} huggingFaceUrl={task.huggingFaceUrl}
        open={parseTaskFilesView(search).path}
        onOpen={file => setSearch(searchOf(TASK_FILES_PARAMS, { path: file }), { replace: true, preventScrollReset: true })}
      />
    </div>
  );
}
