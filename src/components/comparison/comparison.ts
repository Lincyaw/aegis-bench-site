import { annotationSeverityValues } from '../../api/schema';
import type { AnnotationCategory, AnnotationSeverity, ComparedRun, StepAnnotation, TaskComparison, Trajectory, TrajectoryStep } from '../../api/types';

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

/** The key a row of a block opens in place by: the block's kind of row and, for a row per item, the item. */
export function rowKeyOf(kind: 'file' | 'check' | 'reply' | 'review', item?: string): string {
  return item === undefined ? kind : `${kind}:${item}`;
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
