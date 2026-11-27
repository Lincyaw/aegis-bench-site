import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { combinationKey } from '../../api/constraints';
import type { Combination, RunRef, TaskPage } from '../../api/types';
import { MoreButton, SmallPill } from '../../ui/controls';
import { CombinationLabel } from '../model/ModelBadge';
import { formatRate } from '../result/presentation';
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

/** A pass rate as the run records write it, or that no run counts when there is none. */
export function PassRateText({ rate }: { rate: number | undefined }) {
  const { t } = useTranslation();
  return rate === undefined ? t('runs.noCountedRun') : t('runs.passRate', { rate: formatRate(rate) });
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
              <span className={styles.taskTop}><span className="t-mono c-faint">{task.id}</span><span className="t-micro c-faint"><PassRateText rate={task.passRate} /></span></span>
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

/** A group's runs as chips by attempt. */
export function RunChips({ runs, runId, labelOf, onRun }: { runs: RunRef[]; runId: string | undefined; labelOf: (run: RunRef) => string; onRun: (run: string) => void }) {
  return (
    <span className={styles.chips}>
      {runs.map(run => (
        <SmallPill key={run.id} className={styles.chip} onClick={() => onRun(run.id)} aria-label={labelOf(run)} current={run.id === runId}>
          <OutcomeDot outcome={run.outcome} />{run.attempt}
        </SmallPill>
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
