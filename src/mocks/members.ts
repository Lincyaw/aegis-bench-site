import type { ConsoleUser, Invitation, Member, Role } from '../api/types';

/*
 * The workspace's members and what their roles allow. The demo starts with these members, each of whom signs in with
 * the demo password; the list lives in memory, so a reload brings it back.
 */

const INITIAL_MEMBERS: Member[] = [
  { account: 'lin.fang', name: '林芳', role: 'admin', joinedAt: '2026-06-02T09:00:00Z', lastSignedInAt: '2026-11-24T08:40:00Z' },
  { account: 'zhou.yu', name: '周宇', role: 'editor', joinedAt: '2026-06-02T09:00:00Z', lastSignedInAt: '2026-11-23T10:12:00Z' },
  { account: 'chen.qi', name: '陈琦', role: 'editor', joinedAt: '2026-07-14T09:00:00Z', lastSignedInAt: '2026-11-21T15:30:00Z' },
  { account: 'he.ming', name: '何明', role: 'viewer', joinedAt: '2026-09-01T09:00:00Z' },
];

/** The order the member list follows: administrators, editors, then viewers. */
const ROLE_ORDER: readonly Role[] = ['admin', 'editor', 'viewer'];

const members: Member[] = structuredClone(INITIAL_MEMBERS);

export function memberOf(account: string): Member | undefined {
  return members.find(member => member.account === account);
}

export function membersInOrder(): Member[] {
  return [...members].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.account.localeCompare(b.account));
}

/** Whether a role may draft, publish and restore releases and draft and review reports. */
export function mayEdit(role: Role): boolean {
  return role !== 'viewer';
}

/** Whether a role may manage the members and the settings. */
export function mayAdminister(role: Role): boolean {
  return role === 'admin';
}

/** The answer to a member whose role does not allow what they asked for. */
export function refusalFor(user: ConsoleUser, needed: Role): { message: string } {
  return { message: `${user.account} is ${user.role === 'admin' ? 'an' : 'a'} ${user.role}; this needs ${needed === 'admin' ? 'an administrator' : 'an editor'}` };
}

/** Whether a member's leaving the administrators, by a new role or by removal, would leave the workspace without one. */
export function leavesNoAdministrator(member: Member, role: Role | undefined): boolean {
  return member.role === 'admin' && role !== 'admin' && members.filter(candidate => candidate.role === 'admin').length === 1;
}

export function inviteMember(invitation: Invitation): Member {
  const member: Member = { ...invitation, joinedAt: new Date().toISOString() };
  members.push(member);
  return member;
}

export function changeRole(member: Member, role: Role): Member {
  member.role = role;
  return member;
}

export function removeMember(member: Member) {
  members.splice(members.indexOf(member), 1);
}

export function recordSignIn(member: Member) {
  member.lastSignedInAt = new Date().toISOString();
}
