import "@typespec/http";
import "./atif.tsp";
import "./console/session.tsp";
import "./console/results.tsp";
import "./console/tasks.tsp";
import "./console/models.tsp";
import "./console/collections.tsp";
import "./console/analysis.tsp";
import "./console/releases.tsp";
import "./console/workspace.tsp";
import "./console/members.tsp";
import "./console/settings.tsp";
import "./console/reports.tsp";

using Http;

/**
 * The Aegis Bench API. The public site reads benchmarks, leaderboards, run records and models without signing in; the
 * console's operations, under /console, serve signed-in staff (see the AegisBench.Console namespace).
 */
@service(#{ title: "Aegis Bench API" })
@server("/api", "Served by the demo's mock server: in the browser's service worker, or locally with npm run mock")
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

  /** Order along the loop, 1 to 8 */
  position: int32;
}

model Stage {
  ...StageRef;

  /** What the stage asks of an agent */
  summary: string;

  /** Benchmarks published at this stage; empty while the stage is under construction */
  benchmarks: BenchmarkRef[];
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

  /** The name without the series prefix, such as "A" for "Bench A" */
  shortName: string;
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

/** How a labelled value is set: running text, or code such as a repository path. */
enum ValueFormat {
  text,
  code,
}

model LabeledValue {
  label: string;
  value: string;

  /** Running text unless stated */
  format?: ValueFormat;
}

model TaskRef {
  id: string;
  title: string;
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
}

/** One agent step of a run as its timeline marks it. The server decides each step's mark by the benchmark's rules. */
model TimelineStep {
  /** The trajectory step the mark stands for */
  stepId: int32;

  mark: TimelineMark;
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

  /** One entry per agent step, in step order */
  timeline: TimelineStep[];
}

/**
 * The data of a benchmark's page. Its prose (setting, evaluation, versions, citation, questions) is editorial
 * content the site keeps in its own documents, not data the API serves.
 */
model BenchmarkDetail {
  ...BenchmarkSummary;
  topFive: LeaderboardEntry[];
  recentRuns: RecentRun[];
  timelineLegend: TimelineLegend;
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

/** No page of a list holds more than this, so no response carries a list that grows with the data. */
const MAX_PAGE_SIZE = 50;

/** Which page of a list to return. */
model PageQuery<DefaultSize extends valueof int32> {
  // Query parameters are exploded, OpenAPI's default; the mock's validator reads a non-exploded one as a list.
  /** Position of the page's first item in the whole list */
  @query(#{ explode: true }) @minValue(0) offset?: int32 = 0;

  /** Items per page */
  @query(#{ explode: true }) @minValue(1) @maxValue(MAX_PAGE_SIZE) limit?: int32 = DefaultSize;
}

/** One page of a list, and the length of the whole list. */
model Page<Item> {
  items: Item[];
  total: int32;
}

model TaskPage is Page<TaskSummary>;

enum TaskEntryKind {
  file,
  directory,
}

/** Why a public task lists an entry without publishing its content. */
enum WithheldReason {
  /** The reference solution under solution/ */
  solution,

  /** An answer the grading compares a submission with, such as the reference causal chain */
  referenceAnswer,
}

/** One entry of a task's Harbor directory. */
model TaskEntry {
  /** Path from the task's root, such as "tests/test.sh" */
  path: string;

  kind: TaskEntryKind;

  /** Bytes in a published file */
  size?: int32;

  /** Present when the entry is listed but not published: a withheld file cannot be read, nor a withheld directory listed */
  withheld?: WithheldReason;
}

model TaskEntryPage is Page<TaskEntry>;

/** A published file of a task's Harbor directory; no response carries more than its first 256 KiB of text. */
model TaskFile {
  path: string;

  /** Bytes in the whole file */
  size: int32;

  mediaType: string;

  /** The file's text, cut at 256 KiB; absent for a binary file */
  text?: string;

  /** Whether text holds only the start of the file */
  truncated: boolean;
}

model LeaderboardPage is Page<LeaderboardEntry>;

model RunRef {
  id: string;
  attempt: int32;
  outcome: RunOutcome;
}

/** A model and the harness it ran in, evaluated together as one entrant. */
model Combination {
  `model`: ModelRef;
  harness: HarnessRef;
}

model CombinationRuns {
  ...Combination;
  runs: RunRef[];
}

/** Every run of every combination on one task. */
model TaskRuns {
  task: TaskSummary;
  runsPerTask: int32;
  combinations: CombinationRuns[];
}

model RunMetrics {
  /** Steps in the run's trajectory */
  steps: int32;

  durationMinutes: int32;
  submissions: int32;
  outputTokens: int32;
  costUsd: float64;
  endReason: RunEndReason;
}

enum RunEndReason {
  /** The agent submitted and the harness ended the run */
  submitted,

  /** The execution environment failed before the agent submitted */
  executionError,
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

/**
 * The grading verdict of one submission. A trajectory carries it as `extra.submission` on the observation result
 * of the submit call, since ATIF leaves `extra` open.
 */
model SubmissionVerdict {
  passed: boolean;
  passedChecks: int32;
  totalChecks: int32;
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

  /** One entry per agent step of the run's trajectory, in step order */
  timeline: TimelineStep[];

  /** Present when the run failed; absent for passed runs and execution failures */
  failure?: RunFailure;
}

/** A run's trajectory read a page of steps at a time: the trajectory's own fields, and one page of its steps in step order. */
model TrajectoryPage {
  ...OmitProperties<ATIF.Trajectory, "steps">;
  ...Page<ATIF.Step>;
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

model ModelProfile {
  `model`: ModelRef;
  summary: string;
  lastEvaluatedOn: plainDate;
  harnessCount: int32;
  standings: BenchmarkStanding[];
  harnessComparison: HarnessComparison[];
}

/** The languages the API serves; the site offers exactly these. */
enum Locale {
  zhCN: "zh-CN",
  en: "en",
}

/**
 * The reader's languages, in standard HTTP negotiation form such as "en-US,en;q=0.9". The server answers in the best
 * match among the locales it serves, zh-CN when none matches. Display names, summaries and labels come back in it;
 * evaluation records (task texts, trajectories, check titles, review conclusions) stay in the language they were made in.
 */
model LanguageHeader {
  @header("Accept-Language") language?: string;
}

/** A response written in one of the API's locales, which Content-Language names. */
model Localized<T> {
  @header("Content-Language") language: Locale;
  @body body: T;
}

@error
model NotFoundError {
  @statusCode _: 404;
  message: string;
}

/** The entry exists but is not published. */
@error
model WithheldError {
  @statusCode _: 403;
  message: string;
  reason: WithheldReason;
}

/** What the site says about the people behind it; the console's settings decide it. */
model SiteInfo {
  contactEmail: Console.EmailAddress;
}

@route("/site")
interface Site {
  @get read(): SiteInfo;
}

@route("/stages")
interface Stages {
  @get list(...LanguageHeader): Localized<Stage[]>;
}

@route("/benchmarks")
interface Benchmarks {
  @get list(...LanguageHeader): Localized<BenchmarkSummary[]>;

  @get
  @route("/{benchmarkId}")
  read(@path benchmarkId: string, ...LanguageHeader): Localized<BenchmarkDetail> | NotFoundError;

  /** The ranking a page at a time, best first */
  @get
  @route("/{benchmarkId}/leaderboard")
  leaderboard(
    @path benchmarkId: string,
    @query(#{ explode: true }) view?: LeaderboardView = LeaderboardView.combination,
    ...PageQuery<20>,
    ...LanguageHeader,
  ): Localized<LeaderboardPage> | NotFoundError;

  /** Every combination evaluated on the benchmark, in ranking order, for choosing one */
  @get
  @route("/{benchmarkId}/combinations")
  combinations(@path benchmarkId: string, ...LanguageHeader): Localized<Combination[]> | NotFoundError;

  /** Tasks are records: their titles stay in the language the task was written in */
  @get
  @route("/{benchmarkId}/tasks")
  tasks(
    @path benchmarkId: string,

    /** Matches the task id or title */
    @query(#{ explode: true }) q?: string,

    ...PageQuery<14>,
  ): TaskPage | NotFoundError;

  @get
  @route("/{benchmarkId}/tasks/{taskId}")
  task(@path benchmarkId: string, @path taskId: string): TaskSummary | NotFoundError;

  /**
   * One directory of the task's Harbor directory, a page of entries at a time, directories first. Every public task
   * publishes its directory except the reference solution and reference answers, which are listed as withheld.
   */
  @get
  @route("/{benchmarkId}/tasks/{taskId}/files")
  taskEntries(
    @path benchmarkId: string,
    @path taskId: string,

    /** Path of the directory from the task's root; the root itself when empty */
    @query(#{ explode: true }) dir?: string = "",

    ...PageQuery<50>,
  ): TaskEntryPage | NotFoundError | WithheldError;

  /** One file of the task's Harbor directory */
  @get
  @route("/{benchmarkId}/tasks/{taskId}/file")
  taskFile(
    @path benchmarkId: string,
    @path taskId: string,

    /** Path of the file from the task's root, such as "tests/test.sh" */
    @query(#{ explode: true }) path: string,
  ): TaskFile | NotFoundError | WithheldError;

  @get
  @route("/{benchmarkId}/tasks/{taskId}/runs")
  taskRuns(@path benchmarkId: string, @path taskId: string, ...LanguageHeader): Localized<TaskRuns> | NotFoundError;
}

@route("/runs")
interface Runs {
  @get
  @route("/{runId}")
  read(@path runId: string, ...LanguageHeader): Localized<RunDetail> | NotFoundError;

  /** The run's full trajectory in ATIF, for export; a record, so it stays in the language it was made in */
  @get
  @route("/{runId}/trajectory")
  trajectory(@path runId: string): ATIF.Trajectory | NotFoundError;

  /** The run's trajectory a page of steps at a time, for reading it without fetching it whole */
  @get
  @route("/{runId}/trajectory/steps")
  trajectorySteps(@path runId: string, ...PageQuery<25>): TrajectoryPage | NotFoundError;
}

@route("/models")
interface Models {
  @get
  @route("/{modelId}")
  read(@path modelId: string, ...LanguageHeader): Localized<ModelProfile> | NotFoundError;
}
