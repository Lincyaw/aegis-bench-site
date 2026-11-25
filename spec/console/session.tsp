import "@typespec/http";

using Http;

/**
 * The internal console: the records behind every benchmark, for the staff who run, review and publish evaluations.
 * Only members sign in. Signing in sets the session cookie, and every console operation but the session's own answers
 * 401 without it; an operation the member's role does not allow answers 403.
 */
namespace AegisBench.Console;

/** The cookie that carries a signed-in session. */
model SessionCookie is ApiKeyAuth<ApiKeyLocation.cookie, "aegis_console">;

/** The request carries no signed-in session. */
@error
model SignInRequiredError {
  @statusCode _: 401;
  message: string;
}

/** The account is not a member, or the password does not match. */
@error
model SignInFailedError {
  @statusCode _: 401;
  message: string;
}

/** The signed-in member's role does not allow the operation. */
@error
model ForbiddenError {
  @statusCode _: 403;
  message: string;
}

/** An account name: letters, digits, dots, underscores and hyphens, such as "lin.fang". The hyphen is escaped so that browsers can check the pattern in a form field too. */
@pattern("^[A-Za-z0-9._\\-]{1,64}$")
scalar AccountName extends string;

/**
 * What a member may do. Every member reads everything; editors also draft, publish and restore releases and draft and
 * review reports; administrators also manage the members and the settings.
 */
enum Role {
  admin,
  editor,
  viewer,
}

model ConsoleUser {
  account: AccountName;

  /** The member's name, as colleagues know them */
  name: string;

  /** Up to two letters standing for the account, as its avatar shows them */
  initials: string;

  role: Role;
}

/** Who is signed in on this browser; no user when nobody is. */
model SessionState {
  user?: ConsoleUser;
}

model SignInRequest {
  account: AccountName;
  password: string;
}

@route("/console/session")
interface ConsoleSession {
  @get read(): SessionState;

  /** Signs in: the response sets the session cookie */
  @post signIn(@body request: SignInRequest): SessionState | SignInFailedError;

  /** Signs out: the response clears the session cookie */
  @delete signOut(): SessionState;
}
