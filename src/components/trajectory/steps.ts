import { annotationSeverityValues } from '../../api/schema';
import type { AnnotationCategory, AnnotationSeverity, ComparedRun, StepAnnotation, TrajectoryStep } from '../../api/types';

/* How a trajectory's steps are read: what a step records, the labels annotators gave it, and where submissions cut a run. */

export function textOf(content: TrajectoryStep['message'] | undefined): string {
  if (content === undefined) {
    return '';
  }
  return typeof content === 'string' ? content : content.map(part => (part.type === 'text' ? part.text : `[${part.type}]`)).join('\n');
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
    const open = last && !submissions.has(last[last.length - 1].step_id) ? last : undefined;
    return open ? [...segments.slice(0, -1), [...open, step]] : [...segments, [step]];
  }, []);
}
