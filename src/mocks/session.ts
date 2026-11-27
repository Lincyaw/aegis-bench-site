import { consoleRoleValues } from '../api/schema';
import type { ConsoleUser, DemoHint, Member } from '../api/types';
import { abilitiesOf, memberOf, membersInOrder } from './members';

/** The cookie the spec's SessionCookie names; its value is the signed-in account, whose name needs no encoding. */
export const SESSION_COOKIE = 'aegis_console';

/** Every member of the demo signs in with this password; the session's demo hint tells the sign-in page so. */
export const DEMO_PASSWORD = 'demo';

/**
 * The demo opens signed in as this administrator on a browser that carries no session cookie at all; a browser that
 * signed out carries an empty one, so it stays out until it signs in or closes.
 */
export const DEMO_ACCOUNT = 'lin.fang';

/** The session lasts a working day. */
export const SESSION_SECONDS = 8 * 60 * 60;

/** The answer of every console operation but the session's own when the request carries no session. */
export const SIGN_IN_REQUIRED = { message: 'sign in to use the console' };

export function consoleUserOf(member: Member): ConsoleUser {
  const initials = member.account.split(/[._-]+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
  return { account: member.account, name: member.name, initials, role: member.role, can: abilitiesOf(member.role) };
}

/** What the demo tells the sign-in page: the password, and the first member of each role that has one. */
export function demoHint(): DemoHint {
  const members = membersInOrder();
  return {
    password: DEMO_PASSWORD,
    accounts: consoleRoleValues.flatMap(role => members.filter(member => member.role === role).slice(0, 1).map(member => ({ account: member.account, role }))),
  };
}

/** The signed-in user a request's cookies carry, if any; a session ends once its account is no longer a member. */
export function sessionUserOf(cookies: Record<string, string>): ConsoleUser | undefined {
  const member = memberOf(cookies[SESSION_COOKIE] ?? '');
  return member && consoleUserOf(member);
}

/** Whether the browser signed out: it carries the session cookie, emptied. */
export function signedOut(cookies: Record<string, string>): boolean {
  return cookies[SESSION_COOKIE] === '';
}

export function signedInCookie(account: string): string {
  return `${SESSION_COOKIE}=${account}; Path=/; Max-Age=${SESSION_SECONDS}; SameSite=Lax`;
}

/** Empties the session cookie for as long as the browser's session lasts, which tells a sign-out from no sign-in yet. */
export function signedOutCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; SameSite=Lax`;
}
