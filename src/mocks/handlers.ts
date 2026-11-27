import { delay } from 'msw';
import { combinationKey, queryDefaultOf } from '../api/constraints';
import type { LeaderboardView } from '../api/types';
import {
  benchmarkDetail, benchmarkOf, benchmarkSummary, hasBenchmark, leaderboardView, matchesTaskSearch, stagesWithBenchmarks, taskOf,
} from './benchmarks';
import { consoleHandlers } from './consoleHandlers';
import { modelProfile } from './models';
import { answeringUnreachableRecords, http, localeOf, pageOf, writtenIn } from './protocol';
import {
  publishedEntrantOf, publishedEntriesOf, publishedRecentRunsOf, publishedRunRefsOf, publishedShowingOf, publishedTaskComparisonOf, publishedTaskRuns, publishedTaskSummariesOf, publishesRun,
} from './published';
import { openedIndexes } from './records';
import { reportHandlers } from './reportHandlers';
import { runDetailOf } from './runs';
import { currentSettings } from './settings';
import { directoryEntriesOf, taskFileOf, withheldUnder } from './taskFiles';
import { combinationTasksOf, keepingOutcome, taskRunsOf, taskSummaryOf } from './tasks';
import { trajectoryOf } from './trajectories';
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
    const entries = leaderboardView(publishedEntriesOf(params.benchmarkId, locale), query.get('view') ?? queryDefaultOf<LeaderboardView>('/benchmarks/{benchmarkId}/leaderboard', 'view'));
    return response(200).json(pageOf(entries, query, '/benchmarks/{benchmarkId}/leaderboard'), writtenIn(locale));
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
    const matching = keepingOutcome(combinationTasksOf(params.benchmarkId, entrant.modelId, entrant.harnessId).filter(({ task }) => matchesTaskSearch(task, q)), query.get('outcome'));
    await delay(80);
    return response(200).json(pageOf(matching, query, '/benchmarks/{benchmarkId}/combinations/{combination}/tasks'));
  }),

  http.get('/benchmarks/{benchmarkId}/tasks', async ({ params, query, response }) => {
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const q = (query.get('q') ?? '').trim();
    const outcome = query.get('outcome');
    const matching = publishedTaskSummariesOf(params.benchmarkId).filter(task => matchesTaskSearch(task, q)
      && (outcome === null || publishedRunRefsOf(params.benchmarkId, task.id).some(run => run.outcome === outcome)));
    await delay(80);
    return response(200).json(pageOf(matching, query, '/benchmarks/{benchmarkId}/tasks'));
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
    return response(200).json(pageOf(entries, query, '/benchmarks/{benchmarkId}/tasks/{taskId}/files'));
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
      task: taskSummaryOf(params.benchmarkId, task, combinations.flatMap(candidate => candidate.runs)), runsPerTask: benchmarkOf(params.benchmarkId).record.runsPerTask,
      combinations: keepingOutcome(combinations, query.get('outcome')),
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
    const detail = publishesRun(params.runId) ? await runDetailOf(params.runId, locale) : undefined;
    await delay(100);
    return detail ? response(200).json(detail, writtenIn(locale)) : response(404).json({ message: `no published run ${params.runId}` });
  }),

  http.get('/runs/{runId}/trajectory', async ({ params, response }) => {
    const trajectory = publishesRun(params.runId) ? await trajectoryOf(params.runId) : undefined;
    await delay(140);
    return trajectory ? response(200).json(trajectory) : response(404).json({ message: `no published run ${params.runId}` });
  }),

  http.get('/runs/{runId}/trajectory/steps', async ({ params, query, response }) => {
    const trajectory = publishesRun(params.runId) ? await trajectoryOf(params.runId) : undefined;
    if (!trajectory) {
      return response(404).json({ message: `no published run ${params.runId}` });
    }
    const { steps, ...header } = trajectory;
    await delay(80);
    return response(200).json({ ...header, ...pageOf(steps, query, '/runs/{runId}/trajectory/steps') });
  }),

  http.get('/models/{modelId}', ({ params, request, response }) => {
    const locale = localeOf(request);
    const profile = modelProfile(params.modelId, locale);
    return profile ? response(200).json(profile, writtenIn(locale)) : response(404).json({ message: `no published model ${params.modelId}` });
  }),
];

/** Every operation the spec declares, answering 502 with the records' page when records kept on Hugging Face cannot be read. */
export const handlers = [answeringUnreachableRecords([...publicHandlers, ...workspaceHandlers, ...reportHandlers, ...consoleHandlers])];
