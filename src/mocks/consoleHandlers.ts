import { delay } from 'msw';
import { BENCHMARKS, hasBenchmark } from './benchmarks';
import {
  DEFAULT_CONSOLE_TASK_PAGE_SIZE, checkResultsOf, consoleEntriesOf, consoleTaskOf, filteredTasksOf, namedTaskOf, referenceFilesOf, revisionsOf,
  tagCountsOf, taskEntrantRunsOf, taskGradingOf, taskRowOf,
} from './consoleTasks';
import { http, localeOf, pageOf, writtenIn } from './protocol';
import { consoleBenchmarkOf, overviewOf } from './results';
import { DEFAULT_ENTRY_PAGE_SIZE, taskFileOf, taskFilesOf } from './taskFiles';
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

  http.get('/console/benchmarks/{benchmarkId}/tasks', async ({ cookies, params, query, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    const filter = { q: (query.get('q') ?? '').trim(), tag: query.get('tag') ?? '', spread: query.get('spread') ?? undefined, order: query.get('order') ?? 'hardest' };
    const page = pageOf(filteredTasksOf(params.benchmarkId, filter), query, DEFAULT_CONSOLE_TASK_PAGE_SIZE);
    await delay(100);
    return response(200).json({ ...page, items: page.items.map(task => taskRowOf(params.benchmarkId, task, locale)), tags: tagCountsOf(params.benchmarkId) }, writtenIn(locale));
  }),

  http.get('/console/benchmarks/{benchmarkId}/tasks/{taskId}', async ({ cookies, params, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const task = namedTaskOf(params.benchmarkId, params.taskId);
    if (!task) {
      return response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    await delay(80);
    return response(200).json(consoleTaskOf(params.benchmarkId, task, locale), writtenIn(locale));
  }),

  http.get('/console/benchmarks/{benchmarkId}/tasks/{taskId}/grading', ({ cookies, params, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const task = namedTaskOf(params.benchmarkId, params.taskId);
    return task ? response(200).json(taskGradingOf(params.benchmarkId, task)) : response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
  }),

  http.get('/console/benchmarks/{benchmarkId}/tasks/{taskId}/reference', ({ cookies, params, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const task = namedTaskOf(params.benchmarkId, params.taskId);
    return task ? response(200).json(referenceFilesOf(params.benchmarkId, task.id)) : response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
  }),

  http.get('/console/benchmarks/{benchmarkId}/tasks/{taskId}/results', async ({ cookies, params, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const task = namedTaskOf(params.benchmarkId, params.taskId);
    if (!task) {
      return response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    await delay(80);
    return response(200).json(taskEntrantRunsOf(params.benchmarkId, task.id, locale), writtenIn(locale));
  }),

  http.get('/console/benchmarks/{benchmarkId}/tasks/{taskId}/check-results', async ({ cookies, params, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const task = namedTaskOf(params.benchmarkId, params.taskId);
    if (!task) {
      return response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    await delay(80);
    return response(200).json(checkResultsOf(params.benchmarkId, task.id, locale), writtenIn(locale));
  }),

  http.get('/console/benchmarks/{benchmarkId}/tasks/{taskId}/revisions', ({ cookies, params, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const task = namedTaskOf(params.benchmarkId, params.taskId);
    return task ? response(200).json(revisionsOf(params.benchmarkId, task)) : response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
  }),

  http.get('/console/benchmarks/{benchmarkId}/tasks/{taskId}/files', async ({ cookies, params, query, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const directory = query.get('dir') ?? '';
    const entries = namedTaskOf(params.benchmarkId, params.taskId) && consoleEntriesOf(params.benchmarkId, params.taskId, directory);
    if (!entries) {
      return response(404).json({ message: `no directory "${directory}" in ${params.taskId} of ${params.benchmarkId}` });
    }
    await delay(60);
    return response(200).json(pageOf(entries, query, DEFAULT_ENTRY_PAGE_SIZE));
  }),

  http.get('/console/benchmarks/{benchmarkId}/tasks/{taskId}/file', async ({ cookies, params, query, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const path = query.get('path');
    const file = namedTaskOf(params.benchmarkId, params.taskId) && taskFilesOf(params.benchmarkId, params.taskId)?.find(candidate => candidate.path === path);
    if (!file) {
      return response(404).json({ message: `no file "${path}" in ${params.taskId} of ${params.benchmarkId}` });
    }
    await delay(60);
    return response(200).json(taskFileOf(file));
  }),
];
