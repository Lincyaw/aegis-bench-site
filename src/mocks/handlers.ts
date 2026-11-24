import { delay } from 'msw';
import { createOpenApiHttp } from 'openapi-msw';
import type { Locale } from '../api/client';
import { localeValues, type paths } from '../api/schema';
import { BENCHMARKS, benchmarkDetail, benchmarkSummary, hasBenchmark, leaderboardView, stagesWithBenchmarks } from './benchmarks';
import { RUNS_PER_TASK } from './catalog';
import { hasModel, modelProfile } from './models';
import { passRateOf, taskRunsOf, taskSummariesOf } from './runs';
import { DEFAULT_TASK_PAGE_SIZE, taskOf } from './tasks';
import { recentRunsOf, runDetailOf, trajectoryOf } from './trajectories';

/*
 * The mock server: it implements the API the spec declares and nothing else, so the site talks to it exactly as it
 * will talk to the real server, and anything the site needs but the spec lacks shows up as a gap in the spec.
 */

/** Handlers typed by the API's paths: a path, parameter, status or body the spec does not declare fails to compile. */
const http = createOpenApiHttp<paths>({ baseUrl: '/api' });

/** The reader's language from the Accept-Language header the API declares: one of its locales, zh-CN when absent. */
export function localeOf(request: Request): Locale {
  const header = request.headers.get('Accept-Language') ?? 'zh-CN';
  const locale = localeValues.find(candidate => candidate === header);
  if (!locale) {
    throw new Error(`Accept-Language ${header} is not a locale the API serves`);
  }
  return locale;
}

export const handlers = [
  http.get('/stages', ({ request, response }) => response(200).json(stagesWithBenchmarks(localeOf(request)))),

  http.get('/benchmarks', ({ request, response }) => response(200).json(BENCHMARKS.map(record => benchmarkSummary(record.id, localeOf(request))))),

  http.get('/benchmarks/{benchmarkId}', async ({ params, request, response }) => {
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    await delay(120);
    return response(200).json(benchmarkDetail(params.benchmarkId, locale, recentRunsOf(params.benchmarkId, locale)));
  }),

  http.get('/benchmarks/{benchmarkId}/leaderboard', ({ params, query, request, response }) => {
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    return response(200).json(leaderboardView(params.benchmarkId, query.get('view') ?? 'combination', localeOf(request)));
  }),

  http.get('/benchmarks/{benchmarkId}/tasks', async ({ params, query, response }) => {
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const q = (query.get('q') ?? '').trim();
    const offset = Number(query.get('offset') ?? 0);
    const limit = Number(query.get('limit') ?? DEFAULT_TASK_PAGE_SIZE);
    const matching = taskSummariesOf(params.benchmarkId).filter(task => !q || task.id.includes(q) || task.title.includes(q));
    await delay(80);
    return response(200).json({ items: matching.slice(offset, offset + limit), total: matching.length });
  }),

  http.get('/benchmarks/{benchmarkId}/tasks/{taskId}/runs', async ({ params, request, response }) => {
    const task = hasBenchmark(params.benchmarkId) ? taskOf(params.benchmarkId, params.taskId) : undefined;
    if (!task) {
      return response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
    }
    const combinations = taskRunsOf(params.benchmarkId, task.id, localeOf(request));
    await delay(80);
    return response(200).json({ task: { id: task.id, title: task.title, passRate: passRateOf(combinations) }, runsPerTask: RUNS_PER_TASK, combinations });
  }),

  http.get('/runs/{runId}', async ({ params, request, response }) => {
    const detail = runDetailOf(params.runId, localeOf(request));
    await delay(100);
    return detail ? response(200).json(detail) : response(404).json({ message: `no run ${params.runId}` });
  }),

  http.get('/runs/{runId}/trajectory', async ({ params, response }) => {
    const trajectory = trajectoryOf(params.runId);
    await delay(140);
    return trajectory ? response(200).json(trajectory) : response(404).json({ message: `no run ${params.runId}` });
  }),

  http.get('/models/{modelId}', ({ params, request, response }) => (
    hasModel(params.modelId) ? response(200).json(modelProfile(params.modelId, localeOf(request))) : response(404).json({ message: `no model ${params.modelId}` })
  )),
];
