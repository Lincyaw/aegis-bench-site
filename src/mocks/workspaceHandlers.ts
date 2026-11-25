import { delay } from 'msw';
import { BENCHMARKS, hasBenchmark } from './benchmarks';
import { changeRole, inviteMember, leavesNoAdministrator, mayAdminister, memberOf, membersInOrder, recordSignIn, refusalFor, removeMember } from './members';
import { http, localeOf, pageOf, writtenIn } from './protocol';
import { DEMO_PASSWORD, SIGN_IN_REQUIRED, consoleUserOf, sessionUserOf, signedInCookie, signedOutCookie } from './session';
import { currentSettings, updateSettings } from './settings';
import { DEFAULT_CHANGELOG_PAGE_SIZE, changelogOf, workbenchOf } from './workspace';

/**
 * The console's operations that belong to no benchmark: the session, the members and the settings, the workbench and
 * the changelog. The session's own answer anyone; members change only by an administrator.
 */
export const workspaceHandlers = [
  http.get('/console/session', ({ cookies, response }) => {
    const user = sessionUserOf(cookies);
    return response(200).json(user ? { user } : {});
  }),

  http.post('/console/session', async ({ request, response }) => {
    const { account, password } = await request.json();
    const member = memberOf(account);
    await delay(240);
    if (!member || password !== DEMO_PASSWORD) {
      return response(401).json({ message: 'the account is not a member, or the password does not match' });
    }
    recordSignIn(member);
    return response(200).json({ user: consoleUserOf(member) }, { headers: { 'Set-Cookie': signedInCookie(account) } });
  }),

  http.delete('/console/session', ({ response }) => response(200).json({}, { headers: { 'Set-Cookie': signedOutCookie() } })),

  http.get('/console/members', async ({ cookies, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    await delay(80);
    return response(200).json(membersInOrder());
  }),

  http.post('/console/members', async ({ cookies, request, response }) => {
    const user = sessionUserOf(cookies);
    if (!user) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!mayAdminister(user.role)) {
      return response(403).json(refusalFor(user, 'admin'));
    }
    const invitation = await request.json();
    if (memberOf(invitation.account)) {
      return response(409).json({ message: `${invitation.account} is a member already` });
    }
    await delay(160);
    return response(200).json(inviteMember(invitation));
  }),

  http.put('/console/members/{account}/role', async ({ cookies, params, request, response }) => {
    const user = sessionUserOf(cookies);
    if (!user) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!mayAdminister(user.role)) {
      return response(403).json(refusalFor(user, 'admin'));
    }
    const member = memberOf(params.account);
    if (!member) {
      return response(404).json({ message: `no member ${params.account}` });
    }
    const { role } = await request.json();
    if (leavesNoAdministrator(member, role)) {
      return response(409).json({ message: `${member.account} is the only administrator` });
    }
    await delay(120);
    return response(200).json(changeRole(member, role));
  }),

  http.delete('/console/members/{account}', async ({ cookies, params, response }) => {
    const user = sessionUserOf(cookies);
    if (!user) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!mayAdminister(user.role)) {
      return response(403).json(refusalFor(user, 'admin'));
    }
    const member = memberOf(params.account);
    if (!member) {
      return response(404).json({ message: `no member ${params.account}` });
    }
    if (leavesNoAdministrator(member, undefined)) {
      return response(409).json({ message: `${member.account} is the only administrator` });
    }
    removeMember(member);
    await delay(120);
    return response(200).json(membersInOrder());
  }),

  http.get('/console/settings', ({ cookies, response }) => (
    sessionUserOf(cookies) ? response(200).json(currentSettings()) : response(401).json(SIGN_IN_REQUIRED)
  )),

  http.put('/console/settings', async ({ cookies, request, response }) => {
    const user = sessionUserOf(cookies);
    if (!user) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!mayAdminister(user.role)) {
      return response(403).json(refusalFor(user, 'admin'));
    }
    const change = await request.json();
    await delay(160);
    return response(200).json(updateSettings(change, user.account));
  }),

  http.get('/console/workbench', async ({ cookies, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const locale = localeOf(request);
    await delay(120);
    return response(200).json(workbenchOf(locale), writtenIn(locale));
  }),

  http.get('/console/changelog', async ({ cookies, query, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const benchmarkId = query.get('benchmarkId') ?? '';
    if (benchmarkId && !hasBenchmark(benchmarkId)) {
      return response(404).json({ message: `no benchmark ${benchmarkId}` });
    }
    const entries = changelogOf(benchmarkId ? [benchmarkId] : BENCHMARKS.map(benchmark => benchmark.id), query.get('change') ?? undefined);
    await delay(100);
    return response(200).json(pageOf(entries, query, DEFAULT_CHANGELOG_PAGE_SIZE));
  }),
];
