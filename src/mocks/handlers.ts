import { delay } from 'msw';
import {
  DEFAULT_LEADERBOARD_PAGE_SIZE, benchmarkDetail, benchmarkOf, benchmarkSummary, hasBenchmark, leaderboardView, matchesTaskSearch, stagesWithBenchmarks, taskOf,
} from './benchmarks';
import { combinationKey } from './catalog';
import { consoleHandlers } from './consoleHandlers';
import { hasModel, modelProfile } from './models';
import { answeringUnreachableRecords, http, localeOf, pageOf, writtenIn } from './protocol';
import {
  publishedEntrantOf, publishedEntriesOf, publishedRecentRunsOf, publishedShowingOf, publishedTaskComparisonOf, publishedTaskRuns, publishedTaskSummariesOf,
} from './published';
import { openedIndexes } from './records';
import { reportHandlers } from './reportHandlers';
import { runDetailOf } from './runs';
import { currentSettings } from './settings';
import { DEFAULT_ENTRY_PAGE_SIZE, directoryEntriesOf, taskFileOf, withheldUnder } from './taskFiles';
import { DEFAULT_TASK_PAGE_SIZE, combinationTasksOf, taskRunsOf, taskSummaryOf } from './tasks';
import { DEFAULT_TRAJECTORY_PAGE_SIZE, trajectoryOf } from './trajectories';
import { workspaceHandlers } from './workspaceHandlers';

/*
 * The mock server's implementation of each operation the spec declares. The handlers' types follow the spec, and
 * contract.ts checks every request and response against it as they pass, so the site talks to the mock exactly as it
 * will talk to the real server, and anything the site needs but the spec lacks shows up as a gap in the spec.
 */

/** The public site's operations, which answer without a session. */
export const publicHandlers = [
  http.get('/site', ({ response }) => response(200).json({ contactEmail: currentSettings().workspace.contactEmail })),

  http.get('/stages',({ request, response }) => {
    const locale = localeOf(request);
    return response(200).json(stagesWithBenchmarks(locale), writtenIn(locale));
  }),

  http.get('/benchmarks', ({ request, response }) => {
    const locale = localeOf(request);
    return response(200).json(openedIndexes().catalog.benchmarks.map(benchmarkId => benchmarkSummary(benchmarkId, publishedShowingOf(benchmarkId, locale), locale)), writtenIn(locale));
  }),

  http.get('/benchmarks/{benchmarkId}', async ({ params, request, response }) => {
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    await delay(120);
    return response(200).json(benchmarkDetail(params.benchmarkId, publishedShowingOf(params.benchmarkId, locale), locale), writtenIn(locale));
  }),

  http.get('/benchmarks/{benchmarkId}/recent-runs', async ({ params, request, response }) => {
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    const recentRuns = await publishedRecentRunsOf(params.benchmarkId, locale);
    await delay(80);
    return response(200).json(recentRuns, writtenIn(locale));
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

  http.get('/benchmarks/{benchmarkId}/combinations/{combination}/tasks', async ({ params, query, response }) => {
    const entrant = hasBenchmark(params.benchmarkId) ? publishedEntrantOf(params.benchmarkId, params.combination) : undefined;
    if (!entrant) {
      return response(404).json({ message: `no published combination ${params.combination} in ${params.benchmarkId}` });
    }
    const q = (query.get('q') ?? '').trim();
    const matching = combinationTasksOf(params.benchmarkId, entrant.modelId, entrant.harnessId).filter(({ task }) => matchesTaskSearch(task, q));
    await delay(80);
    return response(200).json(pageOf(matching, query, DEFAULT_TASK_PAGE_SIZE));
  }),

  http.get('/benchmarks/{benchmarkId}/tasks', async ({ params, query, response }) => {
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const q = (query.get('q') ?? '').trim();
    const matching = publishedTaskSummariesOf(params.benchmarkId).filter(task => matchesTaskSearch(task, q));
    await delay(80);
    return response(200).json(pageOf(matching, query, DEFAULT_TASK_PAGE_SIZE));
  }),

  http.get('/benchmarks/{benchmarkId}/tasks/{taskId}', ({ params, response }) => {
    const task = hasBenchmark(params.benchmarkId) ? publishedTaskSummariesOf(params.benchmarkId).find(summary => summary.id === params.taskId) : undefined;
    return task ? response(200).json(task) : response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
  }),

  http.get('/benchmarks/{benchmarkId}/tasks/{taskId}/files', async ({ params, query, response }) => {
    const files = hasBenchmark(params.benchmarkId) ? taskOf(params.benchmarkId, params.taskId)?.files : undefined;
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
    const file = (hasBenchmark(params.benchmarkId) ? taskOf(params.benchmarkId, params.taskId)?.files : undefined)?.find(candidate => candidate.path === path);
    if (!file) {
      return response(404).json({ message: `no file "${path}" in ${params.taskId} of ${params.benchmarkId}` });
    }
    if (file.withheld) {
      return response(403).json({ message: `${file.path} is not published`, reason: file.withheld });
    }
    const published = await taskFileOf(params.benchmarkId, params.taskId, file);
    await delay(60);
    return response(200).json(published);
  }),

  http.get('/benchmarks/{benchmarkId}/tasks/{taskId}/runs', async ({ params, query, request, response }) => {
    const task = hasBenchmark(params.benchmarkId) ? taskOf(params.benchmarkId, params.taskId) : undefined;
    if (!task) {
      return response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
    }
    const combination = query.get('combination');
    if (combination !== null && !publishedEntrantOf(params.benchmarkId, combination)) {
      return response(404).json({ message: `no published combination ${combination} in ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    const combinations = publishedTaskRuns(params.benchmarkId, taskRunsOf(params.benchmarkId, task.id, locale))
      .filter(candidate => combination === null || combinationKey(candidate.model.id, candidate.harness.id) === combination);
    await delay(80);
    return response(200).json({
      task: taskSummaryOf(params.benchmarkId, task, combinations.flatMap(candidate => candidate.runs)), runsPerTask: benchmarkOf(params.benchmarkId).record.runsPerTask, combinations,
    }, writtenIn(locale));
  }),

  http.get('/benchmarks/{benchmarkId}/tasks/{taskId}/comparison', async ({ params, query, request, response }) => {
    const task = hasBenchmark(params.benchmarkId) ? taskOf(params.benchmarkId, params.taskId) : undefined;
    if (!task) {
      return response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    const comparison = await publishedTaskComparisonOf(params.benchmarkId, task, query.getAll('runs'), locale);
    return comparison ? response(200).json(comparison, writtenIn(locale)) : response(404).json({ message: `not every run compared is a published run of ${task.id}` });
  }),

  http.get('/runs/{runId}', async ({ params, request, response }) => {
    const locale = localeOf(request);
    const detail = await runDetailOf(params.runId, locale);
    await delay(100);
    return detail ? response(200).json(detail, writtenIn(locale)) : response(404).json({ message: `no run ${params.runId}` });
  }),

  http.get('/runs/{runId}/trajectory', async ({ params, response }) => {
    const trajectory = await trajectoryOf(params.runId);
    await delay(140);
    return trajectory ? response(200).json(trajectory) : response(404).json({ message: `no run ${params.runId}` });
  }),

  http.get('/runs/{runId}/trajectory/steps', async ({ params, query, response }) => {
    const trajectory = await trajectoryOf(params.runId);
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

/** Every operation the spec declares, answering 502 with the records' page when records kept on Hugging Face cannot be read. */
export const handlers = [answeringUnreachableRecords([...publicHandlers, ...workspaceHandlers, ...reportHandlers, ...consoleHandlers])];
