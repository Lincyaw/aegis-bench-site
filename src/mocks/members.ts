import { consoleRoleValues } from '../api/schema';
import type { Abilities, ConsoleUser, Invitation, Member, Role } from '../api/types';
import { openedIndexes } from './records';

/*
 * The workspace's members and what their roles allow. The demo starts with the members of members.json, each of whom
 * signs in with the demo password; the list lives in memory, so a reload brings it back.
 */

let members: Member[] | undefined;

/** The members as changed since the server opened the data directory. */
export function currentMembers(): Member[] {
  members ??= structuredClone(openedIndexes().members);
  return members;
}

export function memberOf(account: string): Member | undefined {
  return currentMembers().find(member => member.account === account);
}

/** Administrators, editors, then viewers, each by account. */
export function membersInOrder(): Member[] {
  return [...currentMembers()].sort((a, b) => consoleRoleValues.indexOf(a.role) - consoleRoleValues.indexOf(b.role) || a.account.localeCompare(b.account));
}

/** Whether a role may draft, publish and restore releases and draft and review reports. */
export function mayEdit(role: Role): boolean {
  return role !== 'viewer';
}

/** Whether a role may manage the members and the settings. */
export function mayAdminister(role: Role): boolean {
  return role === 'admin';
}

export function abilitiesOf(role: Role): Abilities {
  return { edit: mayEdit(role), administer: mayAdminister(role) };
}

/** The answer to a member whose role does not allow what they asked for. */
export function refusalFor(user: ConsoleUser, needed: Role): { message: string } {
  return { message: `${user.account} is ${user.role === 'admin' ? 'an' : 'a'} ${user.role}; this needs ${needed === 'admin' ? 'an administrator' : 'an editor'}` };
}

/** Whether a member's leaving the administrators, by a new role or by removal, would leave the workspace without one. */
export function leavesNoAdministrator(member: Member, role: Role | undefined): boolean {
  return member.role === 'admin' && role !== 'admin' && currentMembers().filter(candidate => candidate.role === 'admin').length === 1;
}

export function inviteMember(invitation: Invitation): Member {
  const member: Member = { ...invitation, joinedAt: new Date().toISOString() };
  currentMembers().push(member);
  return member;
}

export function changeRole(member: Member, role: Role): Member {
  member.role = role;
  return member;
}

export function removeMember(member: Member) {
  currentMembers().splice(currentMembers().indexOf(member), 1);
}

export function recordSignIn(member: Member) {
  member.lastSignedInAt = new Date().toISOString();
}
