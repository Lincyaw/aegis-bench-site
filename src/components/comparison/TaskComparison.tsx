import * as Popover from '@radix-ui/react-popover';
import { clsx } from 'clsx';
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ComparedRun, HarnessRef, ModelRef, RunOutcome, TaskComparison, Trajectory } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import {
  LIST_SEPARATOR, MAX_COMPARED_RUNS, MAX_PANEL_TRAJECTORIES, withComparedRun, withExpanded, withLabel, withPanelRun, withTrajectory,
  type ComparisonView,
} from '../../routes/comparison';
import { Loading } from '../../ui/content';
import controls from '../../ui/controls.module.css';
import { Hint, InfoHint } from '../../ui/hint';
import { VendorBadge } from '../model/ModelBadge';
import { FailureClassTag } from '../result/FailureClassTag';
import { formatCost } from '../result/presentation';
import { HuggingFaceBoundary } from '../run/HuggingFace';
import { OutcomeBadge, OutcomeDot } from '../run/Outcome';
import { PanelTrajectories } from '../trajectory/AnnotatedTrajectory';
import { COMPARISON_BLOCKS } from './blocks';
import { runNumeralOf } from './comparison';
import { BlockHead, Cell, ComparisonTable } from './ComparisonTable';
import styles from './TaskComparison.module.css';

/*
 * A task's runs side by side, as the console's task page and the public run records both show them: the task's runs to
 * choose from, the overview with a column per run, and the runs opened below whole. Each site lends the comparison how
 * it reads what it shows and where a run's own page is.
 */

/** A combination with its runs of the task, which the comparison offers to choose from. */
export interface Entrant {
  model: ModelRef;
  harness: HarnessRef;
  runs: { id: string; attempt: number; outcome: RunOutcome }[];
}

/** What a site lends its comparison: how to read the comparison and whole trajectories, and where a run's own page is. */
export interface ComparisonSource {
  useComparison: (runIds: string[]) => TaskComparison;
  useTrajectories: (runIds: string[]) => Trajectory[];
  runPath: (runId: string) => string;
}

/** What every run received, its first lines until asked for the whole. */
export function TaskInput({ instruction, reportSchema }: { instruction: string; reportSchema?: string }) {
  const { t } = useTranslation();
  const [whole, setWhole] = useState(false);
  return (
    <section className={styles.input}>
      <header className={styles.head}>
        <h2 className="t-label">{t('compare.input')}</h2>
        <InfoHint label={t('ui.about', { subject: t('compare.input') })}>{t('compare.inputHint')}</InfoHint>
        <button type="button" className={clsx(controls.textLink, styles.whole, 't-micro')} aria-expanded={whole} onClick={() => setWhole(!whole)}>
          {whole ? t('compare.collapseInput') : t('compare.expandInput')}
        </button>
      </header>
      <p className={clsx(styles.instruction, !whole && styles.clamped)}>{instruction}</p>
      {whole && reportSchema && <pre className={styles.schema}>{reportSchema}</pre>}
    </section>
  );
}

/** Before any run is chosen, the comparison is the choice itself. */
export function RunChoice({ entrants, view, onView }: { entrants: Entrant[]; view: ComparisonView; onView: (view: ComparisonView) => void }) {
  const { t } = useTranslation();
  return (
    <section className={styles.choice}>
      <header className={styles.head}>
        <h2 className="t-label">{t('compare.pickTitle')}</h2>
        <InfoHint label={t('ui.about', { subject: t('compare.pickTitle') })}>{t('compare.pickHint', { max: MAX_COMPARED_RUNS, open: MAX_PANEL_TRAJECTORIES })}</InfoHint>
      </header>
      <EntrantRuns entrants={entrants} view={view} onView={onView} />
    </section>
  );
}

/** Every combination's runs of the task as chips that add a run to the comparison or take it out. */
export function EntrantRuns({ entrants, view, onView }: { entrants: Entrant[]; view: ComparisonView; onView: (view: ComparisonView) => void }) {
  const { t } = useTranslation();
  const list = useRef<HTMLUListElement>(null);
  const [widths, setWidths] = useState<{ name: number; runs: number }>();
  useLayoutEffect(() => {
    const listElement = list.current;
    if (!listElement) {
      throw new Error('The run choice renders its list before its layout effect runs');
    }
    // A range spans a part's contents at their own width, whatever width the part itself is given.
    const widest = (selector: string) => Math.ceil(Math.max(...[...listElement.querySelectorAll(selector)].map(part => {
      const range = document.createRange();
      range.selectNodeContents(part);
      return range.getBoundingClientRect().width;
    })));
    const measure = () => setWidths({ name: widest(`.${styles.entrantName}`), runs: widest(`.${styles.chips}`) });
    measure();
    // Names change width when the fonts arrive.
    void document.fonts.ready.then(measure);
  }, [entrants]);
  return (
    <ul ref={list} className={styles.entrants} style={widths && { '--name-width': `${widths.name}px`, '--runs-width': `${widths.runs}px` } as CSSProperties}>
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
                  aria-label={t('compare.runOf', { attempt: run.attempt, outcome: t(`runs.outcome.${run.outcome}`) })}
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

/**
 * The comparison: a column per run, a row per part of each block, each item opening in place; a run's trajectory opens
 * in the side panel.
 */
export function ComparedRuns({ runIds, entrants, source, view, onView }: {
  runIds: string[]; entrants: Entrant[]; source: ComparisonSource; view: ComparisonView; onView: (view: ComparisonView) => void;
}) {
  const { t } = useTranslation();
  const comparison = source.useComparison(runIds);
  const shown = comparison.runs.filter(run => view.trajectory.includes(run.id));
  const chooser = (
    <Popover.Root>
      <Popover.Trigger className={clsx(controls.pill, controls.small, styles.choose, 'loop-edge')}>
        {t('compare.pick')}<span className="t-numeric c-muted">{view.runs.length} / {MAX_COMPARED_RUNS}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={styles.chooser} align="start" sideOffset={8} collisionPadding={12}>
          <EntrantRuns entrants={entrants} view={view} onView={onView} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
  return (
    <>
      <ComparisonTable columns={comparison.runs.length} label={t('compare.label')}>
        <BlockHead title={t('compare.runs')} hint={t('compare.pickHint', { max: MAX_COMPARED_RUNS, open: MAX_PANEL_TRAJECTORIES })} aside={chooser}>
          {comparison.runs.map((run, index) => (
            <Cell key={run.id}>
              <RunHead run={run} numeral={runNumeralOf(index)}>
                <RunActions run={run} runPath={source.runPath} view={view} onView={onView} />
              </RunHead>
            </Cell>
          ))}
        </BlockHead>
        {comparison.blocks.map(block => {
          const Block = COMPARISON_BLOCKS[block];
          return (
            <Block
              key={block} comparison={comparison} expanded={view.expand}
              onExpand={keys => onView(withExpanded(view, keys))} onTrajectory={run => onView(withTrajectory(view, run))}
            />
          );
        })}
      </ComparisonTable>
      {shown.length > 0 && <TrajectoryPanel comparison={comparison} shown={shown} source={source} view={view} onView={onView} />}
    </>
  );
}

/**
 * The side panel the trajectory block opens: one run's trajectory, or two side by side, over the window's right edge
 * while the comparison stays in reach. Its numerals choose the runs; Escape or its close button closes it.
 */
export function TrajectoryPanel({ comparison, shown, source, view, onView }: {
  comparison: TaskComparison; shown: ComparedRun[]; source: ComparisonSource; view: ComparisonView; onView: (view: ComparisonView) => void;
}) {
  const { t } = useTranslation();
  const close = () => onView({ ...view, trajectory: [] });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });
  return (
    <aside className={clsx(styles.panel, shown.length > 1 && styles.pair)} aria-label={t('compare.panel.label')}>
      <header className={styles.panelHead}>
        <h2 className="t-label">{t('compare.blocks.trajectory.title')}</h2>
        <span className={styles.panelRuns} role="group" aria-label={t('compare.panel.runs', { max: MAX_PANEL_TRAJECTORIES })}>
          {comparison.runs.map((run, index) => (
            <Hint key={run.id} content={`${run.model.name} · ${run.harness.name} · ${t('compare.attempt', { attempt: run.attempt })}`}>
              <button type="button" className={clsx(controls.pill, controls.small, 'loop-edge')} aria-pressed={view.trajectory.includes(run.id)} onClick={() => onView(withPanelRun(view, run.id))}>
                {runNumeralOf(index)}
              </button>
            </Hint>
          ))}
        </span>
        <button type="button" className={styles.icon} aria-label={t('compare.panel.close')} onClick={close}>
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="m3 3 6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        </button>
      </header>
      <div className={styles.panelScroll}>
        <HuggingFaceBoundary resetKey={view.trajectory.join(LIST_SEPARATOR)}>
          <Suspense fallback={<Loading />}>
            <PanelTrajectories comparison={comparison} shown={shown} labels={view.labels} onLabel={label => onView(withLabel(view, label))} useTrajectories={source.useTrajectories} />
          </Suspense>
        </HuggingFaceBoundary>
      </div>
    </aside>
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
        <span className="t-small c-muted">{run.harness.name} · {t('compare.attempt', { attempt: run.attempt })}</span>
      </p>
      <p className={styles.runFacts}>
        <OutcomeBadge outcome={run.outcome} />
        {/* A failure shows its review's class, or that it is unreviewed; the public site has the review without the class. */}
        {run.outcome === 'failed' && (run.failureClass || !run.review) && <FailureClassTag failureClass={run.failureClass} />}
        <span className="t-micro c-muted">{t('benchmarks.minutes', { count: run.metrics.durationMinutes })} · {formatCost(run.metrics.costUsd)}</span>
      </p>
      <p className={styles.runActions}>{children}</p>
    </div>
  );
}

/** Going to a run's own page or its files, and taking it out of the comparison. */
export function RunActions({ run, runPath, view, onView }: { run: ComparedRun; runPath: (runId: string) => string; view: ComparisonView; onView: (view: ComparisonView) => void }) {
  const { t } = useTranslation();
  return (
    <>
      <Hint content={t('compare.toRun')}>
        <LocaleLink className={styles.icon} to={runPath(run.id)} aria-label={t('compare.toRun')}>
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M4 2.5h5.5V8M9.5 2.5 2.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </LocaleLink>
      </Hint>
      {run.huggingFaceUrl && (
        <Hint content={t('compare.rawFiles')}>
          <a className={styles.icon} href={run.huggingFaceUrl} target="_blank" rel="noreferrer" aria-label={t('compare.rawFiles')}>
            <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 1.5h4l2.5 2.5v6.5H3zM7 1.5V4h2.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
          </a>
        </Hint>
      )}
      <Hint content={t('compare.remove')}>
        <button type="button" className={styles.icon} aria-label={t('compare.remove')} onClick={() => onView(withComparedRun(view, run.id))}>
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="m3 3 6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        </button>
      </Hint>
    </>
  );
}
