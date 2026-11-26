namespace AegisBench;

/**
 * Runs of one task side by side, as the public site and the console both show them, and the labels annotators give
 * trajectory steps, which the comparison highlights.
 */

/** How much a label on a step calls for a reader's attention, which decides how a page highlights the step. */
enum AnnotationSeverity {
  /** The step went wrong */
  error,

  /** The step is questionable */
  warning,

  /** The step is worth noticing */
  note,
}

/** A label annotators give trajectory steps, as a benchmark declares it. */
model AnnotationCategory {
  id: string;
  name: string;

  /** What a step with the label is */
  description: string;

  severity: AnnotationSeverity;
}

/**
 * A label an annotator gave one step of a run's trajectory, with its reason. Annotators are models that read
 * trajectories; the site only shows what they recorded.
 */
model StepAnnotation {
  /** The step's id in the trajectory */
  step: int32;

  /** One of the benchmark's annotation categories */
  category: string;

  /** Who gave the label, such as an annotating model and its version */
  annotator: string;

  annotatedAt: utcDateTime;

  /** Why, in the annotator's words */
  reason: string;
}

/**
 * The blocks a comparison of a task's runs is made of. Each shows one row of the overview, a cell per run, and its whole
 * content for the runs opened in detail. A benchmark's configuration lists the blocks it uses, in order.
 */
enum ComparisonBlock {
  /** The files the last submission changed, with their diffs */
  fileChanges,

  /** The grading's checks and each run's verdict */
  checks,

  /** The agent's final reply */
  reply,

  /** The whole trajectory, with the labels annotators gave its steps */
  trajectory,
}

/** No comparison holds more runs than this. */
const MAX_COMPARED_RUNS = 4;

/** One run of a comparison: who ran it, what came of it, what it said, and the labels on its steps. */
model ComparedRun {
  id: string;
  `model`: ModelRef;
  harness: HarnessRef;
  attempt: int32;
  outcome: RunOutcome;
  metrics: RunMetrics;
  passCount: int32;

  /** The last submission, which the grading judged */
  submission: {
    attempt: int32;
    step: int32;
  };

  finalReply: {
    step: int32;
    text: string;
  };

  /** One entry per agent step, in step order */
  timeline: TimelineStep[];

  /** In step order; none when the benchmark's trajectories are not annotated */
  annotations: StepAnnotation[];

  /** The class the review gives a failed run; absent while the failure is unreviewed */
  failureClass?: FailureClass;

  review?: ReviewConclusion;

  /** The run's directory on Hugging Face, when its record and trajectory are kept there */
  huggingFaceUrl?: url;
}

/** How one run changed a file. */
model RunFileChange {
  runId: string;
  ...OmitProperties<FileChange, "path">;

  /** An earlier run of the comparison that changed the file in exactly the same way */
  sameAs?: string;
}

/** A file some run of the comparison changed. */
model ComparedFile {
  path: string;

  /** One per run that changed the file, in the comparison's order */
  changes: RunFileChange[];

  /** Whether the runs differ on the file: some left it unchanged, or their changes are not all the same */
  differs: boolean;
}

/** A check's verdict in one run. */
model RunCheckVerdict {
  runId: string;
  passed: boolean;

  /** What the run produced for the check */
  observed?: string;

  /** Why the run failed the check, as the grading recorded it */
  detail?: string;
}

model ComparedCheck {
  id: string;
  title: string;
  method: CheckMethod;

  /** One per graded run, in the comparison's order; a run whose execution failed was not graded and has none */
  verdicts: RunCheckVerdict[];

  /** Whether the graded runs' verdicts are not all the same */
  differs: boolean;
}

/** Runs of one task side by side, for checking the task: the blocks the benchmark shows them in and what each block compares. */
model TaskComparison {
  /** In the order the benchmark's configuration lists them */
  blocks: ComparisonBlock[];

  /** The labels the benchmark's annotators give steps, in its order; none when its trajectories are not annotated */
  categories: AnnotationCategory[];

  /** In the order asked for */
  runs: ComparedRun[];

  /** Every file a run changed, by path */
  files: ComparedFile[];

  /** Every check of the task, in the task's order */
  checks: ComparedCheck[];
}

/** A compared run as the public site shows it; the class a review gives a failure stays in the console. */
model PublicComparedRun is OmitProperties<ComparedRun, "failureClass">;

/** A comparison as the public site shows it. */
model PublicTaskComparison {
  ...OmitProperties<TaskComparison, "runs">;

  /** In the order asked for */
  runs: PublicComparedRun[];
}
