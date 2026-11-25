import "@typespec/json-schema";

using TypeSpec.JsonSchema;
using AegisBench;
using AegisBench.Console;

/**
 * The files of the data directory the mock server reads, and of a benchmark's directory kept on Hugging Face. Each
 * model ending in File is the format of one kind of file; the others are its parts. Text shown to readers carries a
 * string for each locale; records keep the language they were made in.
 *
 * The layout, relative to the data directory:
 *
 *   catalog.json                              Catalog
 *   benchmarks/<benchmark>/benchmark.json     BenchmarkFile
 *   benchmarks/<benchmark>/tasks.json         TaskListFile
 *   benchmarks/<benchmark>/tasks/<task>/…     the task's Harbor directory, files as they are
 *   benchmarks/<benchmark>/runs.json          RunIndexFile
 *   benchmarks/<benchmark>/runs/<run>/run.json         RunFile
 *   benchmarks/<benchmark>/runs/<run>/trajectory.json  TrajectoryFile
 *   benchmarks/<benchmark>/hunts.json         HuntListFile
 *   benchmarks/<benchmark>/releases.json      ReleaseListFile
 *
 * A benchmark that keeps its runs/ and tasks/ on Hugging Face lays them out the same way under the directory its
 * benchmark.json names; the task files the public site withholds stay in the data directory.
 */
@jsonSchema
namespace AegisBench.Data;

/** catalog.json: the lifecycle stages, every model and harness, and the benchmarks in the order the site lists them. */
model Catalog {
  stages: StageRecord[];
  models: ModelRecord[];
  harnesses: HarnessRecord[];

  /** The directories under benchmarks/ */
  benchmarks: string[];
}

model StageRecord {
  /** "01" to "08" */
  id: string;

  half: Half;

  /** Order along the loop, 1 to 8 */
  position: int32;

  name: TextByLocale;
  summary: TextByLocale;
}

model ModelRecord {
  id: string;
  slot: VendorSlot;
  name: TextByLocale;
  vendor: TextByLocale;
}

model HarnessRecord {
  id: string;
  name: TextByLocale;
}

/** benchmarks/<benchmark>/benchmark.json: what the benchmark is and how its runs are read. */
model BenchmarkFile {
  /** The benchmark's directory name */
  id: string;

  name: string;

  /** The name without the series prefix, such as "A" for "Bench A" */
  shortName: string;

  version: string;

  /** The lifecycle stage, as catalog.json lists it */
  stageId: string;

  summary: TextByLocale;

  /** The day the results were last published */
  updatedOn: plainDate;

  /** The month the runs were evaluated in, "YYYY-MM" */
  @pattern("^[0-9]{4}-[0-9]{2}$")
  evaluatedIn: string;

  /** How many times every combination runs each task */
  @minValue(1)
  runsPerTask: int32;

  metric: MetricRecord;
  timelineLegend: TimelineLegendRecord;

  /** The tools whose calls the timeline marks as the benchmark's key action */
  changeTools: string[];

  /** How grading decides that a run passed */
  passRule: string;

  /** Where the benchmark keeps its runs/ and tasks/ when they are not in the data directory */
  huggingFace?: HuggingFaceDirectory;
}

model MetricRecord {
  name: TextByLocale;
  unit: MetricUnit;
  higherIsBetter: boolean;
}

/** What each mark of a run's timeline means for the benchmark. */
model TimelineLegendRecord {
  action: TextByLocale;
  change: TextByLocale;
  submitPassed: TextByLocale;
  submitFailed: TextByLocale;
}

/** A directory of a public dataset repository on Hugging Face, at one commit. */
model HuggingFaceDirectory {
  /** The dataset repository, "<owner>/<name>" */
  @pattern("^[^/]+/[^/]+$")
  repo: string;

  /** The commit the files are read at */
  @pattern("^[0-9a-f]{40}$")
  revision: string;

  /** The directory within the repository that holds runs/ and tasks/ */
  directory: string;
}

/** benchmarks/<benchmark>/tasks.json: every public task of the benchmark. */
model TaskListFile is TaskRecord[];

model TaskRecord {
  /** The task's directory name under tasks/ */
  id: string;

  title: string;

  /** Labels the task's authors gave it, for choosing tasks to compare models on */
  tags: string[];

  /** The task's current version */
  version: string;

  /** The task text exactly as the agent receives it */
  instruction: string;

  /** The JSON shape of the report the task asks for */
  reportSchema?: string;

  environment: LabeledValue[];

  /** The tools the harness offers the agent on this task */
  tools: string[];

  checks: CheckRecord[];

  /** How the verifier runs */
  verifier: LabeledValue[];

  /** Every file of the task's Harbor directory */
  files: TaskFileRecord[];

  /** Every version the task went through, newest first; the first is the current one */
  revisions: RevisionRecord[];

  validations: ValidationRun[];
}

/** A check of the task's grading, with the path of its code (or, for a model review, its rubric) in the task's directory. */
model CheckRecord {
  ...OmitProperties<GradingCheck, "passed" | "code" | "observed">;
  path: string;
}

model TaskFileRecord {
  /** The path within the task's directory */
  path: string;

  /** Bytes in the file */
  size: int32;

  /** Why the public site withholds the file, if it does */
  withheld?: WithheldReason;
}

/** A version of the task; the runs that answered it are counted from runs.json. */
model RevisionRecord {
  ...OmitProperties<TaskRevision, "current" | "runs" | "counted">;
}

/** benchmarks/<benchmark>/runs.json: every run of the benchmark with what lists and totals read of it. */
model RunIndexFile is RunFact[];

model RunFact {
  /** The run's directory name under runs/ */
  id: string;

  taskId: string;
  modelId: string;
  harnessId: string;

  @minValue(1)
  attempt: int32;

  outcome: RunOutcome;

  /** The run's result in the benchmark's metric, from 0 to 1 */
  @minValue(0)
  @maxValue(1)
  score: float64;

  steps: int32;
  costUsd: float64;
  finishedAt: utcDateTime;

  /** The task version the run answered */
  taskVersion: string;

  /** The evaluation batch the run belongs to */
  batch: string;

  /** The class a review gave a failed run; absent while the failure is unreviewed and for other outcomes */
  failureClass?: FailureClass;

  /** The checks the run failed */
  failedChecks: string[];
}

/** benchmarks/<benchmark>/runs/<run>/run.json: the rest of a run's record; runs.json holds its facts, trajectory.json its steps. */
model RunFile {
  startedAt: utcDateTime;

  /** Who reviewed the run's failure */
  reviewer?: string;

  /** The run's result in the benchmark's own words, such as 检出 3/5 */
  resultLabel: TextByLocale;

  metrics: OmitProperties<RunMetrics, "steps" | "costUsd">;
  input: RunInputRecord;
  output: RunOutput;
  grading: RunGrading;

  /** Present when the run failed */
  failure?: RunFailure;
}

/** What the model received; the harness is named in runs.json, so only its version is here. */
model RunInputRecord {
  ...OmitProperties<RunInput, "harness">;
  harness: OmitProperties<HarnessInfo, "id" | "name">;
}

/** benchmarks/<benchmark>/runs/<run>/trajectory.json: the run's trajectory in ATIF-v1.8. */
model TrajectoryFile is ATIF.Trajectory;

/** benchmarks/<benchmark>/hunts.json: the hunts recorded over the benchmark's trajectories. */
model HuntListFile is HuntRecord[];

model HuntRecord {
  id: string;
  title: string;

  /** The question the hunt answers */
  need: string;

  rounds: int32;
  converged: boolean;
  recordedAt: utcDateTime;
  calibration: HuntCalibration;
  facets: FacetRecord[];

  /** Every trajectory the hunt's probes marked or a reader read */
  trials: TrialRecord[];
}

model FacetRecord {
  id: string;
  name: string;
  edge?: FacetEdge;
  definition: string;
  excludes: string;
  probes: ProbeRecord[];
}

model ProbeRecord {
  name: string;
  kind: string;
}

model TrialRecord {
  runId: string;

  /** Whether a reader read the whole trajectory */
  read: boolean;

  markedFacets: string[];
  confirmedFacets: string[];
  marks: MarkRecord[];

  /** Why the reader's verdict is what it is, when the trajectory was read */
  why?: string;
}

/** A position a probe marked: the facet, the step of the trajectory and the probes that hit it. */
model MarkRecord {
  facetId: string;
  step: int32;
  probes: string[];
}

/** benchmarks/<benchmark>/releases.json: the versions the benchmark published, exactly one of them current. */
model ReleaseListFile is PublishedRelease[];

model PublishedRelease {
  @minValue(1)
  version: int32;

  /** A published release is current or was superseded; drafts live only in the console */
  status: ReleaseStatus.current | ReleaseStatus.superseded;

  note?: string;
  author: string;
  updatedAt: utcDateTime;

  /** The version this one published again */
  restoresVersion?: int32;

  content: ReleaseContent;
}
