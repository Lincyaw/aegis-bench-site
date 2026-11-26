import { annotationSeverityValues } from '../api/schema';
import type { AnnotationCategory, AnnotationSeverity, ComparedRun, StepAnnotation, TaskComparison, Trajectory, TrajectoryStep } from '../api/types';

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

/** The most runs a comparison holds, as the spec declares, and the most whose trajectories the side panel sets side by side. */
export const MAX_COMPARED_RUNS = 4;
export const MAX_PANEL_TRAJECTORIES = 2;

/**
 * A comparison's state: the runs set side by side, the rows opened in place, the runs whose trajectories the side
 * panel shows, and the labels those trajectories are filtered to.
 */
export interface ComparisonView {
  runs: string[];

  /** Rows opened in place, each named as rowKeyOf names it */
  expand: string[];

  /** Each one of runs; the side panel is closed when empty */
  trajectory: string[];

  /** Annotation categories; every step shows when empty */
  labels: string[];
}

/** A list in the address is its ids joined by commas. */
export const LIST_SEPARATOR = ',';

/** The address parameters a comparison keeps its state in. */
export const COMPARISON_PARAMS = ['runs', 'expand', 'trajectory', 'labels'] as const satisfies readonly (keyof ComparisonView)[];

/** The key a row of a block opens in place by: the block's kind of row and, for a row per item, the item. */
export function rowKeyOf(kind: 'file' | 'check' | 'reply' | 'review', item?: string): string {
  return item === undefined ? kind : `${kind}:${item}`;
}

/** A comparison's state from an address; more runs than a comparison holds, or a trajectory of a run it does not hold, fails the page. */
export function parseComparisonView(params: URLSearchParams): ComparisonView {
  const [runs, expand, trajectory, labels] = COMPARISON_PARAMS.map(name => params.get(name)?.split(LIST_SEPARATOR) ?? []);
  if (runs.length > MAX_COMPARED_RUNS || new Set(runs).size < runs.length) {
    throw new Error(`a comparison holds at most ${MAX_COMPARED_RUNS} different runs`);
  }
  if (trajectory.length > MAX_PANEL_TRAJECTORIES || !trajectory.every(run => runs.includes(run))) {
    throw new Error(`the side panel shows at most ${MAX_PANEL_TRAJECTORIES} of the compared runs' trajectories`);
  }
  return { runs, expand, trajectory, labels };
}

/** Writes a comparison's state into address parameters, leaving out its empty lists. */
export function setComparisonParams(params: URLSearchParams, view: Partial<ComparisonView>) {
  for (const name of COMPARISON_PARAMS) {
    if (view[name]?.length) {
      params.set(name, view[name].join(LIST_SEPARATOR));
    }
  }
}

/** Adds a run to the comparison or takes it out, and its trajectory out of the side panel with it. */
export function withComparedRun<View extends ComparisonView>(view: View, run: string): View {
  return view.runs.includes(run)
    ? { ...view, runs: view.runs.filter(id => id !== run), trajectory: view.trajectory.filter(id => id !== run) }
    : { ...view, runs: [...view.runs, run] };
}

/** Opens rows in place, or closes them when every one of them is open already. */
export function withExpanded<View extends ComparisonView>(view: View, keys: string[]): View {
  const open = keys.every(key => view.expand.includes(key));
  return { ...view, expand: open ? view.expand.filter(key => !keys.includes(key)) : [...view.expand, ...keys.filter(key => !view.expand.includes(key))] };
}

/** Shows a run's trajectory in the side panel, alone unless the panel shows it already. */
export function withTrajectory<View extends ComparisonView>(view: View, run: string): View {
  return view.trajectory.includes(run) ? view : { ...view, trajectory: [run] };
}

/** Adds a run's trajectory to the side panel or takes it out; adding one more than fits takes out the earliest. */
export function withPanelRun<View extends ComparisonView>(view: View, run: string): View {
  return { ...view, trajectory: view.trajectory.includes(run) ? view.trajectory.filter(id => id !== run) : [...view.trajectory, run].slice(-MAX_PANEL_TRAJECTORIES) };
}

/** Shows or stops showing the steps an annotation category labels. */
export function withLabel<View extends ComparisonView>(view: View, label: string): View {
  return { ...view, labels: view.labels.includes(label) ? view.labels.filter(id => id !== label) : [...view.labels, label] };
}

/**
 * A block's part of the comparison: its rows, a cell per compared run, each item row opening in place; the trajectory
 * block opens a run's trajectory in the side panel instead.
 */
export interface BlockProps {
  comparison: TaskComparison;

  /** The rows open in place */
  expanded: string[];

  /** Opens the rows, or closes them when all are open */
  onExpand: (keys: string[]) => void;

  /** Shows a run's trajectory in the side panel */
  onTrajectory: (runId: string) => void;
}

/** What the side panel needs of the trajectories it shows: the runs, their labels' filter and how to read them. */
export interface PanelProps {
  comparison: TaskComparison;

  /** In the comparison's order */
  shown: ComparedRun[];

  /** The annotation categories the trajectories show; every step when empty */
  labels: string[];

  onLabel: (category: string) => void;

  /** Reads whole trajectories, from the public site's API or the console's */
  useTrajectories: (runIds: string[]) => Trajectory[];
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
