import "@typespec/http";

using Http;

namespace AegisBench.Console;

/**
 * Why a failed run failed, by its human review: it broke a requirement the task states or that common sense implies
 * (modelError), the grading's verdict disagrees with the answer and the reference (gradingError), or the requirement it
 * broke is neither stated nor derivable from the task (constructionProblem).
 */
enum FailureClass {
  modelError,
  gradingError,
  constructionProblem,
}

/** One run as a list shows it. */
model RunRow {
  id: string;
  task: TaskRef;
  `model`: ModelRef;
  harness: HarnessRef;
  attempt: int32;
  outcome: RunOutcome;
  finishedAt: utcDateTime;

  /** The version of the task the run answered, a short content hash */
  taskVersion: string;

  /** The evaluation batch that produced the run */
  batch: string;

  /** The class the review of a failed run gives it; absent while the failure is unreviewed and for other outcomes */
  failureClass?: FailureClass;
}
