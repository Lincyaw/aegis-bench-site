import { delay } from 'msw';
import { BENCHMARKS, DEFAULT_LEADERBOARD_PAGE_SIZE, benchmarkDetail, benchmarkSummary, hasBenchmark, leaderboardView, stagesWithBenchmarks } from './benchmarks';
import { publishedEntriesOf, publishedRecentRunsOf, publishedShowingOf, publishedTaskRuns } from './published';
import { RUNS_PER_TASK } from './catalog';
import { consoleHandlers } from './consoleHandlers';
import { hasModel, modelProfile } from './models';
import { http, localeOf, pageOf, writtenIn } from './protocol';
import { passRateOf, taskRunsOf, taskSummariesOf } from './runs';
import { DEFAULT_ENTRY_PAGE_SIZE, directoryEntriesOf, taskFileOf, taskFilesOf, withheldUnder } from './taskFiles';
import { DEFAULT_TASK_PAGE_SIZE, taskOf } from './tasks';
import { DEFAULT_TRAJECTORY_PAGE_SIZE, runDetailOf, trajectoryOf } from './trajectories';

/*
 * The mock server's implementation of each operation the spec declares. The handlers' types follow the spec, and
 * contract.ts checks every request and response against it as they pass, so the site talks to the mock exactly as it
 * will talk to the real server, and anything the site needs but the spec lacks shows up as a gap in the spec.
 */

/** The public site's operations, which answer without a session. */
export const publicHandlers = [
  http.get('/stages', ({ request, response }) => {
    const locale = localeOf(request);
    return response(200).json(stagesWithBenchmarks(locale), writtenIn(locale));
  }),

  http.get('/benchmarks', ({ request, response }) => {
    const locale = localeOf(request);
    return response(200).json(BENCHMARKS.map(record => benchmarkSummary(record.id, publishedShowingOf(record.id, locale), locale)), writtenIn(locale));
  }),

  http.get('/benchmarks/{benchmarkId}', async ({ params, request, response }) => {
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    await delay(120);
    return response(200).json(benchmarkDetail(params.benchmarkId, publishedShowingOf(params.benchmarkId, locale), publishedRecentRunsOf(params.benchmarkId, locale), locale), writtenIn(locale));
  }),

  http.get('/benchmarks/{benchmarkId}/leaderboard', ({ params, query, request, response }) => {
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    const entries = leaderboardView(publishedEntriesOf(params.benchmarkId, locale), query.get('view') ?? 'combination');
    return response(200).json(pageOf(entries, query, DEFAULT_LEADERBOARD_PAGE_SIZE), writtenIn(locale));
  }),

  http.get('/benchmarks/{benchmarkId}/combinations', ({ params, request, response }) => {
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    return response(200).json(publishedEntriesOf(params.benchmarkId, locale).map(entry => ({ model: entry.model, harness: entry.harness })), writtenIn(locale));
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

  http.get('/benchmarks/{benchmarkId}/tasks/{taskId}', ({ params, response }) => {
    const task = hasBenchmark(params.benchmarkId) ? taskSummariesOf(params.benchmarkId).find(summary => summary.id === params.taskId) : undefined;
    return task ? response(200).json(task) : response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
  }),

  http.get('/benchmarks/{benchmarkId}/tasks/{taskId}/files', async ({ params, query, response }) => {
    const files = hasBenchmark(params.benchmarkId) ? taskFilesOf(params.benchmarkId, params.taskId) : undefined;
    const directory = query.get('dir') ?? '';
    const entries = files && directoryEntriesOf(files, directory);
    if (!files || !entries) {
      return response(404).json({ message: `no directory "${directory}" in ${params.taskId} of ${params.benchmarkId}` });
    }
    const withheld = directory === '' ? undefined : withheldUnder(files, directory);
    if (withheld) {
      return response(403).json({ message: `${directory} is not published`, reason: withheld });
    }
    await delay(60);
    return response(200).json(pageOf(entries, query, DEFAULT_ENTRY_PAGE_SIZE));
  }),

  http.get('/benchmarks/{benchmarkId}/tasks/{taskId}/file', async ({ params, query, response }) => {
    const path = query.get('path');
    const file = (hasBenchmark(params.benchmarkId) ? taskFilesOf(params.benchmarkId, params.taskId) : undefined)?.find(candidate => candidate.path === path);
    if (!file) {
      return response(404).json({ message: `no file "${path}" in ${params.taskId} of ${params.benchmarkId}` });
    }
    if (file.withheld) {
      return response(403).json({ message: `${file.path} is not published`, reason: file.withheld });
    }
    await delay(60);
    return response(200).json(taskFileOf(file));
  }),

  http.get('/benchmarks/{benchmarkId}/tasks/{taskId}/runs', async ({ params, request, response }) => {
    const task = hasBenchmark(params.benchmarkId) ? taskOf(params.benchmarkId, params.taskId) : undefined;
    if (!task) {
      return response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    const combinations = publishedTaskRuns(params.benchmarkId, taskRunsOf(params.benchmarkId, task.id, locale));
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

  http.get('/runs/{runId}/trajectory/steps', async ({ params, query, response }) => {
    const trajectory = trajectoryOf(params.runId);
    if (!trajectory) {
      return response(404).json({ message: `no run ${params.runId}` });
    }
    const { steps, ...header } = trajectory;
    await delay(80);
    return response(200).json({ ...header, ...pageOf(steps, query, DEFAULT_TRAJECTORY_PAGE_SIZE) });
  }),

  http.get('/models/{modelId}', ({ params, request, response }) => {
    if (!hasModel(params.modelId)) {
      return response(404).json({ message: `no model ${params.modelId}` });
    }
    const locale = localeOf(request);
    return response(200).json(modelProfile(params.modelId, locale), writtenIn(locale));
  }),
];

export const handlers = [...publicHandlers, ...consoleHandlers];
