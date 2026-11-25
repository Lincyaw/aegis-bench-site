import "@typespec/http";
import "./session.tsp";
import "./releases.tsp";
import "./settings.tsp";

using Http;

namespace AegisBench.Console;

/*
 * Reports are written and reviewed in the console and published as files: once a draft has the approvals the settings
 * require, its documents are committed to content/reports/<slug>/<locale>.mdx, and the public site shows the report
 * from its next build. The console never changes the public site's reports itself.
 */

/** A report's directory under content/reports: lowercase words and digits joined by hyphens. */
@pattern("^[a-z0-9]+(-[a-z0-9]+)*$")
@maxLength(64)
scalar ReportSlug extends string;

/**
 * A report's document in each language, as its file holds it: MDX whose frontmatter declares at least the title, the
 * date (YYYY-MM-DD) and the summary, and may list the ids of the benchmarks and models it is about.
 */
model ReportSources {
  `zh-CN`: string;
  en: string;
}

/** Where a draft stands: being written, waiting for reviewers, or approved and ready to commit. */
enum ReportStatus {
  draft,
  inReview,
  approved,
}

enum ReviewVerdict {
  approve,
  requestChanges,
}

model ReportReview {
  reviewer: AccountName;
  verdict: ReviewVerdict;
  comment?: string;
  at: utcDateTime;
}

model ReportDraftSummary {
  id: string;
  slug: ReportSlug;

  /** The title each language's frontmatter declares */
  title: TextByLocale;

  /** The benchmarks the frontmatter names */
  benchmarkIds: string[];

  status: ReportStatus;
  author: AccountName;
  updatedAt: utcDateTime;

  /** When the draft was last submitted for review; absent for one never submitted */
  submittedAt?: utcDateTime;

  /** Approvals since the draft was last submitted */
  approvals: int32;

  /** Approvals the settings require, counted when the draft was submitted or, before that, now */
  approvalsRequired: int32;
}

model ReportDraft {
  ...ReportDraftSummary;
  sources: ReportSources;

  /** The settings' checks the author has ticked off */
  checked: ReportCheck[];

  /** Every review, oldest first, across every submission */
  reviews: ReportReview[];
}

model NewReport {
  slug: ReportSlug;
  sources: ReportSources;
}

model ReportEdit {
  sources: ReportSources;
  checked: ReportCheck[];
}

model ReviewRequest {
  verdict: ReviewVerdict;

  @maxLength(2000)
  comment?: string;
}

/**
 * The draft is not in a state that allows the change: only a draft is edited, submitted with every check ticked, a
 * draft in review is reviewed once by each member other than its author, and a slug has one draft at a time.
 */
@error
model ReportConflictError {
  @statusCode _: 409;
  message: string;
}

/** A document's frontmatter lacks the title, date or summary, or names a benchmark the workspace does not have. */
@error
model InvalidReportError {
  @statusCode _: 422;
  message: string;
}

/** Every member reads the drafts; editors write, submit, review and discard them. */
@route("/console/reports")
@useAuth(SessionCookie)
interface ConsoleReports {
  /** The drafts, newest first; only those whose frontmatter names the benchmark, when one is given */
  @get list(@query(#{ explode: true }) benchmarkId?: string = ""): ReportDraftSummary[] | SignInRequiredError;

  /** Starts a draft, new or revising a published report under the same slug */
  @post create(@body report: NewReport): ReportDraft | SignInRequiredError | ForbiddenError | ReportConflictError | InvalidReportError;

  @get
  @route("/{reportId}")
  read(@path reportId: string): ReportDraft | SignInRequiredError | NotFoundError;

  @put
  @route("/{reportId}")
  update(@path reportId: string, @body edit: ReportEdit): ReportDraft | SignInRequiredError | ForbiddenError | NotFoundError | ReportConflictError | InvalidReportError;

  /** Sends a draft to its reviewers once every check is ticked */
  @post
  @route("/{reportId}/submit")
  submit(@path reportId: string): ReportDraft | SignInRequiredError | ForbiddenError | NotFoundError | ReportConflictError;

  /** One member's review: approvals up to the required number approve the draft, and a request for changes returns it to its author */
  @post
  @route("/{reportId}/reviews")
  review(@path reportId: string, @body request: ReviewRequest): ReportDraft | SignInRequiredError | ForbiddenError | NotFoundError | ReportConflictError;

  /** Drops a draft, such as one whose files are committed; answers the drafts that remain */
  @delete
  @route("/{reportId}")
  discard(@path reportId: string): ReportDraftSummary[] | SignInRequiredError | ForbiddenError | NotFoundError;
}
