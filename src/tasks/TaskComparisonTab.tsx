import * as Popover from '@radix-ui/react-popover';
import { clsx } from 'clsx';
import { Suspense, useDeferredValue, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useTaskComparison, useTaskResults } from '../api/consoleClient';
import type { ComparedRun, ConsoleTaskDetail, TaskComparison } from '../api/types';
import { LocaleLink } from '../i18n/LocaleRouting';
import { VendorBadge } from '../models/ModelBadge';
import { FailureClassTag } from '../results/FailureClassTag';
import { formatCost } from '../results/presentation';
import { runNumeralOf } from '../runs/comparison';
import { COMPARISON_BLOCKS } from '../runs/comparisonBlocks';
import { BlockHead, Cell, ComparisonTable } from '../runs/ComparisonTable';
import { consoleRunPath } from '../runs/consoleRunQuery';
import { HuggingFaceBoundary } from '../runs/HuggingFace';
import { OutcomeBadge, OutcomeDot } from '../runs/Outcome';
import { Loading } from '../ui/content';
import controls from '../ui/controls.module.css';
import { Hint, InfoHint } from '../ui/hint';
import {
  LIST_SEPARATOR, MAX_COMPARED_RUNS, MAX_OPENED_RUNS, taskPageSearch, withComparedRun, withLabel, withOpenedRun, type TaskComparisonView,
} from './consoleTaskQuery';
import styles from './TaskComparisonTab.module.css';

/**
 * A task's runs side by side, for checking the task: the input every run received, then what each run produced, how
 * it was graded and what it did, as the benchmark's blocks lay them out; the runs opened below show all of it.
 */
export function TaskComparisonTab({ task, view }: { task: ConsoleTaskDetail; view: TaskComparisonView }) {
  const [, setParams] = useSearchParams();
  // Choices show at once, outside the router's transition, so quick successive choices build on each other.
  const onView = (next: TaskComparisonView) => setParams(taskPageSearch({ tab: 'compare', ...next }), { replace: true, preventScrollReset: true, flushSync: true });
  // The runs shown stay until the newly chosen ones load.
  const shown = useDeferredValue(view.runs.join(LIST_SEPARATOR));
  return (
    <div className={styles.tab}>
      <TaskInput task={task} />
      {shown ? (
        <HuggingFaceBoundary resetKey={shown}>
          <Suspense fallback={<Loading />}>
            <ComparedRuns task={task} runIds={shown.split(LIST_SEPARATOR)} view={view} onView={onView} />
          </Suspense>
        </HuggingFaceBoundary>
      ) : <RunChoice task={task} view={view} onView={onView} />}
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
        <h2 className="t-label">{t('console.task.compare.input')}</h2>
        <InfoHint label={t('ui.about', { subject: t('console.task.compare.input') })}>{t('console.task.compare.inputHint')}</InfoHint>
        <button type="button" className={clsx(controls.textLink, 't-micro')} aria-expanded={whole} onClick={() => setWhole(!whole)}>
          {whole ? t('console.task.compare.collapseInput') : t('console.task.compare.expandInput')}
        </button>
      </header>
      <p className={clsx(styles.instruction, !whole && styles.clamped)}>{task.instruction}</p>
      {whole && task.reportSchema && <pre className={styles.schema}>{task.reportSchema}</pre>}
    </section>
  );
}

/** Before any run is chosen, the page is the choice itself. */
export function RunChoice({ task, view, onView }: { task: ConsoleTaskDetail; view: TaskComparisonView; onView: (view: TaskComparisonView) => void }) {
  const { t } = useTranslation();
  return (
    <section className={styles.choice}>
      <header className={styles.head}>
        <h2 className="t-label">{t('console.task.compare.pickTitle')}</h2>
        <InfoHint label={t('ui.about', { subject: t('console.task.compare.pickTitle') })}>{t('console.task.compare.pickHint', { max: MAX_COMPARED_RUNS, open: MAX_OPENED_RUNS })}</InfoHint>
      </header>
      <Suspense fallback={<Loading />}>
        <EntrantRuns task={task} view={view} onView={onView} />
      </Suspense>
    </section>
  );
}

/** Every combination's runs of the task as chips that add a run to the comparison or take it out. */
export function EntrantRuns({ task, view, onView }: { task: ConsoleTaskDetail; view: TaskComparisonView; onView: (view: TaskComparisonView) => void }) {
  const { t } = useTranslation();
  const { entrants } = useTaskResults(task.benchmark.id, task.id);
  return (
    <ul className={styles.entrants}>
      {entrants.map(({ model, harness, runs }) => (
        <li key={`${model.id}-${harness.id}`} className={styles.entrant}>
          <span className={styles.entrantName}><VendorBadge model={model} /><span className="t-small">{model.name}</span><span className="t-micro c-faint">{harness.name}</span></span>
          <span className={styles.chips}>
            {runs.map(run => {
              const chosen = view.runs.includes(run.id);
              return (
                <button
                  key={run.id} type="button" className={clsx(controls.pill, controls.small, 'loop-edge')} aria-pressed={chosen}
                  disabled={!chosen && view.runs.length >= MAX_COMPARED_RUNS} onClick={() => onView(withComparedRun(view, run.id))}
                  aria-label={t('console.task.runs.runOf', { attempt: run.attempt, outcome: t(`runs.outcome.${run.outcome}`) })}
                >
                  <OutcomeDot outcome={run.outcome} />{run.attempt}
                </button>
              );
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The comparison: a column per run, a row per part of each block; then the opened runs whole. */
export function ComparedRuns({ task, runIds, view, onView }: { task: ConsoleTaskDetail; runIds: string[]; view: TaskComparisonView; onView: (view: TaskComparisonView) => void }) {
  const { t } = useTranslation();
  const comparison = useTaskComparison(task.benchmark.id, task.id, runIds);
  const opened = comparison.runs.filter(run => view.open.includes(run.id));
  const chooser = (
    <Popover.Root>
      <Popover.Trigger className={clsx(controls.pill, controls.small, styles.choose, 'loop-edge')}>
        {t('console.task.compare.pick')}<span className="t-numeric c-muted">{view.runs.length} / {MAX_COMPARED_RUNS}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={styles.chooser} align="start" sideOffset={8} collisionPadding={12}>
          <Suspense fallback={<Loading />}><EntrantRuns task={task} view={view} onView={onView} /></Suspense>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
  return (
    <>
      <ComparisonTable columns={comparison.runs.length} label={t('console.task.compare.label')}>
        <BlockHead title={t('console.task.compare.runs')} hint={t('console.task.compare.pickHint', { max: MAX_COMPARED_RUNS, open: MAX_OPENED_RUNS })} aside={chooser}>
          {comparison.runs.map((run, index) => (
            <Cell key={run.id}>
              <RunHead run={run} numeral={runNumeralOf(index)}>
                <RunActions task={task} run={run} view={view} onView={onView} />
              </RunHead>
            </Cell>
          ))}
        </BlockHead>
        {comparison.blocks.map(block => {
          const { Overview } = COMPARISON_BLOCKS[block];
          return <Overview key={block} comparison={comparison} />;
        })}
      </ComparisonTable>
      {opened.length > 0 && <OpenedRuns comparison={comparison} opened={opened} view={view} onView={onView} />}
    </>
  );
}

/** The opened runs side by side, every block whole. */
export function OpenedRuns({ comparison, opened, view, onView }: { comparison: TaskComparison; opened: ComparedRun[]; view: TaskComparisonView; onView: (view: TaskComparisonView) => void }) {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<Loading />}>
      <ComparisonTable columns={opened.length} label={t('console.task.compare.detailLabel')}>
        <BlockHead title={t('console.task.compare.detail')} hint={t('console.task.compare.detailHint', { open: MAX_OPENED_RUNS })}>
          {opened.map(run => (
            <Cell key={run.id}>
              <RunHead run={run} numeral={runNumeralOf(comparison.runs.indexOf(run))}>
                <button type="button" className={clsx(controls.pill, controls.small, 'loop-edge')} aria-pressed onClick={() => onView(withOpenedRun(view, run.id))}>
                  {t('console.task.compare.close')}
                </button>
              </RunHead>
            </Cell>
          ))}
        </BlockHead>
        {comparison.blocks.map(block => {
          const { Detail } = COMPARISON_BLOCKS[block];
          return <Detail key={block} comparison={comparison} opened={opened} labels={view.labels} onLabel={label => onView(withLabel(view, label))} />;
        })}
      </ComparisonTable>
    </Suspense>
  );
}

/** Who ran a run and what came of it, under the numeral the comparison gives it. */
export function RunHead({ run, numeral, children }: { run: ComparedRun; numeral: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className={styles.runHead}>
      <p className={styles.runName}>
        <span className={styles.numeral}>{numeral}</span>
        <VendorBadge model={run.model} />
        <span className="t-label">{run.model.name}</span>
        <span className="t-small c-muted">{run.harness.name} · {t('console.task.compare.attempt', { attempt: run.attempt })}</span>
      </p>
      <p className={styles.runFacts}>
        <OutcomeBadge outcome={run.outcome} />
        {run.outcome === 'failed' && <FailureClassTag failureClass={run.failureClass} />}
        <span className="t-micro c-muted">{t('benchmarks.minutes', { count: run.metrics.durationMinutes })} · {formatCost(run.metrics.costUsd)}</span>
      </p>
      <p className={styles.runActions}>{children}</p>
    </div>
  );
}

/** Opening a run below, going to its own page or its files, and taking it out of the comparison. */
export function RunActions({ task, run, view, onView }: { task: ConsoleTaskDetail; run: ComparedRun; view: TaskComparisonView; onView: (view: TaskComparisonView) => void }) {
  const { t } = useTranslation();
  const opened = view.open.includes(run.id);
  return (
    <>
      <button type="button" className={clsx(controls.pill, controls.small, 'loop-edge')} aria-pressed={opened} onClick={() => onView(withOpenedRun(view, run.id))}>
        {opened ? t('console.task.compare.close') : t('console.task.compare.open')}
      </button>
      <Hint content={t('console.task.compare.toRun')}>
        <LocaleLink className={styles.icon} to={consoleRunPath(task.benchmark.id, run.id)} aria-label={t('console.task.compare.toRun')}>
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M4 2.5h5.5V8M9.5 2.5 2.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </LocaleLink>
      </Hint>
      {run.huggingFaceUrl && (
        <Hint content={t('console.task.compare.rawFiles')}>
          <a className={styles.icon} href={run.huggingFaceUrl} target="_blank" rel="noreferrer" aria-label={t('console.task.compare.rawFiles')}>
            <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 1.5h4l2.5 2.5v6.5H3zM7 1.5V4h2.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
          </a>
        </Hint>
      )}
      <Hint content={t('console.task.compare.remove')}>
        <button type="button" className={styles.icon} aria-label={t('console.task.compare.remove')} onClick={() => onView(withComparedRun(view, run.id))}>
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="m3 3 6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        </button>
      </Hint>
    </>
  );
}
