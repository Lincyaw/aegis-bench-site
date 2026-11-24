import { delay } from 'msw';
import Negotiator from 'negotiator';
import { createOpenApiHttp } from 'openapi-msw';
import { localeValues, type paths } from '../api/schema';
import { API_ROOT } from '../api/server';
import type { Locale } from '../api/types';
import { BENCHMARKS, DEFAULT_LEADERBOARD_PAGE_SIZE, benchmarkDetail, benchmarkSummary, hasBenchmark, leaderboardView, stagesWithBenchmarks } from './benchmarks';
import { RUNS_PER_TASK } from './catalog';
import { hasModel, modelProfile } from './models';
import { passRateOf, taskRunsOf, taskSummariesOf } from './runs';
import { DEFAULT_TASK_PAGE_SIZE, taskOf } from './tasks';
import { recentRunsOf, runDetailOf, trajectoryOf } from './trajectories';

/*
 * The mock server's implementation of each operation the spec declares. The handlers' types follow the spec, and
 * contract.ts checks every request and response against it as they pass, so the site talks to the mock exactly as it
 * will talk to the real server, and anything the site needs but the spec lacks shows up as a gap in the spec.
 */

/** Handlers typed by the API's paths: a path, parameter, status or body the spec does not declare fails to compile. */
const http = createOpenApiHttp<paths>({ baseUrl: API_ROOT });

/** The locale the API answers in when the reader's languages match none it serves, as the spec declares. */
export const DEFAULT_LOCALE: Locale = 'zh-CN';

/** The locale to answer in: the best match for the request's Accept-Language among the locales the API serves. */
export function localeOf(request: Request): Locale {
  const negotiated = new Negotiator({ headers: { 'accept-language': request.headers.get('Accept-Language') ?? undefined } }).language([...localeValues]);
  return localeValues.find(locale => locale === negotiated) ?? DEFAULT_LOCALE;
}

/** The headers of a response written in a locale. */
export function writtenIn(locale: Locale) {
  return { headers: { 'Content-Language': locale } };
}

/** The page of a list a request asks for with the spec's PageQuery parameters, and the length of the whole list. */
export function pageOf<Item>(list: readonly Item[], query: { get(name: 'offset' | 'limit'): string | null }, defaultSize: number) {
  const offset = Number(query.get('offset') ?? 0);
  const limit = Number(query.get('limit') ?? defaultSize);
  return { items: list.slice(offset, offset + limit), total: list.length };
}

export const handlers = [
  http.get('/stages', ({ request, response }) => {
    const locale = localeOf(request);
    return response(200).json(stagesWithBenchmarks(locale), writtenIn(locale));
  }),

  http.get('/benchmarks', ({ request, response }) => {
    const locale = localeOf(request);
    return response(200).json(BENCHMARKS.map(record => benchmarkSummary(record.id, locale)), writtenIn(locale));
  }),

  http.get('/benchmarks/{benchmarkId}', async ({ params, request, response }) => {
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    await delay(120);
    return response(200).json(benchmarkDetail(params.benchmarkId, locale, recentRunsOf(params.benchmarkId, locale)), writtenIn(locale));
  }),

  http.get('/benchmarks/{benchmarkId}/leaderboard', ({ params, query, request, response }) => {
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    const entries = leaderboardView(params.benchmarkId, query.get('view') ?? 'combination', locale);
    return response(200).json(pageOf(entries, query, DEFAULT_LEADERBOARD_PAGE_SIZE), writtenIn(locale));
  }),

  http.get('/benchmarks/{benchmarkId}/combinations', ({ params, request, response }) => {
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    return response(200).json(leaderboardView(params.benchmarkId, 'combination', locale).map(entry => ({ model: entry.model, harness: entry.harness })), writtenIn(locale));
  }),

  http.get('/benchmarks/{benchmarkId}/tasks', async ({ params, query, response }) => {
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const q = (query.get('q') ?? '').trim();
    const matching = taskSummariesOf(params.benchmarkId).filter(task => !q || task.id.includes(q) || task.title.includes(q));
    await delay(80);
    return response(200).json(pageOf(matching, query, DEFAULT_TASK_PAGE_SIZE));
  }),

  http.get('/benchmarks/{benchmarkId}/tasks/{taskId}/runs', async ({ params, request, response }) => {
    const task = hasBenchmark(params.benchmarkId) ? taskOf(params.benchmarkId, params.taskId) : undefined;
    if (!task) {
      return response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    const combinations = taskRunsOf(params.benchmarkId, task.id, locale);
    await delay(80);
    return response(200).json({ task: { id: task.id, title: task.title, passRate: passRateOf(combinations) }, runsPerTask: RUNS_PER_TASK, combinations }, writtenIn(locale));
  }),

  http.get('/runs/{runId}', async ({ params, request, response }) => {
    const locale = localeOf(request);
    const detail = runDetailOf(params.runId, locale);
    await delay(100);
    return detail ? response(200).json(detail, writtenIn(locale)) : response(404).json({ message: `no run ${params.runId}` });
  }),

  http.get('/runs/{runId}/trajectory', async ({ params, response }) => {
    const trajectory = trajectoryOf(params.runId);
    await delay(140);
    return trajectory ? response(200).json(trajectory) : response(404).json({ message: `no run ${params.runId}` });
  }),

  http.get('/models/{modelId}', ({ params, request, response }) => {
    if (!hasModel(params.modelId)) {
      return response(404).json({ message: `no model ${params.modelId}` });
    }
    const locale = localeOf(request);
    return response(200).json(modelProfile(params.modelId, locale), writtenIn(locale));
  }),
];
