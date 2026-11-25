import "@typespec/http";
import "./session.tsp";
import "./results.tsp";
import "./tasks.tsp";
import "./models.tsp";

using Http;

namespace AegisBench.Console;

/**
 * A collection is the set of a benchmark's tasks that carry one tag, for comparing models on them. It is not stored:
 * a task joins or leaves it as its tags change.
 */
model CollectionSummary {
  tag: string;
  taskCount: int32;

  /** Every model's runs on the collection's tasks */
  result: ResultCounts;
}

/** A model over every harness it ran in, on a collection's tasks. */
model CollectionModelResult {
  ...ConsoleModelResult;

  /**
   * Whether no other model passes more often for a lower mean cost: the model lies on the frontier of cost against pass
   * rate
   */
  onCostFrontier: boolean;
}

/** How many of a model's counted runs on one task passed. */
model MatrixCell {
  passed: int32;
  counted: int32;
}

model MatrixRow {
  task: TaskRef;

  /** One cell per model, in the order of the page's models */
  cells: MatrixCell[];
}

/** A page of a collection's tasks against every model; the models are the same on every page. */
model CollectionMatrixPage is Page<MatrixRow> {
  /** Best pass rate on the collection first */
  models: ModelRef[];
}

@route("/console/benchmarks/{benchmarkId}/collections")
@useAuth(SessionCookie)
interface ConsoleCollections {
  /** One collection per tag of the benchmark's tasks, the largest first */
  @get list(@path benchmarkId: string): CollectionSummary[] | SignInRequiredError | NotFoundError;

  /** Every model on the collection's tasks, best pass rate first */
  @get
  @route("/{tag}/models")
  models(@path benchmarkId: string, @path tag: string, ...LanguageHeader): Localized<CollectionModelResult[]> | SignInRequiredError | NotFoundError;

  /** The collection's tasks against every model, a page of tasks at a time */
  @get
  @route("/{tag}/matrix")
  matrix(
    @path benchmarkId: string,
    @path tag: string,

    /** By the pass rate of every model's runs on each task */
    @query(#{ explode: true }) order?: TaskOrder = TaskOrder.hardest,

    ...PageQuery<20>,
    ...LanguageHeader,
  ): Localized<CollectionMatrixPage> | SignInRequiredError | NotFoundError;
}
