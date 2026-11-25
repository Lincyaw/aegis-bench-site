import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useBenchmark, useTask, useTaskEntryPages, useTaskFile } from '../api/client';
import { runRecordsPath } from '../runs/runRecordsQuery';
import { BENCHMARKS_PATH, benchmarkPath, stagePath } from '../site/siteMap';
import { Breadcrumbs } from '../ui/navigation';
import { TaskFileBrowser, type TaskFileSource } from './TaskFileBrowser';
import { ENTRY_PAGE_SIZE, FILE_PARAM, INSTRUCTION_PATH } from './taskFiles';
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
        className={styles.browser} source={source} note={t('tasks.harbor')}
        open={search.get(FILE_PARAM) ?? INSTRUCTION_PATH}
        onOpen={file => setSearch({ [FILE_PARAM]: file }, { replace: true, preventScrollReset: true })}
      />
    </div>
  );
}
