import "@typespec/http";
import "./session.tsp";

using Http;

namespace AegisBench.Console;

/** An e-mail address: a local part, an `@` and a domain with a dot. */
@pattern("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")
scalar EmailAddress extends string;

/** One check an author ticks off before a report goes to review, in a line. */
@minLength(1)
@maxLength(120)
scalar ReportCheck extends string;

/** The workspace's name in the console, and what the public site gives as its contact. */
model WorkspaceInfo {
  @minLength(1)
  @maxLength(64)
  name: string;

  contactEmail: EmailAddress;
}

/** What a report must pass before it can be committed to the public site. */
model PublicationRules {
  /** How many members other than the author must approve a report */
  @minValue(1)
  @maxValue(5)
  reportReviewers: int32;

  /** The checks every report's author ticks off before submitting it for review, in order */
  @maxItems(10)
  reportChecks: ReportCheck[];
}

/** What an administrator sets. */
model SettingsChange {
  workspace: WorkspaceInfo;
  publication: PublicationRules;
}

model Settings {
  ...SettingsChange;

  /** Who last changed the settings, and when */
  updatedBy: AccountName;

  updatedAt: utcDateTime;
}

/** Every member reads the settings; only administrators change them. */
@route("/console/settings")
@useAuth(SessionCookie)
interface ConsoleSettings {
  @get read(): Settings | SignInRequiredError;
  @put update(@body change: SettingsChange): Settings | SignInRequiredError | ForbiddenError;
}
