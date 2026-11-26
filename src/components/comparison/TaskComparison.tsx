import * as Popover from '@radix-ui/react-popover';
import { clsx } from 'clsx';
import { Suspense, useDeferredValue, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_COMPARED_RUNS, combinationKey } from '../../api/constraints';
import type { CombinationRuns, ComparedRun, TaskComparison } from '../../api/types';
import {
  LIST_SEPARATOR, MAX_PANEL_TRAJECTORIES, closePanel, showInPanel, toggleComparedRun, toggleExpanded, toggleLabel, togglePanelRun, type ComparisonView,
} from '../../routes/comparison';
import { Loading } from '../../ui/content';
import { CloseIcon, FileIcon, IconButton, LinkArrowIcon } from '../../ui/controls';
import controls from '../../ui/controls.module.css';
import { Hint, InfoHint } from '../../ui/hint';
import hint from '../../ui/hint.module.css';
import { CombinationLabel, VendorBadge } from '../model/ModelBadge';
import { FailureClassTag } from '../result/FailureClassTag';
import { formatCost } from '../result/presentation';
import { HuggingFaceBoundary } from '../run/HuggingFace';
import { OutcomeBadge, OutcomeDot } from '../run/Outcome';
import { PanelTrajectories } from '../trajectory/AnnotatedTrajectory';
import { COMPARISON_BLOCKS } from './blocks';
import { numeralAt, type ComparisonSource } from './comparison';
import { BlockHead, Cell, ComparisonTable } from './ComparisonTable';
import results from './ResultBlocks.module.css';
import styles from './TaskComparison.module.css';

/*
 * A task's runs side by side, as the console's task page and the public run records both show them: the task's runs to
 * choose from, a column per run whose rows open in place, and a side panel for whole trajectories. Each site lends the
 * comparison how it reads what it shows and where a run's own page is.
 */

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
      <p className={clsx(styles.instruction, !whole && results.clamped)}>{instruction}</p>
      {whole && reportSchema && <pre className={styles.schema}>{reportSchema}</pre>}
    </section>
  );
}

/**
 * The comparison of a task's runs as a page shows it: a way in to the choice until a run is chosen, then the chosen
 * runs side by side, or, when their records on Hugging Face cannot be read, a note saying so in their place.
 */
export function RunComparison({ entrants, source, view, onView }: {
  entrants: CombinationRuns[]; source: ComparisonSource; view: ComparisonView; onView: (view: ComparisonView) => void;
}) {
  return view.compared.length > 0 ? (
    <HuggingFaceBoundary resetKey={view.compared.join(LIST_SEPARATOR)}>
      <Suspense fallback={<Loading />}>
        <ComparedRuns entrants={entrants} source={source} view={view} onView={onView} />
      </Suspense>
    </HuggingFaceBoundary>
  ) : <RunChoice entrants={entrants} view={view} onView={onView} />;
}

/** Before any run is chosen, the comparison is a way in to the choice, which opens over the page instead of filling it. */
export function RunChoice({ entrants, view, onView }: { entrants: CombinationRuns[]; view: ComparisonView; onView: (view: ComparisonView) => void }) {
  const { t } = useTranslation();
  return (
    <section className={styles.choice}>
      <header className={styles.head}>
        <h2 className="t-label">{t('compare.pickTitle')}</h2>
        <InfoHint label={t('ui.about', { subject: t('compare.pickTitle') })}>{t('compare.pickHint', { max: MAX_COMPARED_RUNS, open: MAX_PANEL_TRAJECTORIES })}</InfoHint>
      </header>
      <RunChooser entrants={entrants} view={view} onView={onView} />
    </section>
  );
}

/** A pill that counts the runs chosen and opens every run of the task to choose from. */
export function RunChooser({ entrants, view, onView }: { entrants: CombinationRuns[]; view: ComparisonView; onView: (view: ComparisonView) => void }) {
  const { t } = useTranslation();
  return (
    <Popover.Root>
      <Popover.Trigger className={clsx(controls.pill, controls.small, styles.choose, 'loop-edge')}>
        {t('compare.pick')}<span className="t-numeric c-muted">{view.compared.length} / {MAX_COMPARED_RUNS}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={clsx(hint.popover, styles.chooser)} align="start" sideOffset={8} collisionPadding={12}>
          <RunPicker entrants={entrants} view={view} onView={onView} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Every combination's runs of the task as chips that add a run to the comparison or take it out. */
export function RunPicker({ entrants, view, onView }: { entrants: CombinationRuns[]; view: ComparisonView; onView: (view: ComparisonView) => void }) {
  const { t } = useTranslation();
  const list = useRef<HTMLUListElement>(null);
  const [widths, setWidths] = useState<{ name: number; runs: number }>();
  useLayoutEffect(() => {
    const listElement = list.current;
    if (!listElement) {
      throw new Error('The run picker renders its list before its layout effect runs');
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
        <li key={combinationKey(model.id, harness.id)} className={styles.entrant}>
          <span className={styles.entrantName}><CombinationLabel model={model} harness={harness} /></span>
          <span className={styles.chips}>
            {runs.map(run => {
              const chosen = view.compared.includes(run.id);
              return (
                <button
                  key={run.id} type="button" className={clsx(controls.pill, controls.small, 'loop-edge')} aria-pressed={chosen}
                  disabled={!chosen && view.compared.length >= MAX_COMPARED_RUNS} onClick={() => onView(toggleComparedRun(view, run.id))}
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
export function ComparedRuns({ entrants, source, view, onView }: {
  entrants: CombinationRuns[]; source: ComparisonSource; view: ComparisonView; onView: (view: ComparisonView) => void;
}) {
  const { t } = useTranslation();
  // The runs shown stay until the newly chosen ones load, while the choices show at once.
  const comparison = source.useComparison(useDeferredValue(view.compared.join(LIST_SEPARATOR)).split(LIST_SEPARATOR));
  const shown = comparison.runs.filter(run => view.panel.includes(run.id));
  return (
    <>
      <ComparisonTable columns={comparison.runs.length} label={t('compare.label')}>
        <BlockHead title={t('compare.runs')} hint={t('compare.pickHint', { max: MAX_COMPARED_RUNS, open: MAX_PANEL_TRAJECTORIES })} aside={<RunChooser entrants={entrants} view={view} onView={onView} />}>
          {comparison.runs.map((run, index) => (
            <Cell key={run.id}>
              <RunHead run={run} numeral={numeralAt(index)}>
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
              onExpand={keys => onView(toggleExpanded(view, keys))} onTrajectory={run => onView(showInPanel(view, run))}
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
  const close = () => onView(closePanel(view));
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
              <button type="button" className={clsx(controls.pill, controls.small, 'loop-edge')} aria-pressed={view.panel.includes(run.id)} onClick={() => onView(togglePanelRun(view, run.id))}>
                {numeralAt(index)}
              </button>
            </Hint>
          ))}
        </span>
        <IconButton label={t('compare.panel.close')} variant="quiet" size="small" onClick={close}><CloseIcon /></IconButton>
      </header>
      <div className={styles.panelScroll}>
        <HuggingFaceBoundary resetKey={view.panel.join(LIST_SEPARATOR)}>
          <Suspense fallback={<Loading />}>
            <PanelTrajectories comparison={comparison} shown={shown} labels={view.labels} onLabel={label => onView(toggleLabel(view, label))} source={source} />
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
        <IconButton label={t('compare.toRun')} variant="quiet" size="small" to={runPath(run.id)}><LinkArrowIcon /></IconButton>
      </Hint>
      {run.huggingFaceUrl && (
        <Hint content={t('compare.rawFiles')}>
          <IconButton label={t('compare.rawFiles')} variant="quiet" size="small" href={run.huggingFaceUrl}><FileIcon /></IconButton>
        </Hint>
      )}
      <Hint content={t('compare.remove')}>
        <IconButton label={t('compare.remove')} variant="quiet" size="small" onClick={() => onView(toggleComparedRun(view, run.id))}><CloseIcon /></IconButton>
      </Hint>
    </>
  );
}
