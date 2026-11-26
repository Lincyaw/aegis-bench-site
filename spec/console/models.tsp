import "@typespec/http";
import "./session.tsp";
import "./runs.tsp";
import "./results.tsp";
import "./tasks.tsp";

using Http;

namespace AegisBench.Console;

/** A model over every harness it ran in on one benchmark. */
model ConsoleModelResult {
  `model`: ModelRef;

  /** The harnesses its runs on the benchmark used, in ranking order */
  harnesses: HarnessRef[];

  result: ResultCounts;
}

model HarnessResult {
  harness: HarnessRef;
  result: ResultCounts;
}

/** A model on one benchmark, over all its harnesses and with each. */
model ConsoleModelDetail {
  `model`: ModelRef;
  benchmark: BenchmarkRef;
  result: ResultCounts;

  /** Best pass rate first */
  byHarness: HarnessResult[];
}

/** One run in a list of a model's tasks. */
model ModelTaskRun {
  id: string;
  harness: HarnessRef;
  attempt: int32;
  outcome: RunOutcome;
  failureClass?: FailureClass;
}

/** A model's runs on one task and what they come to. */
model ModelTaskRow {
  task: TaskRef;

  /** By harness, then attempt */
  runs: ModelTaskRun[];

  result: ResultCounts;

  /** How the model's counted runs on the task fall; absent while none counts */
  spread?: TaskSpread;
}

/** A page of a model's tasks, with what the model's runs come to over every listed task. */
model ModelTaskPage is Page<ModelTaskRow> {
  totals: ResultCounts;
}

@route("/console/benchmarks/{benchmarkId}/models")
@useAuth(SessionCookie)
interface ConsoleModels {
  /** Every model that ran on the benchmark, best pass rate first */
  @get list(@path benchmarkId: string, ...LanguageHeader): Localized<ConsoleModelResult[]> | SignInRequiredError | NotFoundError;

  /** The model's results over the tasks the page keeps to: a collection's, one task, or every task */
  @get
  @route("/{modelId}")
  read(
    @path benchmarkId: string,
    @path modelId: string,

    /** Only the tasks of the collection with this tag; every task when empty */
    @query(#{ explode: true }) tag?: string = "",

    /** Only this task, by its id; every task when empty */
    @query(#{ explode: true }) task?: string = "",

    ...LanguageHeader,
  ): Localized<ConsoleModelDetail> | SignInRequiredError | NotFoundError;

  /** The model's results task by task, a page at a time */
  @get
  @route("/{modelId}/tasks")
  tasks(
    @path benchmarkId: string,
    @path modelId: string,

    /** Only the runs in this harness; every harness when empty */
    @query(#{ explode: true }) harness?: string = "",

    /** Only the tasks of the collection with this tag; every task when empty */
    @query(#{ explode: true }) tag?: string = "",

    /** Only this task, by its id; every task when empty */
    @query(#{ explode: true }) task?: string = "",

    /** Matches the task id or title, within the tasks the page keeps to */
    @query(#{ explode: true }) q?: string = "",

    /** Only tasks on which the model's runs fall this way */
    @query(#{ explode: true }) spread?: TaskSpread,

    /** By the model's own pass rate on each task */
    @query(#{ explode: true }) order?: TaskOrder = TaskOrder.hardest,

    ...PageQuery<20>,
    ...LanguageHeader,
  ): Localized<ModelTaskPage> | SignInRequiredError | NotFoundError;
}
