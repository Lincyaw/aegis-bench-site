import "@typespec/http";
import "./session.tsp";
import "./runs.tsp";

using Http;

namespace AegisBench.Console;

/** A benchmark as the console lists it, with the size of its records. */
model ConsoleBenchmark {
  ...BenchmarkRef;
  stage: StageRef;
  version: string;
  summary: string;
  metric: Metric;
  taskCount: int32;

  /** Model and harness combinations evaluated on it, in ranking order */
  entrants: Combination[];

  runCount: int32;

  /** What each mark on a run's timeline means on this benchmark */
  timelineLegend: TimelineLegend;

  /** Whether its runs replay over their tasks' worlds, which only a benchmark that declares world layers does */
  replayable: boolean;
}

/**
 * What a set of runs comes to. Execution failures are listed but never counted: a rate or a mean is over the counted
 * runs, the passed and the failed, and is absent when none counts.
 */
model ResultCounts {
  runs: int32;
  passed: int32;
  failed: int32;
  executionFailed: int32;

  /** Tasks with a counted run */
  tasks: int32;

  /** Tasks whose counted runs all passed */
  solvedEveryTime: int32;

  /** Tasks with a passed run */
  solvedOnce: int32;

  passRate?: float64;
  meanCostUsd?: float64;
  meanSteps?: float64;

  /** Failed runs by the class their review gives them */
  modelErrors: int32;

  gradingErrors: int32;
  constructionProblems: int32;

  /** Failed runs no review has classed yet */
  unreviewed: int32;
}

/** A model and harness combination and what its runs come to. */
model EntrantResult {
  ...Combination;
  result: ResultCounts;
}

/** Work the records leave for someone to do. */
enum PendingKind {
  /** Failed runs that wait for a review */
  unreviewedFailures,

  /** Runs whose environment failed; they count only once they are run again */
  executionFailures,

  /** Failures their review blames on the grading; the grading needs revising and the runs regrading */
  gradingErrors,
}

model PendingWork {
  kind: PendingKind;
  count: int32;

  /** The run list's filters that list these runs: the outcome and the review they are kept to, when one is */
  outcome?: RunOutcome;

  review?: ReviewFilter;
}

/** A benchmark's records at a glance. */
model BenchmarkOverview {
  benchmark: ConsoleBenchmark;
  totals: ResultCounts;

  /** Every combination, best pass rate first */
  entrants: EntrantResult[];

  /** The latest failed runs, newest first */
  recentFailures: RunRow[];

  /** Only the kinds of work that are waiting */
  pending: PendingWork[];
}

@route("/console/benchmarks")
@useAuth(SessionCookie)
interface ConsoleBenchmarks {
  @get list(...LanguageHeader): Localized<ConsoleBenchmark[]> | SignInRequiredError;

  @get
  @route("/{benchmarkId}")
  read(@path benchmarkId: string, ...LanguageHeader): Localized<ConsoleBenchmark> | SignInRequiredError | NotFoundError;

  @get
  @route("/{benchmarkId}/overview")
  overview(@path benchmarkId: string, ...LanguageHeader): Localized<BenchmarkOverview> | SignInRequiredError | NotFoundError;
}
