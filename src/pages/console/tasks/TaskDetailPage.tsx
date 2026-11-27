import { Suspense, useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleTask, useConsoleTaskEntryPages, useConsoleTaskFile } from '../../../api/consoleClient';
import type { ConsoleTaskDetail } from '../../../api/types';
import { CombinationScopeChip } from '../../../components/model/ModelBadge';
import { EntrantDots } from '../../../components/task/EntrantDots';
import { HuggingFaceBoundary } from '../../../components/run/HuggingFace';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { TaskContentTab } from '../../../components/task/TaskContent';
import { directoryPagesOf } from '../../../components/task/files';
import { TaskFileBrowser, type TaskFileSource } from '../../../components/task/TaskFileBrowser';
import { searchOf } from '../../../routes/address';
import { consoleBenchmarkPath } from '../../../routes/console';
import { TASK_PAGE_PARAMS, TASK_TABS, consoleTaskPath, consoleTasksPath, parseTaskPageView, type TaskPageView, type TaskTab } from '../../../routes/consoleTasks';
import { ENTRY_PAGE_SIZE, INSTRUCTION_PATH } from '../../../routes/site';
import { Loading, Tag } from '../../../ui/content';
import { Tab, TabRow } from '../../../ui/navigation';
import { TaskComparisonTab } from './TaskComparisonTab';
import { TaskGradingTab, TaskReferenceTab } from './TaskDefinitionTabs';
import { TaskRevisionsTab } from './TaskRevisionsTab';
import { TaskRunsTab } from './TaskRunsTab';
import styles from './TaskDetailPage.module.css';

/** A task in the console: what it asks, how it is graded, its reference answer, its runs, its files and its versions. */
export function TaskDetailPage() {
  const { t } = useTranslation();
  const { benchmarkId = '', taskId = '' } = useParams();
  const [params] = useSearchParams();
  const view = parseTaskPageView(params);
  const benchmark = useConsoleBenchmark(benchmarkId);
  // The task as the page kept to it stays until the task as it now keeps to arrives.
  const task = useConsoleTask(benchmark.id, taskId, parseTaskPageView(new URLSearchParams(useDeferredValue(params.toString()))));
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
        <span className="t-micro c-muted">{t('console.task.solvedBy', { solved: task.solvedEntrants, entrants: task.entrants.length })}</span>
        {view.model && (
          <CombinationScopeChip entrants={benchmark.entrants} scope={view} to={consoleTaskPath(benchmark.id, task.id, { ...view, model: undefined, harness: undefined })} />
        )}
      </div>
      <TabRow current={view.tab} className={styles.tabs} aria-label={t('console.task.tabList')}>
        {TASK_TABS.map(tab => (
          <Tab key={tab} id={tab} current={view.tab} count={counts[tab]} to={consoleTaskPath(benchmark.id, task.id, { ...view, tab })}>{t(`console.task.tabs.${tab}`)}</Tab>
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
    useDirectory: directory => directoryPagesOf(
      useConsoleTaskEntryPages(task.benchmark.id, task.id, directory, ENTRY_PAGE_SIZE),
      entry => entry.withheldFromPublic ? { label: t('console.task.files.withheld'), closed: false } : undefined,
    ),
    useFile: path => useConsoleTaskFile(task.benchmark.id, task.id, path),
  };
  return (
    <TaskFileBrowser
      className={styles.browser} source={source} about={t('console.task.files.note')} huggingFaceUrl={task.huggingFaceUrl} open={view.file ?? INSTRUCTION_PATH}
      onOpen={next => setParams(searchOf(TASK_PAGE_PARAMS, { ...view, tab: 'files', file: next }), { replace: true, preventScrollReset: true })}
    />
  );
}
