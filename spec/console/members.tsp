import "@typespec/http";
import "./session.tsp";

using Http;

namespace AegisBench.Console;

/** Someone who may sign in to the console, with the role that decides what they may change. */
model Member {
  account: AccountName;
  name: string;
  role: Role;
  joinedAt: utcDateTime;

  /** When the member last signed in; absent for one who never has */
  lastSignedInAt?: utcDateTime;
}

/** A new member: the account they sign in with, their name and their role. */
model Invitation {
  account: AccountName;

  @minLength(1)
  @maxLength(64)
  name: string;

  role: Role;
}

model RoleChange {
  role: Role;
}

/** The account is a member already, or the change would leave the workspace without an administrator. */
@error
model MemberConflictError {
  @statusCode _: 409;
  message: string;
}

/** Every member reads the list; only administrators change it. */
@route("/console/members")
@useAuth(SessionCookie)
interface ConsoleMembers {
  /** Every member: administrators first, then editors, then viewers, each by account */
  @get list(): Member[] | SignInRequiredError;

  /** Adds a member, who can sign in from then on */
  @post invite(@body invitation: Invitation): Member | SignInRequiredError | ForbiddenError | MemberConflictError;

  @put
  @route("/{account}/role")
  changeRole(@path account: string, @body change: RoleChange): Member | SignInRequiredError | ForbiddenError | NotFoundError | MemberConflictError;

  /** Removes a member, whose session ends with it; answers the members that remain */
  @delete
  @route("/{account}")
  remove(@path account: string): Member[] | SignInRequiredError | ForbiddenError | NotFoundError | MemberConflictError;
}
