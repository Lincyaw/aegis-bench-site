import { clsx } from 'clsx';
import { Suspense, useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useConsoleTaskComparison, useConsoleTrajectories, useTaskResults } from '../api/consoleClient';
import type { ConsoleTaskDetail } from '../api/types';
import { LIST_SEPARATOR, type ComparisonView } from '../runs/comparison';
import { consoleRunPath } from '../runs/consoleRunQuery';
import { HuggingFaceBoundary } from '../runs/HuggingFace';
import { ComparedRuns, RunChoice, type ComparisonSource } from '../runs/TaskComparison';
import { Loading } from '../ui/content';
import controls from '../ui/controls.module.css';
import { InfoHint } from '../ui/hint';
import { taskPageSearch } from './consoleTaskQuery';
import styles from './TaskComparisonTab.module.css';

/**
 * A task's runs side by side, for checking the task: the input every run received, then what each run produced, how
 * it was graded and what it did, as the benchmark's blocks lay them out; the runs opened below show all of it.
 */
export function TaskComparisonTab({ task, view }: { task: ConsoleTaskDetail; view: ComparisonView }) {
  const [, setParams] = useSearchParams();
  const { entrants } = useTaskResults(task.benchmark.id, task.id);
  // Choices show at once, outside the router's transition, so quick successive choices build on each other.
  const onView = (next: ComparisonView) => setParams(taskPageSearch({ tab: 'compare', ...next }), { replace: true, preventScrollReset: true, flushSync: true });
  // The runs shown stay until the newly chosen ones load.
  const shown = useDeferredValue(view.runs.join(LIST_SEPARATOR));
  const useTaskComparison = (runIds: string[]) => useConsoleTaskComparison(task.benchmark.id, task.id, runIds);
  const source: ComparisonSource = { useComparison: useTaskComparison, useTrajectories: useConsoleTrajectories, runPath: runId => consoleRunPath(task.benchmark.id, runId) };
  return (
    <div className={styles.tab}>
      <TaskInput task={task} />
      {shown ? (
        <HuggingFaceBoundary resetKey={shown}>
          <Suspense fallback={<Loading />}>
            <ComparedRuns runIds={shown.split(LIST_SEPARATOR)} entrants={entrants} source={source} view={view} onView={onView} />
          </Suspense>
        </HuggingFaceBoundary>
      ) : <RunChoice entrants={entrants} view={view} onView={onView} />}
    </div>
  );
}

/** What every run received, its first lines until asked for the whole. */
export function TaskInput({ task }: { task: ConsoleTaskDetail }) {
  const { t } = useTranslation();
  const [whole, setWhole] = useState(false);
  return (
    <section className={styles.input}>
      <header className={styles.head}>
        <h2 className="t-label">{t('compare.input')}</h2>
        <InfoHint label={t('ui.about', { subject: t('compare.input') })}>{t('compare.inputHint')}</InfoHint>
        <button type="button" className={clsx(controls.textLink, 't-micro')} aria-expanded={whole} onClick={() => setWhole(!whole)}>
          {whole ? t('compare.collapseInput') : t('compare.expandInput')}
        </button>
      </header>
      <p className={clsx(styles.instruction, !whole && styles.clamped)}>{task.instruction}</p>
      {whole && task.reportSchema && <pre className={styles.schema}>{task.reportSchema}</pre>}
    </section>
  );
}
