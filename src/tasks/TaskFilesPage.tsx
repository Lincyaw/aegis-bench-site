import { clsx } from 'clsx';
import { Suspense, useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useBenchmark, useTask, useTaskEntryPages, useTaskFile, type TaskEntry } from '../api/client';
import { runRecordsPath } from '../runs/runRecordsQuery';
import { BENCHMARKS_PATH, benchmarkPath, stagePath } from '../site/siteMap';
import { Loading, Tag } from '../ui/content';
import content from '../ui/content.module.css';
import { ChevronIcon, MoreButton } from '../ui/controls';
import { Breadcrumbs } from '../ui/navigation';
import { ENTRY_PAGE_SIZE, FILE_PARAM, INSTRUCTION_PATH, directoriesHolding, formatSize, nameOf } from './taskFiles';
import styles from './TaskFilesPage.module.css';

/** What the tree needs to draw an entry and to report a choice. */
interface Tree {
  benchmarkId: string;
  taskId: string;
  open: string;
  expanded: ReadonlySet<string>;
  onToggle: (directory: string) => void;
  onOpen: (file: string) => void;
}

/** A public task's Harbor directory: its tree on one side, the open file on the other. */
export function TaskFilesPage() {
  const { t } = useTranslation();
  const { benchmarkId = '', taskId = '' } = useParams();
  const [search, setSearch] = useSearchParams();
  const benchmark = useBenchmark(benchmarkId);
  const task = useTask(benchmark.id, taskId);
  const open = search.get(FILE_PARAM) ?? INSTRUCTION_PATH;
  // The open file stays in view until the next one arrives.
  const shown = useDeferredValue(open);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(directoriesHolding(open)));
  const tree: Tree = {
    benchmarkId: benchmark.id, taskId: task.id, open, expanded,
    onToggle: directory => setExpanded(current => {
      const next = new Set(current);
      if (!next.delete(directory)) {
        next.add(directory);
      }
      return next;
    }),
    onOpen: file => setSearch({ [FILE_PARAM]: file }, { replace: true, preventScrollReset: true }),
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
      <div className={styles.browser}>
        <nav className={styles.tree} aria-label={t('tasks.tree')}>
          <div className={styles.scroll}>
            <Suspense fallback={<Loading />}>
              <DirectoryEntries tree={tree} directory="" />
            </Suspense>
          </div>
          <p className={clsx(styles.note, 't-micro c-faint')}>{t('tasks.harbor')}</p>
        </nav>
        <section className={styles.viewer} aria-label={t('tasks.file')}>
          <Suspense fallback={<Loading />}>
            <FileView benchmarkId={benchmark.id} taskId={task.id} path={shown} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

/** A directory's entries a page at a time, with the directories the reader opened drawn beneath them. */
export function DirectoryEntries({ tree, directory }: { tree: Tree; directory: string }) {
  const { t } = useTranslation();
  const pages = useTaskEntryPages(tree.benchmarkId, tree.taskId, directory, ENTRY_PAGE_SIZE);
  if (pages.isFetchNextPageError) {
    throw pages.error;
  }
  const entries = pages.data.pages.flatMap(page => page.items);
  const total = pages.data.pages[0].total;
  return (
    <ul className={styles.entries}>
      {entries.map(entry => (
        <li key={entry.path}>
          <EntryRow tree={tree} entry={entry} />
          {entry.kind === 'directory' && !entry.withheld && tree.expanded.has(entry.path) && (
            <Suspense fallback={<Loading />}>
              <DirectoryEntries tree={tree} directory={entry.path} />
            </Suspense>
          )}
        </li>
      ))}
      {entries.length < total && (
        <li><MoreButton className={styles.more} label={t('tasks.loadMore', { shown: entries.length, total })} loading={pages.isFetchingNextPage} onClick={() => void pages.fetchNextPage()} /></li>
      )}
    </ul>
  );
}

/** An entry's row: a directory opens and closes, a file opens in the viewer, a withheld entry only says why it is closed. */
export function EntryRow({ tree, entry }: { tree: Tree; entry: TaskEntry }) {
  const { t } = useTranslation();
  const directory = entry.kind === 'directory';
  const expanded = directory && tree.expanded.has(entry.path);
  return (
    <button
      type="button"
      className={clsx(styles.entry, directory && styles.directory, expanded && styles.expanded)}
      disabled={entry.withheld !== undefined}
      aria-expanded={directory && !entry.withheld ? expanded : undefined}
      aria-current={entry.path === tree.open ? 'true' : undefined}
      onClick={() => (directory ? tree.onToggle(entry.path) : tree.onOpen(entry.path))}
    >
      <span className={styles.chevron}>{directory && !entry.withheld && <ChevronIcon />}</span>
      <span className={clsx(styles.name, 't-small')}>{nameOf(entry.path)}{directory && '/'}</span>
      {entry.withheld ? <Tag dashed>{t(`tasks.withheld.${entry.withheld}`)}</Tag> : entry.size !== undefined && <span className="t-micro c-faint">{formatSize(entry.size)}</span>}
    </button>
  );
}

/** A published file's text as it is, with its size and type; a long file shows its start. */
export function FileView({ benchmarkId, taskId, path }: { benchmarkId: string; taskId: string; path: string }) {
  const { t } = useTranslation();
  const file = useTaskFile(benchmarkId, taskId, path);
  return (
    <div className={styles.file}>
      <header className={styles.fileHead}>
        <span className="t-mono">{file.path}</span>
        <span className="t-micro c-faint">{formatSize(file.size)} · {file.mediaType}</span>
      </header>
      {file.truncated && <p className="t-micro c-faint">{t('tasks.truncated')}</p>}
      {file.text === undefined ? <p className="t-small c-faint">{t('tasks.binary')}</p> : <pre className={clsx(content.panel, styles.text)}>{file.text}</pre>}
    </div>
  );
}
