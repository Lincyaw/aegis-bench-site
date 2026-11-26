import type { ComponentType } from 'react';
import { consoleAnnotationSeverityValues } from '../api/schema';
import type { AnnotationCategory, AnnotationSeverity, ComparedRun, StepAnnotation, TaskComparison, TrajectoryStep } from '../api/types';

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

export interface BlockProps {
  comparison: TaskComparison;
}

export interface DetailProps extends BlockProps {
  /** The runs opened in detail, in the comparison's order */
  opened: ComparedRun[];

  /** The annotation categories the trajectories show; every step when empty */
  labels: string[];

  onLabel: (category: string) => void;
}

/** A block shows a row in the overview, a cell per compared run, and its whole content for the runs opened in detail. */
export interface BlockParts {
  Overview: ComponentType<BlockProps>;
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
  return consoleAnnotationSeverityValues.find(severity => severities.has(severity));
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
