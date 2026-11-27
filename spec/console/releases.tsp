import "@typespec/http";
import "./session.tsp";

using Http;

namespace AegisBench.Console;

/*
 * Releases decide what the public site shows of each benchmark. A benchmark publishes on its own: staff draft its next
 * release as a copy of the current one, change what it shows, and publish it with a note; the release it replaces is
 * superseded and can be published again later, as a new version that restores it.
 */

/** Where a release stands: being drafted, the one the public site shows, or one it showed before. */
enum ReleaseStatus {
  draft,
  current,
  superseded,
}

/** A text in each of the site's languages; none may be left empty. */
model TextByLocale {
  @minLength(1) `zh-CN`: string;
  @minLength(1) en: string;
}

/** A model and the harness it ran in, by id. */
model EntrantKey {
  modelId: string;
  harnessId: string;
}

/** What a release puts on the public site for its benchmark. */
model ReleaseContent {
  /** The benchmark's one-line summary */
  summary: TextByLocale;

  /** The combinations the leaderboard ranks, in no particular order; the ranking comes from their results */
  @minItems(1)
  entrants: EntrantKey[];

  /** The runs the benchmark's page shows as examples, in the order shown */
  exampleRuns: string[];
}

/** How a release differs from the one that was current when it was drafted, or that it replaced. */
model ReleaseChanges {
  entrantsAdded: int32;
  entrantsRemoved: int32;
  exampleRunsAdded: int32;
  exampleRunsRemoved: int32;
  summaryChanged: boolean;
}

model ReleaseSummary {
  id: string;
  benchmark: BenchmarkRef;

  /** Counted from 1 per benchmark; a draft carries the number it will publish as */
  version: int32;

  status: ReleaseStatus;

  /** What the release changes, as its publisher wrote it; absent on a draft */
  note?: string;

  /** Who published it, or who last changed the draft */
  author: string;

  /** When it was published, or when the draft last changed */
  updatedAt: utcDateTime;

  /** The version it published again, for a release that restores an earlier one */
  restoresVersion?: int32;

  changes: ReleaseChanges;
}

model ReleaseDetail {
  ...ReleaseSummary;
  content: ReleaseContent;
}

/** One benchmark with the release the public site shows and the draft in progress. */
model ReleaseBenchmarkRow {
  benchmark: BenchmarkRef;
  current: ReleaseSummary;
  draft?: ReleaseSummary;
}

model ReleaseOverview {
  benchmarks: ReleaseBenchmarkRow[];

  /** The latest publications over every benchmark, newest first */
  recent: ReleaseSummary[];
}

model PublishRequest {
  /** What the release changes, in a sentence or two, for the release history */
  @minLength(1)
  note: string;
}

/** The release is not in a state that allows the change: only a draft is edited, published or discarded, and only a superseded release restored. */
@error
model ReleaseConflictError {
  @statusCode _: 409;
  message: string;
}

/** The content names a combination the benchmark did not rank, or a run that is not the benchmark's. */
@error
model InvalidReleaseContentError {
  @statusCode _: 422;
  message: string;
}

@route("/console/releases")
@useAuth(SessionCookie)
interface ConsoleReleases {
  @get overview(): ReleaseOverview | SignInRequiredError;

  @get
  @route("/{releaseId}")
  read(@path releaseId: string): ReleaseDetail | SignInRequiredError | NotFoundError;

  /** Replaces what a draft publishes */
  @put
  @route("/{releaseId}")
  update(@path releaseId: string, @body content: ReleaseContent): ReleaseDetail | SignInRequiredError | ForbiddenError | NotFoundError | ReleaseConflictError | InvalidReleaseContentError;

  /** Drops a draft; the benchmark keeps its current release. Answers the benchmark's releases that remain. */
  @delete
  @route("/{releaseId}")
  discard(@path releaseId: string): ReleaseSummary[] | SignInRequiredError | ForbiddenError | NotFoundError | ReleaseConflictError;

  /** Publishes a draft: the public site shows it from now on, and the release it replaces is superseded */
  @post
  @route("/{releaseId}/publish")
  publish(@path releaseId: string, @body request: PublishRequest): ReleaseDetail | SignInRequiredError | ForbiddenError | NotFoundError | ReleaseConflictError;

  /** Publishes a superseded release again, as a new version that restores it */
  @post
  @route("/{releaseId}/restore")
  restore(@path releaseId: string, @body request: PublishRequest): ReleaseDetail | SignInRequiredError | ForbiddenError | NotFoundError | ReleaseConflictError;
}

@route("/console/benchmarks/{benchmarkId}/releases")
@useAuth(SessionCookie)
interface ConsoleBenchmarkReleases {
  /** The benchmark's releases: its draft, if any, then every version it published, newest first */
  @get list(@path benchmarkId: string): ReleaseSummary[] | SignInRequiredError | NotFoundError;

  /** Starts the benchmark's next release as a copy of its current one; a benchmark has at most one draft */
  @post draft(@path benchmarkId: string): ReleaseDetail | SignInRequiredError | ForbiddenError | NotFoundError | ReleaseConflictError;
}
