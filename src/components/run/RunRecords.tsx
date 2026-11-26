import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Combination, RunRef, TaskPage } from '../../api/types';
import { EVERY_OUTCOME, TASK_MODES, combinationKey, withMode, type OutcomeFilter, type RunRecordsQuery } from '../../routes/runRecords';
import { MoreButton, SegmentedControl } from '../../ui/controls';
import controls from '../../ui/controls.module.css';
import { CombinationLabel } from '../model/ModelBadge';
import { OutcomeDot } from './Outcome';
import styles from './RunRecords.module.css';

/** A pane of the run records browser: its head, then its list, which scrolls on its own, and the button that loads more of it. */
export function Pane({ label, className, children }: { label?: string; className?: string; children: ReactNode }) {
  return <div className={clsx(styles.column, className)} aria-label={label}>{children}</div>;
}

export function PaneHead({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx(styles.columnHead, className)}>{children}</div>;
}

export function PaneList({ children }: { children: ReactNode }) {
  return <ol className={styles.scroll}>{children}</ol>;
}

export function PaneEmpty({ children }: { children: ReactNode }) {
  return <li className={clsx(styles.empty, 't-small c-faint')}>{children}</li>;
}

export function PaneMore({ label, loading, onClick }: { label: string; loading: boolean; onClick: () => void }) {
  return <MoreButton className={styles.more} label={label} loading={loading} onClick={onClick} />;
}

export function TaskColumn({ tasks, currentTask, onTask, loadingMore, onMore }: { tasks: TaskPage; currentTask: string | undefined; onTask: (task: string) => void; loadingMore: boolean; onMore: () => void }) {
  const { t } = useTranslation();
  return (
    <Pane label={t('runs.tasks')}>
      <PaneHead><span className="t-label">{t('runs.tasks')}</span><span className="t-micro c-faint">{t('benchmarks.tasks', { count: tasks.total })}</span></PaneHead>
      <PaneList>
        {tasks.items.map(task => (
          <li key={task.id}>
            <button type="button" className={styles.task} onClick={() => onTask(task.id)} aria-current={task.id === currentTask ? 'true' : undefined}>
              <span className={styles.taskTop}><span className="t-mono c-faint">{task.id}</span><span className="t-micro c-faint">{t('runs.passRate', { rate: Math.round(task.passRate * 100) })}</span></span>
              <span className="t-small">{task.title}</span>
            </button>
          </li>
        ))}
        {tasks.items.length === 0 && <PaneEmpty>{t('runs.noTasks')}</PaneEmpty>}
      </PaneList>
      {tasks.items.length < tasks.total && (
        <PaneMore label={t('runs.loadMore', { shown: tasks.items.length, total: tasks.total })} loading={loadingMore} onClick={onMore} />
      )}
    </Pane>
  );
}

/** Whether the chosen task shows its runs or compares them; it slides like every switch. */
export function TaskModeSwitch({ query, onQuery }: { query: RunRecordsQuery; onQuery: (query: RunRecordsQuery) => void }) {
  const { t } = useTranslation();
  return (
    <SegmentedControl
      label={t('runs.mode.label')} value={query.mode}
      choices={TASK_MODES.map(mode => ({ value: mode, label: t(`runs.mode.${mode}`) }))}
      onChange={mode => onQuery(withMode(query, mode))}
    />
  );
}

/** A group's runs as chips by attempt; runs outside the outcome filter are dimmed. */
export function RunChips({ runs, runId, outcome, labelOf, onRun }: { runs: RunRef[]; runId: string | undefined; outcome: OutcomeFilter; labelOf: (run: RunRef) => string; onRun: (run: string) => void }) {
  return (
    <span className={styles.chips}>
      {runs.map(run => (
        <button
          key={run.id}
          type="button"
          className={clsx(controls.pill, controls.small, styles.chip, 'loop-edge', outcome !== EVERY_OUTCOME && run.outcome !== outcome && styles.dimmed)}
          onClick={() => onRun(run.id)}
          aria-label={labelOf(run)}
          aria-current={run.id === runId ? 'true' : undefined}
        >
          <OutcomeDot outcome={run.outcome} />{run.attempt}
        </button>
      ))}
    </span>
  );
}

export function CombinationColumn({ combinations, current, onCombination }: { combinations: Combination[]; current: string | undefined; onCombination: (combination: string) => void }) {
  const { t } = useTranslation();
  return (
    <Pane label={t('runs.combinations')}>
      <PaneHead><span className="t-label">{t('runs.combinations')}</span><span className="t-micro c-faint">{combinations.length}</span></PaneHead>
      <PaneList>
        {combinations.map(({ model, harness }) => {
          const key = combinationKey(model.id, harness.id);
          return (
            <li key={key}>
              <button type="button" className={clsx(styles.task, styles.entrant)} onClick={() => onCombination(key)} aria-current={key === current ? 'true' : undefined}>
                <CombinationLabel model={model} harness={harness} />
              </button>
            </li>
          );
        })}
      </PaneList>
    </Pane>
  );
}
