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

/**
 * What a run consumed beyond the run's own metrics, from its trajectory as it records them: a figure the trajectory
 * leaves out is absent here rather than zero.
 */
model RunUsage {
  /** The trajectory's `final_metrics.total_prompt_tokens` */
  inputTokens?: int32;

  /** The trajectory's `final_metrics.total_cached_tokens` */
  cachedTokens?: int32;

  /** The sum of the agent steps' `llm_call_count`; absent when no step records one */
  modelCalls?: int32;

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

/** What one event of a trajectory records, as the server sorts it by the part of the step it was read from. */
enum RunEventKind {
  /** A step's `message`, whatever the step's `source` */
  message,

  /** One of a step's `tool_calls` whose `function_name` is not `submit` */
  toolCall,

  /** One of a step's `observation.results` whose `extra.failed` is not `true` */
  observation,

  /** One of a step's `observation.results` whose `extra.failed` is `true`, which reports a failed call */
  error,

  /** One of a step's `tool_calls` whose `function_name` is `submit` */
  submit,
}

/** The most characters of an event's text its excerpt carries. */
const MAX_EXCERPT_LENGTH = 200;

/** One event of a run's trajectory as a list shows it: where it sits, its kind, and the start of its text. */
model RunEventRow {
  /**
   * Position among all the run's events, from 1: each step's `message`, then its `tool_calls`, then its
   * `observation.results`, each in the order the step records them
   */
  @minValue(1)
  index: int32;

  /** The `step_id` of the step that records the event */
  stepId: int32;

  kind: RunEventKind;

  /** The step's `timestamp`, when the trajectory records one */
  at?: utcDateTime;

  /** The `function_name` of the tool call, or of the call an observation result's `source_call_id` names */
  tool?: string;

  /**
   * The first line of the event's text, cut at 200 characters. The text is the message's, or the observation result's
   * `content`, with a list of parts giving its text parts a line apart; for a tool call it is the `arguments` as JSON.
   * The event read by its index holds the record whole.
   */
  @maxLength(MAX_EXCERPT_LENGTH)
  excerpt: string;
}

model RunEventRowPage is Page<RunEventRow>;

/** One event of a run's trajectory with its whole record. */
model RunEvent {
  ...OmitProperties<RunEventRow, "excerpt">;

  /**
   * The part of the step the event was read from, whole and unchanged: the step's `message` for a message event, one
   * of its `tool_calls` for a toolCall or submit event, one of its `observation.results` for an observation or error
   * event
   */
  record: ATIF.Step.message | ATIF.ToolCall | ATIF.ObservationResult;
}

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

  /** The events of the run's trajectory in index order, a page at a time, each as a row */
  @get
  @route("/events")
  events(
    @path runId: string,
    @query(#{ explode: true }) kind?: RunEventKind,

    /** Matches the event's tool, or any string at any depth of its record rather than only its excerpt */
    @query(#{ explode: true }) q?: string = "",

    ...PageQuery<50>,
  ): RunEventRowPage | SignInRequiredError | NotFoundError | HuggingFaceUnreachableError;

  /** One event of the run's trajectory with its whole record; an index past the run's last event is not found */
  @get
  @route("/events/{index}")
  event(@path runId: string, @path @minValue(1) index: int32): RunEvent | SignInRequiredError | NotFoundError | HuggingFaceUnreachableError;
}
