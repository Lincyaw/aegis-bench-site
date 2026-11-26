import type { ComponentType } from 'react';
import { annotationSeverityValues } from '../api/schema';
import type { AnnotationCategory, AnnotationSeverity, ComparedRun, ComparisonBlock, StepAnnotation, TaskComparison, Trajectory, TrajectoryStep } from '../api/types';

/*
 * How a comparison of a task's runs is read: the numerals that tell its runs apart, the contract every block of the
 * comparison keeps, and how annotated steps and submissions are found in a run.
 */

/** Runs are told apart by Roman numeral in the order they were chosen; letters already name vendors and harnesses. */
export const RUN_NUMERALS = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'] as const;

export function runNumeralOf(index: number): string {
  const numeral = RUN_NUMERALS[index];
  if (numeral === undefined) {
    throw new Error(`no numeral for run ${index + 1}`);
  }
  return numeral;
}

/** The run's numeral in the comparison. */
export function numeralOfRun(comparison: TaskComparison, runId: string): string {
  return runNumeralOf(comparison.runs.findIndex(run => run.id === runId));
}

/** The most runs a comparison holds, as the spec declares, and the most opened in detail side by side. */
export const MAX_COMPARED_RUNS = 4;
export const MAX_OPENED_RUNS = 2;

/** The runs a comparison sets side by side, the ones opened in detail, and the labels their trajectories are filtered to. */
export interface ComparisonView {
  runs: string[];

  /** Each one of runs */
  open: string[];

  /** Annotation categories; every step shows when empty */
  labels: string[];
}

/** A list in the address is its ids joined by commas. */
export const LIST_SEPARATOR = ',';

/** The address parameters a comparison keeps its state in. */
export const COMPARISON_PARAMS = ['runs', 'open', 'labels'] as const satisfies readonly (keyof ComparisonView)[];

/** A comparison's state from an address; more runs than a comparison holds, or an opened run it does not hold, fails the page. */
export function parseComparisonView(params: URLSearchParams): ComparisonView {
  const [runs, open, labels] = COMPARISON_PARAMS.map(name => params.get(name)?.split(LIST_SEPARATOR) ?? []);
  if (runs.length > MAX_COMPARED_RUNS || new Set(runs).size < runs.length) {
    throw new Error(`a comparison holds at most ${MAX_COMPARED_RUNS} different runs`);
  }
  if (open.length > MAX_OPENED_RUNS || !open.every(run => runs.includes(run))) {
    throw new Error(`at most ${MAX_OPENED_RUNS} of the compared runs open in detail`);
  }
  return { runs, open, labels };
}

/** Writes a comparison's state into address parameters, leaving out its empty lists. */
export function setComparisonParams(params: URLSearchParams, view: Partial<ComparisonView>) {
  for (const name of COMPARISON_PARAMS) {
    if (view[name]?.length) {
      params.set(name, view[name].join(LIST_SEPARATOR));
    }
  }
}

/** Adds a run to the comparison or takes it out, closing its detail with it. */
export function withComparedRun<View extends ComparisonView>(view: View, run: string): View {
  return view.runs.includes(run)
    ? { ...view, runs: view.runs.filter(id => id !== run), open: view.open.filter(id => id !== run) }
    : { ...view, runs: [...view.runs, run] };
}

/** Opens a compared run's detail or closes it; opening one more than fits closes the earliest opened. */
export function withOpenedRun<View extends ComparisonView>(view: View, run: string): View {
  return { ...view, open: view.open.includes(run) ? view.open.filter(id => id !== run) : [...view.open, run].slice(-MAX_OPENED_RUNS) };
}

/** Shows or stops showing the steps an annotation category labels. */
export function withLabel<View extends ComparisonView>(view: View, label: string): View {
  return { ...view, labels: view.labels.includes(label) ? view.labels.filter(id => id !== label) : [...view.labels, label] };
}

export interface BlockProps {
  comparison: TaskComparison;
}

export interface OverviewProps extends BlockProps {
  /** Opens a run below and brings the block's detail into view; the detail's head carries the block's anchor */
  onOpen: (runId: string) => void;
}

/** The id of a block's head among the opened runs, where opening a run from the block's overview scrolls to. */
export function detailAnchorOf(block: ComparisonBlock): string {
  return `compare-${block}`;
}

export interface DetailProps extends BlockProps {
  /** The runs opened in detail, in the comparison's order */
  opened: ComparedRun[];

  /** The annotation categories the trajectories show; every step when empty */
  labels: string[];

  onLabel: (category: string) => void;

  /** Reads the opened runs' whole trajectories, from the public site's API or the console's */
  useTrajectories: (runIds: string[]) => Trajectory[];
}

/** A block shows a row in the overview, a cell per compared run, and its whole content for the runs opened in detail. */
export interface BlockParts {
  Overview: ComponentType<OverviewProps>;
  Detail: ComponentType<DetailProps>;
}

/** The category an annotation names, which the benchmark must declare. */
export function categoryOf(categories: AnnotationCategory[], annotation: StepAnnotation): AnnotationCategory {
  const category = categories.find(candidate => candidate.id === annotation.category);
  if (!category) {
    throw new Error(`no annotation category ${annotation.category}`);
  }
  return category;
}

/** The severity that calls most for attention among a step's labels; the spec declares severities from the most. */
export function mostSevere(categories: AnnotationCategory[], annotations: StepAnnotation[]): AnnotationSeverity | undefined {
  const severities = new Set(annotations.map(annotation => categoryOf(categories, annotation).severity));
  return annotationSeverityValues.find(severity => severities.has(severity));
}

/** A run's steps cut after each submission the server marked, so the runs line up submission by submission. */
export function segmentsOf(steps: TrajectoryStep[], run: ComparedRun): TrajectoryStep[][] {
  const submissions = new Set(run.timeline.filter(step => step.mark === 'submitPassed' || step.mark === 'submitFailed').map(step => step.stepId));
  return steps.reduce<TrajectoryStep[][]>((segments, step) => {
    const last = segments.at(-1);
    const open = last && !submissions.has(last.at(-1)?.step_id ?? -1) ? last : undefined;
    return open ? [...segments.slice(0, -1), [...open, step]] : [...segments, [step]];
  }, []);
}
