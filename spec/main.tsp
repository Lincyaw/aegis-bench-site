import "@typespec/http";
import "./atif.tsp";

using Http;

/** Public read API of the Aegis Bench site: benchmarks, leaderboards, run records and models. */
@service(#{ title: "Aegis Bench Public API" })
@server("/api", "Served by the demo's mock service worker")
namespace AegisBench;

/** The two halves of the lifecycle loop: development and operations. */
enum Half {
  dev,
  ops,
}

/** One of the eight lifecycle stages, "01" to "08". */
model StageRef {
  id: string;
  name: string;
  half: Half;
}

model Stage {
  ...StageRef;

  /** Benchmarks published at this stage; empty while the stage is under construction */
  benchmarkIds: string[];
}

enum MetricUnit {
  percent,
  ratio,
}

model Metric {
  name: string;
  unit: MetricUnit;
  higherIsBetter: boolean;
}

/** Placeholder vendor slot that decides the model badge letter and colour. */
enum VendorSlot {
  A,
  B,
  C,
  D,
}

model ModelRef {
  id: string;
  name: string;
  vendor: string;
  slot: VendorSlot;
}

model HarnessRef {
  id: string;
  name: string;
}

/** One model and harness combination ranked on one benchmark version. */
model LeaderboardEntry {
  rank: int32;
  `model`: ModelRef;
  harness: HarnessRef;

  /** In the benchmark's metric unit: a fraction for percent metrics */
  score: float64;

  runsPerTask: int32;
  avgCostUsd: float64;

  /** Month of evaluation, "YYYY-MM" */
  evaluatedIn: string;
}

model BenchmarkRef {
  id: string;
  name: string;
}

model BenchmarkSummary {
  ...BenchmarkRef;
  version: string;
  stage: StageRef;
  summary: string;
  taskCount: int32;
  combinationCount: int32;
  runsPerTask: int32;
  metric: Metric;
  updatedOn: plainDate;
  topThree: LeaderboardEntry[];
}

model FlowStep {
  title: string;
  body: string;
}

model LabeledValue {
  label: string;
  value: string;
}

model TaskRef {
  id: string;
  title: string;
}

model PublicSample {
  task: TaskRef;
  statement: string;
}

model VersionNote {
  version: string;
  releasedOn: plainDate;
  note: string;
}

model QuestionAnswer {
  question: string;
  answer: string;
}

enum RunOutcome {
  passed,
  failed,

  /** Infrastructure or service failure; never counted as a model result */
  executionFailed,
}

/** Kinds of marks on a run's compact timeline. */
enum TimelineMark {
  action,
  change,
  submitPassed,
  submitFailed,
}

/** What each timeline mark means on this benchmark. */
model TimelineLegend {
  action: string;
  change: string;
  submitPassed: string;
  submitFailed: string;

  /** Tool names whose calls leave the change mark */
  changeTools: string[];
}

model RecentRun {
  runId: string;
  `model`: ModelRef;
  task: TaskRef;
  outcome: RunOutcome;

  /** Result in the benchmark's own words, such as "检出 3/5" */
  resultLabel: string;

  stepCount: int32;
  durationMinutes: int32;
  timeline: TimelineMark[];
}

model BenchmarkDetail {
  ...BenchmarkSummary;
  setting: {
    intro: string;
    flow: FlowStep[];
    sample: PublicSample;
  };
  evaluation: {
    intro: string;
    flow: FlowStep[];
    conditions: LabeledValue[];
  };
  topFive: LeaderboardEntry[];
  recentRuns: RecentRun[];
  timelineLegend: TimelineLegend;
  versions: VersionNote[];
  bibtex: string;
  faq: QuestionAnswer[];
}

enum LeaderboardView {
  combination,
  `model`,
  harness,
}

model TaskSummary {
  ...TaskRef;
  passRate: float64;
}

model TaskPage {
  items: TaskSummary[];
  total: int32;
}

model RunRef {
  id: string;
  attempt: int32;
  outcome: RunOutcome;
}

model CombinationRuns {
  `model`: ModelRef;
  harness: HarnessRef;
  runs: RunRef[];
}

/** Every run of every combination on one task. */
model TaskRuns {
  task: TaskSummary;
  runsPerTask: int32;
  combinations: CombinationRuns[];
}

model RunMetrics {
  turns: int32;
  durationMinutes: int32;
  submissions: int32;
  outputTokens: int32;
  costUsd: float64;
  endReason: string;
}

model HarnessInfo {
  ...HarnessRef;
  version: string;
  toolDefinitionsUrl: url;
}

/** Everything the model received; identical for every run of the task. */
model RunInput {
  /** The task text exactly as given to the agent */
  instruction: string;

  /** The JSON shape of the report the task asks for */
  reportSchema?: string;

  environment: LabeledValue[];
  harness: HarnessInfo;
}

model FileChange {
  path: string;
  additions: int32;
  deletions: int32;

  /** Unified diff lines, present for files shown expanded */
  patch?: string[];
}

model Artifact {
  name: string;
  url: url;
}

/** What the model produced: its last submission, its last reply and the files the task asks for. */
model RunOutput {
  submission: {
    attempt: int32;
    step: int32;
    files: FileChange[];
  };
  finalReply: {
    step: int32;
    text: string;
  };
  artifacts: Artifact[];
  patchUrl: url;
}

enum CheckMethod {
  hiddenTest,
  script,
  modelReview,
}

model CheckCode {
  path: string;
  source: string;
}

model GradingCheck {
  id: string;
  title: string;
  method: CheckMethod;
  passed: boolean;

  /** Number of judge samples whose median decides a model-review check */
  samples?: int32;

  /** Published rubric text of a model-review check */
  rubric?: string;

  code?: CheckCode;

  /** What this run actually produced for the check */
  observed?: string;
}

model RunGrading {
  checks: GradingCheck[];
  passCount: int32;
  total: int32;
  codeUrl: url;
}

model FailedCheck {
  id: string;
  title: string;
  detail: string;
}

/** Conclusion of a human review; present only for reviewed runs. */
model ReviewConclusion {
  text: string;
  reviewedOn: plainDate;

  /** Trajectory step ids the conclusion relies on */
  evidenceSteps: int32[];
}

model RunFailure {
  failedChecks: FailedCheck[];
  review?: ReviewConclusion;
}

model RunDetail {
  id: string;
  benchmark: BenchmarkRef;
  task: TaskRef;
  `model`: ModelRef;
  harness: HarnessRef;
  attempt: int32;
  attemptCount: int32;
  outcome: RunOutcome;
  metrics: RunMetrics;
  input: RunInput;
  output: RunOutput;
  grading: RunGrading;

  /** Present when the run failed; absent for passed runs and execution failures */
  failure?: RunFailure;
}

model BenchmarkStanding {
  benchmark: BenchmarkRef;
  stage: StageRef;
  metric: Metric;
  bestHarness: HarnessRef;
  rank: int32;
  entrants: int32;
  score: float64;
}

model HarnessScore {
  harness: HarnessRef;
  score: float64;
}

model HarnessComparison {
  benchmark: BenchmarkRef;
  half: Half;
  metric: Metric;
  scores: HarnessScore[];
}

model ReportRef {
  id: string;
  publishedOn: plainDate;
  kind: string;
  title: string;
}

model ModelProfile {
  `model`: ModelRef;
  summary: string;
  lastEvaluatedOn: plainDate;
  harnessCount: int32;
  standings: BenchmarkStanding[];
  harnessComparison: HarnessComparison[];
  reports: ReportRef[];
}

@error
model NotFoundError {
  @statusCode _: 404;
  message: string;
}

@route("/stages")
interface Stages {
  @get list(): Stage[];
}

@route("/benchmarks")
interface Benchmarks {
  @get list(): BenchmarkSummary[];

  @get
  @route("/{benchmarkId}")
  read(@path benchmarkId: string): BenchmarkDetail | NotFoundError;

  @get
  @route("/{benchmarkId}/leaderboard")
  leaderboard(
    @path benchmarkId: string,
    @query view?: LeaderboardView = LeaderboardView.combination,
  ): LeaderboardEntry[] | NotFoundError;

  @get
  @route("/{benchmarkId}/tasks")
  tasks(
    @path benchmarkId: string,

    /** Matches the task id or title */
    @query q?: string,

    @query offset?: int32 = 0,
    @query limit?: int32 = 14,
  ): TaskPage | NotFoundError;

  @get
  @route("/{benchmarkId}/tasks/{taskId}/runs")
  taskRuns(@path benchmarkId: string, @path taskId: string): TaskRuns | NotFoundError;
}

@route("/runs")
interface Runs {
  @get
  @route("/{runId}")
  read(@path runId: string): RunDetail | NotFoundError;

  /** The run's full trajectory in ATIF */
  @get
  @route("/{runId}/trajectory")
  trajectory(@path runId: string): ATIF.Trajectory | NotFoundError;
}

@route("/models")
interface Models {
  @get
  @route("/{modelId}")
  read(@path modelId: string): ModelProfile | NotFoundError;
}
