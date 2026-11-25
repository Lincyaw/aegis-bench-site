import { delay } from 'msw';
import { BENCHMARKS, hasBenchmark } from './benchmarks';
import { http, localeOf, writtenIn } from './protocol';
import { consoleBenchmarkOf, overviewOf } from './results';
import { DEMO_PASSWORD, consoleUserOf, sessionUserOf, signedInCookie, signedOutCookie } from './session';

/** The answer of every console operation but the session's own when the request carries no session. */
export const SIGN_IN_REQUIRED = { message: 'sign in to use the console' };

/** The console's operations: the session's own answer anyone, the others only a signed-in session. */
export const consoleHandlers = [
  http.get('/console/session', ({ cookies, response }) => {
    const user = sessionUserOf(cookies);
    return response(200).json(user ? { user } : {});
  }),

  http.post('/console/session', async ({ request, response }) => {
    const { account, password } = await request.json();
    await delay(240);
    if (password !== DEMO_PASSWORD) {
      return response(401).json({ message: 'the account and password do not match' });
    }
    return response(200).json({ user: consoleUserOf(account) }, { headers: { 'Set-Cookie': signedInCookie(account) } });
  }),

  http.delete('/console/session', ({ response }) => response(200).json({}, { headers: { 'Set-Cookie': signedOutCookie() } })),

  http.get('/console/benchmarks', ({ cookies, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const locale = localeOf(request);
    return response(200).json(BENCHMARKS.map(record => consoleBenchmarkOf(record.id, locale)), writtenIn(locale));
  }),

  http.get('/console/benchmarks/{benchmarkId}/overview', async ({ cookies, params, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    await delay(120);
    return response(200).json(overviewOf(params.benchmarkId, locale), writtenIn(locale));
  }),
];
