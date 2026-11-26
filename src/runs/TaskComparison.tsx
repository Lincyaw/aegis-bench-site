import * as Popover from '@radix-ui/react-popover';
import { clsx } from 'clsx';
import { Suspense, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ComparedRun, ComparisonBlock, HarnessRef, ModelRef, RunOutcome, TaskComparison, Trajectory } from '../api/types';
import { LocaleLink } from '../i18n/LocaleRouting';
import { VendorBadge } from '../models/ModelBadge';
import { FailureClassTag } from '../results/FailureClassTag';
import { formatCost } from '../results/presentation';
import { Loading } from '../ui/content';
import controls from '../ui/controls.module.css';
import { Hint, InfoHint } from '../ui/hint';
import {
  MAX_COMPARED_RUNS, MAX_OPENED_RUNS, detailAnchorOf, runNumeralOf, withComparedRun, withLabel, withOpenedRun, type ComparisonView,
} from './comparison';
import { COMPARISON_BLOCKS } from './comparisonBlocks';
import { BlockHead, Cell, ComparisonTable } from './ComparisonTable';
import { OutcomeBadge, OutcomeDot } from './Outcome';
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
        <InfoHint label={t('ui.about', { subject: t('compare.pickTitle') })}>{t('compare.pickHint', { max: MAX_COMPARED_RUNS, open: MAX_OPENED_RUNS })}</InfoHint>
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

/** The comparison: a column per run, a row per part of each block; then the opened runs whole. */
export function ComparedRuns({ runIds, entrants, source, view, onView }: {
  runIds: string[]; entrants: Entrant[]; source: ComparisonSource; view: ComparisonView; onView: (view: ComparisonView) => void;
}) {
  const { t } = useTranslation();
  const comparison = source.useComparison(runIds);
  const opened = comparison.runs.filter(run => view.open.includes(run.id));
  const [focus, setFocus] = useState<ComparisonBlock>();
  const openAt = (block: ComparisonBlock) => (runId: string) => {
    if (!view.open.includes(runId)) {
      onView(withOpenedRun(view, runId));
    }
    setFocus(block);
  };
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
        <BlockHead title={t('compare.runs')} hint={t('compare.pickHint', { max: MAX_COMPARED_RUNS, open: MAX_OPENED_RUNS })} aside={chooser}>
          {comparison.runs.map((run, index) => (
            <Cell key={run.id}>
              <RunHead run={run} numeral={runNumeralOf(index)}>
                <RunActions run={run} runPath={source.runPath} view={view} onView={onView} />
              </RunHead>
            </Cell>
          ))}
        </BlockHead>
        {comparison.blocks.map(block => {
          const { Overview } = COMPARISON_BLOCKS[block];
          return <Overview key={block} comparison={comparison} onOpen={openAt(block)} />;
        })}
      </ComparisonTable>
      {opened.length > 0 && (
        <Suspense fallback={<Loading />}>
          <OpenedRuns comparison={comparison} opened={opened} source={source} view={view} onView={onView} focus={focus} onFocused={setFocus} />
        </Suspense>
      )}
    </>
  );
}

/**
 * The opened runs side by side, every block whole. A block an overview opened a run from is brought into view once
 * the runs' records have arrived.
 */
export function OpenedRuns({ comparison, opened, source, view, onView, focus, onFocused }: {
  comparison: TaskComparison; opened: ComparedRun[]; source: ComparisonSource; view: ComparisonView; onView: (view: ComparisonView) => void;
  focus: ComparisonBlock | undefined; onFocused: (focus: undefined) => void;
}) {
  const { t } = useTranslation();
  useLayoutEffect(() => {
    if (focus) {
      const head = document.getElementById(detailAnchorOf(focus));
      if (!head) {
        throw new Error(`the ${focus} block opens runs from its overview but its detail has no anchor`);
      }
      head.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onFocused(undefined);
    }
  }, [focus, onFocused]);
  return (
    <ComparisonTable columns={opened.length} label={t('compare.detailLabel')}>
      <BlockHead title={t('compare.detail')} hint={t('compare.detailHint', { open: MAX_OPENED_RUNS })}>
        {opened.map(run => (
          <Cell key={run.id}>
            <RunHead run={run} numeral={runNumeralOf(comparison.runs.indexOf(run))}>
              <button type="button" className={clsx(controls.pill, controls.small, 'loop-edge')} aria-pressed onClick={() => onView(withOpenedRun(view, run.id))}>
                {t('compare.close')}
              </button>
            </RunHead>
          </Cell>
        ))}
      </BlockHead>
      {comparison.blocks.map(block => {
        const { Detail } = COMPARISON_BLOCKS[block];
        return (
          <Detail
            key={block} comparison={comparison} opened={opened} labels={view.labels} onLabel={label => onView(withLabel(view, label))}
            useTrajectories={source.useTrajectories}
          />
        );
      })}
    </ComparisonTable>
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

/** Opening a run below, going to its own page or its files, and taking it out of the comparison. */
export function RunActions({ run, runPath, view, onView }: { run: ComparedRun; runPath: (runId: string) => string; view: ComparisonView; onView: (view: ComparisonView) => void }) {
  const { t } = useTranslation();
  const opened = view.open.includes(run.id);
  return (
    <>
      <button type="button" className={clsx(controls.pill, controls.small, 'loop-edge')} aria-pressed={opened} onClick={() => onView(withOpenedRun(view, run.id))}>
        {opened ? t('compare.close') : t('compare.open')}
      </button>
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
