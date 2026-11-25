import type { ConsoleUser } from '../api/types';

/** The cookie the spec's SessionCookie names; its value is the signed-in account, whose name needs no encoding. */
export const SESSION_COOKIE = 'aegis_console';

/** The demo accepts any account with this password; the sign-in page tells the reader so. */
export const DEMO_PASSWORD = 'aegis';

/** The session lasts a working day. */
export const SESSION_SECONDS = 8 * 60 * 60;

export function consoleUserOf(account: string): ConsoleUser {
  const initials = account.split(/[._-]+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
  return { account, initials };
}

/** The signed-in user a request's cookies carry, if any. */
export function sessionUserOf(cookies: Record<string, string>): ConsoleUser | undefined {
  const account = cookies[SESSION_COOKIE];
  return account ? consoleUserOf(account) : undefined;
}

export function signedInCookie(account: string): string {
  return `${SESSION_COOKIE}=${account}; Path=/; Max-Age=${SESSION_SECONDS}; SameSite=Lax`;
}

export function signedOutCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
