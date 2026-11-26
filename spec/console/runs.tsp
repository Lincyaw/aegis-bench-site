import "@typespec/http";
import "./session.tsp";

using Http;

namespace AegisBench.Console;

/** One run as a list shows it. */
model RunRow {
  id: string;
  task: TaskRef;
  `model`: ModelRef;
  harness: HarnessRef;
  attempt: int32;
  outcome: RunOutcome;
  finishedAt: utcDateTime;
  steps: int32;
  costUsd: float64;

  /** The version of the task the run answered, a short content hash */
  taskVersion: string;

  /** The evaluation batch that produced the run */
  batch: string;

  /** The class the review of a failed run gives it; absent while the failure is unreviewed and for other outcomes */
  failureClass?: FailureClass;
}

model RunRowPage is Page<RunRow>;

/**
 * The combinations an operation keeps to: a model's, those in a harness, or one model's in one harness; every
 * combination when both are empty.
 */
model CombinationScopeQuery {
  /** A model's id; every model when empty */
  @query(#{ explode: true }) `model`?: string = "";

  /** A harness's id; every harness when empty */
  @query(#{ explode: true }) harness?: string = "";
}

/** Which failed runs a list keeps by their review: the unreviewed ones, or those a review gave one class. */
enum ReviewFilter {
  unreviewed,
  modelError,
  gradingError,
  constructionProblem,
}

/** How often the agent called one tool, and how many of the calls failed. */
model ToolUsage {
  tool: string;
  calls: int32;
  failures: int32;
}

/** What a run consumed, from its trajectory's own metrics. */
model RunUsage {
  inputTokens: int32;
  cachedTokens: int32;
  outputTokens: int32;
  costUsd: float64;
  modelCalls: int32;

  /** By tool, the most called first */
  toolCalls: ToolUsage[];
}

/** A run as the console reads it: everything the public run record holds, and the records behind it. */
model ConsoleRunDetail {
  ...RunDetail;
  taskVersion: string;
  batch: string;
  startedAt: utcDateTime;
  finishedAt: utcDateTime;
  usage: RunUsage;

  /** The class the review gives a failed run; absent while the failure is unreviewed */
  failureClass?: FailureClass;

  /** Who reviewed the failure */
  reviewer?: string;
}

/** What one event of a trajectory records. */
enum RunEventKind {
  /** What the agent said at a step */
  message,

  toolCall,
  observation,

  /** An observation that reports a failed call; the trajectory marks it with `extra.failed` on the observation result */
  error,

  submit,
}

/** One event of a run's trajectory, in the order it happened. */
model RunEvent {
  /** Position among all the run's events, from 1 */
  index: int32;

  stepId: int32;
  kind: RunEventKind;
  at: utcDateTime;
  tool?: string;

  /** The event's text, cut at 400 characters */
  excerpt: string;
}

model RunEventPage is Page<RunEvent>;

@route("/console/benchmarks/{benchmarkId}/runs")
@useAuth(SessionCookie)
interface ConsoleRuns {
  /** The benchmark's runs, newest first, a page at a time; a task the benchmark lacks, or a scope that keeps to none of its combinations, is not found */
  @get list(
    @path benchmarkId: string,

    /** Matches the task id or title */
    @query(#{ explode: true }) q?: string = "",

    /** Only the runs of this task, by its id; every task when empty */
    @query(#{ explode: true }) task?: string = "",

    ...CombinationScopeQuery,

    @query(#{ explode: true }) outcome?: RunOutcome,

    /** Keeps only failed runs, by their review */
    @query(#{ explode: true }) review?: ReviewFilter,

    ...PageQuery<25>,
    ...LanguageHeader,
  ): Localized<RunRowPage> | SignInRequiredError | NotFoundError;
}

@route("/console/runs/{runId}")
@useAuth(SessionCookie)
interface ConsoleRunRecords {
  @get read(@path runId: string, ...LanguageHeader): Localized<ConsoleRunDetail> | SignInRequiredError | NotFoundError | HuggingFaceUnreachableError;

  /** The run's whole trajectory in ATIF, for reading every step on one page */
  @get
  @route("/trajectory")
  trajectory(@path runId: string): ATIF.Trajectory | SignInRequiredError | NotFoundError | HuggingFaceUnreachableError;

  /** The run's trajectory a page of steps at a time */
  @get
  @route("/trajectory/steps")
  trajectorySteps(@path runId: string, ...PageQuery<25>): TrajectoryPage | SignInRequiredError | NotFoundError | HuggingFaceUnreachableError;

  /** The run replayed over its task's world; only a benchmark that declares world layers has replays */
  @get
  @route("/replay")
  replay(@path runId: string, ...LanguageHeader): Localized<RunReplay> | SignInRequiredError | NotFoundError | HuggingFaceUnreachableError;

  /** The events of the run's trajectory, a page at a time */
  @get
  @route("/events")
  events(
    @path runId: string,
    @query(#{ explode: true }) kind?: RunEventKind,

    /** Matches the event's text or tool */
    @query(#{ explode: true }) q?: string = "",

    ...PageQuery<50>,
  ): RunEventPage | SignInRequiredError | NotFoundError | HuggingFaceUnreachableError;
}
