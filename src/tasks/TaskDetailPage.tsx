import { clsx } from 'clsx';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleTask, useConsoleTaskEntryPages, useConsoleTaskFile } from '../api/consoleClient';
import type { ConsoleTaskDetail } from '../api/types';
import { ConsoleHeader } from '../console/ConsoleHeader';
import { consoleBenchmarkPath } from '../console/consoleMap';
import { LocaleLink } from '../i18n/LocaleRouting';
import { EntrantDots } from '../results/PassRate';
import { Loading, Tag } from '../ui/content';
import controls from '../ui/controls.module.css';
import { Hint } from '../ui/hint';
import { TabRow } from '../ui/navigation';
import navigation from '../ui/navigation.module.css';
import { TASK_TABS, consoleTaskPath, consoleTasksPath, inFocus, parseTaskPageView, taskPageSearch, type TaskPageView, type TaskTab } from './consoleTaskQuery';
import { TaskComparisonTab } from './TaskComparisonTab';
import { TaskContentTab, TaskGradingTab, TaskReferenceTab } from './TaskDefinitionTabs';
import { HuggingFaceBoundary } from '../runs/HuggingFace';
import { TaskFileBrowser, type TaskFileSource } from './TaskFileBrowser';
import { TaskRevisionsTab } from './TaskRevisionsTab';
import { TaskRunsTab } from './TaskRunsTab';
import { ENTRY_PAGE_SIZE, INSTRUCTION_PATH } from './taskFiles';
import styles from './TaskDetailPage.module.css';

/** A task in the console: what it asks, how it is graded, its reference answer, its runs, its files and its versions. */
export function TaskDetailPage() {
  const { t } = useTranslation();
  const { benchmarkId = '', taskId = '' } = useParams();
  const [params] = useSearchParams();
  const view = parseTaskPageView(params);
  const benchmark = useConsoleBenchmark(benchmarkId);
  const task = useConsoleTask(benchmark.id, taskId);
  const counts: Record<TaskTab, number | undefined> = {
    content: undefined, grading: task.sizes.checks, reference: undefined, runs: task.result.runs, compare: undefined, files: task.sizes.files, revisions: task.sizes.revisions,
  };
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader
        crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.tasks.title'), to: consoleTasksPath(benchmark.id) }, { label: task.id }]}
        title={task.title}
      />
      <div className={styles.facts}>
        {task.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}
        <span className="t-mono c-faint">{t('console.task.version', { version: task.version })}</span>
        {task.spread && <Tag dashed>{t(`console.tasks.spread.${task.spread}`)}</Tag>}
        <EntrantDots entrants={task.entrants} />
        <span className="t-micro c-muted">{t('console.task.solvedBy', { solved: task.entrants.filter(entrant => entrant.solved).length, entrants: task.entrants.length })}</span>
        {view.model && <FocusChip task={task} view={view} />}
      </div>
      <TabRow current={view.tab} className={styles.tabs} aria-label={t('console.task.tabList')}>
        {TASK_TABS.map(tab => (
          <LocaleLink
            key={tab} data-tab={tab} className={clsx(navigation.tab, 't-small')} aria-current={tab === view.tab ? 'true' : undefined}
            to={consoleTaskPath(benchmark.id, task.id, { ...view, tab })} replace preventScrollReset
          >
            {t(`console.task.tabs.${tab}`)}{counts[tab] !== undefined && <span className={styles.count}>{counts[tab]}</span>}
          </LocaleLink>
        ))}
      </TabRow>
      <HuggingFaceBoundary resetKey={view.tab}>
        <Suspense fallback={<Loading />}>
          <TaskTabContent task={task} view={view} />
        </Suspense>
      </HuggingFaceBoundary>
    </div>
  );
}

/** The model and harness the page keeps to, which the reader can let go of to see every combination. */
export function FocusChip({ task, view }: { task: ConsoleTaskDetail; view: TaskPageView }) {
  const { t } = useTranslation();
  const entrant = task.entrants.find(candidate => inFocus(view, candidate));
  if (!entrant) {
    throw new Error(`no combination of ${task.id} runs ${view.model} ${view.harness ?? ''}`);
  }
  const name = view.harness ? `${entrant.model.name} · ${entrant.harness.name}` : entrant.model.name;
  return (
    <Hint content={t('console.task.focus.hint')}>
      <LocaleLink
        className={clsx(controls.pill, controls.small, styles.focus, 'loop-edge')} aria-label={t('console.task.focus.clear', { name })}
        to={consoleTaskPath(task.benchmark.id, task.id, { ...view, model: undefined, harness: undefined })} replace preventScrollReset
      >
        {name}<span aria-hidden="true">×</span>
      </LocaleLink>
    </Hint>
  );
}

export function TaskTabContent({ task, view }: { task: ConsoleTaskDetail; view: TaskPageView }) {
  switch (view.tab) {
    case 'content': return <TaskContentTab task={task} />;
    case 'grading': return <TaskGradingTab task={task} />;
    case 'reference': return <TaskReferenceTab task={task} />;
    case 'runs': return <TaskRunsTab task={task} view={view} />;
    case 'compare': return <TaskComparisonTab task={task} view={view} />;
    case 'files': return <TaskFilesTab task={task} view={view} />;
    case 'revisions': return <TaskRevisionsTab task={task} version={view.version} />;
  }
}

/** The task's whole Harbor directory, the files the public site withholds marked but open; opening a file keeps the page's context. */
export function TaskFilesTab({ task, view }: { task: ConsoleTaskDetail; view: TaskPageView }) {
  const { t } = useTranslation();
  const [, setParams] = useSearchParams();
  const source: TaskFileSource = {
    useDirectory: directory => {
      const pages = useConsoleTaskEntryPages(task.benchmark.id, task.id, directory, ENTRY_PAGE_SIZE);
      if (pages.isFetchNextPageError) {
        throw pages.error;
      }
      return {
        entries: pages.data.pages.flatMap(page => page.items).map(entry => ({
          path: entry.path, kind: entry.kind, size: entry.size,
          ...(entry.withheldFromPublic && { mark: { label: t('console.task.files.withheld'), closed: false } }),
        })),
        total: pages.data.pages[0].total, loadingMore: pages.isFetchingNextPage, loadMore: () => void pages.fetchNextPage(),
      };
    },
    useFile: path => useConsoleTaskFile(task.benchmark.id, task.id, path),
  };
  return (
    <TaskFileBrowser
      className={styles.browser} source={source} note={t('console.task.files.note')} huggingFaceUrl={task.huggingFaceUrl} open={view.file ?? INSTRUCTION_PATH}
      onOpen={next => setParams(taskPageSearch({ ...view, tab: 'files', file: next }), { replace: true, preventScrollReset: true })}
    />
  );
}
