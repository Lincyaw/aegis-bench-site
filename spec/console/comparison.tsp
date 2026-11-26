import "@typespec/http";
import "./session.tsp";
import "../comparison.tsp";

using Http;

namespace AegisBench.Console;

/** A task's runs side by side for checking the task, with the class each failure's review gives it. */
@route("/console/benchmarks/{benchmarkId}/tasks/{taskId}/comparison")
@useAuth(SessionCookie)
interface ConsoleTaskComparison {
  @get compare(
    @path benchmarkId: string,
    @path taskId: string,

    /** The runs to compare, each a run of the task */
    @query(#{ explode: true })
    @minItems(1)
    @maxItems(MAX_COMPARED_RUNS)
    runs: string[],

    ...LanguageHeader,
  ): Localized<TaskComparison> | SignInRequiredError | NotFoundError | HuggingFaceUnreachableError;
}
