import type {
  AnnotationCategory, BenchmarkFile, ComparedCheck, ComparedFile, ComparedRun, Locale, RunFact, RunFile, StepAnnotation, TaskComparison, TaskRecord, Trajectory,
} from '../api/types';
import { benchmarkOf } from './benchmarks';
import { harnessRef, modelRef } from './catalog';
import { huggingFacePageOf, openedIndexes, readAnnotations, readRunFile, readTrajectory, runDirectoryOf } from './records';
import { timelineOf } from './trajectories';

/*
 * Runs of one task side by side, for checking the task: what each run produced and how it was graded, aligned file by
 * file and check by check, with what sets the runs apart decided here rather than by the page.
 */

/** One run's records as a comparison reads them. */
interface RunRecords {
  fact: RunFact;
  run: RunFile;
  trajectory: Trajectory;
  annotations: StepAnnotation[];
}

/** The labels a benchmark's annotators give steps, in the reader's language. */
export function annotationCategoriesOf(record: BenchmarkFile, locale: Locale): AnnotationCategory[] {
  return (record.annotationCategories ?? []).map(category => ({
    id: category.id, name: category.name[locale], description: category.description[locale], severity: category.severity,
  }));
}

export function comparedRunOf(record: BenchmarkFile, { fact, run, trajectory, annotations }: RunRecords, locale: Locale): ComparedRun {
  const huggingFaceUrl = huggingFacePageOf(record, runDirectoryOf(fact.id));
  return {
    id: fact.id, model: modelRef(fact.modelId, locale), harness: harnessRef(fact.harnessId, locale), attempt: fact.attempt, outcome: fact.outcome,
    metrics: { steps: fact.steps, ...run.metrics, costUsd: fact.costUsd }, passCount: run.grading.passCount,
    submission: { attempt: run.output.submission.attempt, step: run.output.submission.step }, finalReply: run.output.finalReply,
    timeline: timelineOf(trajectory, record.changeTools), annotations,
    ...(fact.failureClass && { failureClass: fact.failureClass }), ...(run.failure?.review && { review: run.failure.review }),
    ...(huggingFaceUrl && { huggingFaceUrl }),
  };
}

/**
 * Every file a run's last submission changed, in the order the runs first name them. A change repeats no earlier run's
 * identical change, and a file differs when a run left it alone or the changes are not all the same.
 */
export function comparedFilesOf(records: RunRecords[]): ComparedFile[] {
  const paths = [...new Set(records.flatMap(({ run }) => run.output.submission.files.map(file => file.path)))];
  return paths.map(path => {
    const changes = records.flatMap(({ fact, run }) => run.output.submission.files.filter(file => file.path === path).map(({ additions, deletions, patch }) => ({
      runId: fact.id, additions, deletions, ...(patch && { patch }),
    })));
    const contentOf = (change: (typeof changes)[number]) => JSON.stringify([change.additions, change.deletions, change.patch ?? []]);
    return {
      path,
      changes: changes.map((change, index) => {
        const same = changes.slice(0, index).find(earlier => contentOf(earlier) === contentOf(change));
        return { ...change, ...(same && { sameAs: same.runId }) };
      }),
      differs: changes.length < records.length || new Set(changes.map(contentOf)).size > 1,
    };
  });
}

/** Every check of the task with each graded run's verdict, what the run produced for it and why it failed. */
export function comparedChecksOf(task: TaskRecord, records: RunRecords[]): ComparedCheck[] {
  const graded = records.filter(({ fact }) => fact.outcome !== 'executionFailed');
  return task.checks.map(check => {
    const verdicts = graded.map(({ fact, run }) => {
      const verdict = run.grading.checks.find(candidate => candidate.id === check.id);
      if (!verdict) {
        throw new Error(`run ${fact.id} has no verdict on check ${check.id} of ${task.id}`);
      }
      const detail = run.failure?.failedChecks.find(failed => failed.id === check.id)?.detail;
      return { runId: fact.id, passed: verdict.passed, ...(verdict.observed && { observed: verdict.observed }), ...(detail && { detail }) };
    });
    return { id: check.id, title: check.title, method: check.method, verdicts, differs: new Set(verdicts.map(verdict => verdict.passed)).size > 1 };
  });
}

/** The comparison of the named runs of a task, or nothing when one of them is not a run of the task. */
export async function taskComparisonOf(benchmarkId: string, task: TaskRecord, runIds: string[], locale: Locale): Promise<TaskComparison | undefined> {
  const { runs } = openedIndexes();
  const facts = runIds.map(runId => runs.get(runId)).flatMap(located => (located?.benchmarkId === benchmarkId && located.fact.taskId === task.id ? [located.fact] : []));
  if (facts.length < runIds.length) {
    return undefined;
  }
  const { record } = benchmarkOf(benchmarkId);
  const records = await Promise.all(facts.map(async fact => {
    const [run, trajectory, annotations] = await Promise.all([
      readRunFile(record, fact.id), readTrajectory(record, fact.id), record.annotationCategories ? readAnnotations(record, fact.id) : [],
    ]);
    return { fact, run, trajectory, annotations };
  }));
  return {
    blocks: record.blocks.comparison, categories: annotationCategoriesOf(record, locale), runs: records.map(compared => comparedRunOf(record, compared, locale)),
    files: comparedFilesOf(records), checks: comparedChecksOf(task, records),
  };
}
