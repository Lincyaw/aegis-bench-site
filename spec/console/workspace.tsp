import "@typespec/http";
import "./session.tsp";
import "./results.tsp";
import "./tasks.tsp";
import "./releases.tsp";

using Http;

namespace AegisBench.Console;

/** One benchmark on the workbench: its size, the work waiting in it and where its releases stand. */
model WorkbenchRow {
  benchmark: ConsoleBenchmark;
  unreviewedFailures: int32;
  executionFailures: int32;
  current: ReleaseSummary;
  draft?: ReleaseSummary;
}

/** Every benchmark at a glance, and the latest publications. */
model Workbench {
  benchmarks: WorkbenchRow[];
  recentReleases: ReleaseSummary[];
}

/** A version of a task, in the log of every task's versions. */
model ChangelogEntry {
  benchmark: BenchmarkRef;
  task: TaskRef;
  revision: TaskRevision;
}

model ChangelogPage is Page<ChangelogEntry>;

@route("/console/workbench")
@useAuth(SessionCookie)
interface ConsoleWorkbench {
  @get read(...LanguageHeader): Localized<Workbench> | SignInRequiredError;
}

@route("/console/changelog")
@useAuth(SessionCookie)
interface ConsoleChangelog {
  /** Every version of every task, newest first, a page at a time */
  @get list(
    /** Only this benchmark's tasks; every benchmark when empty */
    @query(#{ explode: true }) benchmarkId?: string = "",

    @query(#{ explode: true }) change?: RevisionChange,
    ...PageQuery<25>,
  ): ChangelogPage | SignInRequiredError | NotFoundError;
}
