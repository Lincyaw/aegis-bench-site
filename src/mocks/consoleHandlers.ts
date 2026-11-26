import { delay } from 'msw';
import { benchmarkOf, hasBenchmark } from './benchmarks';
import { taskComparisonOf } from './comparison';
import { DEFAULT_MATRIX_PAGE_SIZE, collectionModelsOf, collectionsOf, hasCollection, matrixOf } from './consoleCollections';
import { DEFAULT_MODEL_TASK_PAGE_SIZE, harnessIdsOf, modelDetailOf, modelResultsOver, modelTasksOf, ranOn } from './consoleModels';
import { DEFAULT_EVENT_PAGE_SIZE, DEFAULT_RUN_PAGE_SIZE, consoleRunOf, filteredRunsOf, matchesEventSearch, runEventRowOf, runEventsOf, runRowOf } from './consoleRuns';
import {
  DEFAULT_CONSOLE_TASK_PAGE_SIZE, checkResultsOf, consoleEntriesOf, consoleTaskOf, filteredTasksOf, namedTaskOf, referenceFilesOf, revisionsOf,
  tagCountsOf, taskEntrantRunsOf, taskGradingOf, taskRowOf,
} from './consoleTasks';
import { DEFAULT_HUNT_TRIAL_PAGE_SIZE, filteredTrialsOf, huntById, huntOf, huntTrialOf, runHuntFindingsOf } from './hunts';
import { combinationScopeOf, http, localeOf, pageOf, writtenIn } from './protocol';
import { openedIndexes } from './records';
import { contentProblemOf, createDraft, discardDraft, draftOf, makeCurrent, releaseById, releaseDetailOf, releaseSummaryOf, releasesOf, restoreRelease, updateDraft } from './releases';
import { mayEdit, refusalFor } from './members';
import { replayOf } from './replays';
import { releaseOverview } from './workspace';
import { consoleBenchmarkOf, overviewOf, rankingIn, unknownScopeMessage } from './results';
import { DEFAULT_ENTRY_PAGE_SIZE, taskFileOf } from './taskFiles';
import { DEFAULT_TRAJECTORY_PAGE_SIZE, trajectoryOf } from './trajectories';
import { SIGN_IN_REQUIRED, sessionUserOf } from './session';

/** The console's operations on the benchmarks and their releases: only a signed-in session, and editors to change a release. */
export const consoleHandlers = [
  http.get('/console/benchmarks',({ cookies, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const locale = localeOf(request);
    return response(200).json(openedIndexes().catalog.benchmarks.map(benchmarkId => consoleBenchmarkOf(benchmarkId, locale)), writtenIn(locale));
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

  http.get('/console/benchmarks/{benchmarkId}/tasks/{taskId}', async ({ cookies, params, query, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const task = namedTaskOf(params.benchmarkId, params.taskId);
    if (!task) {
      return response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
    }
    const scope = combinationScopeOf(query);
    if (rankingIn(params.benchmarkId, scope).length === 0) {
      return response(404).json({ message: unknownScopeMessage(params.benchmarkId, scope) });
    }
    const locale = localeOf(request);
    await delay(80);
    return response(200).json(consoleTaskOf(params.benchmarkId, task, scope, locale), writtenIn(locale));
  }),

  http.get('/console/benchmarks/{benchmarkId}/tasks/{taskId}/grading', async ({ cookies, params, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const task = namedTaskOf(params.benchmarkId, params.taskId);
    return task ? response(200).json(await taskGradingOf(params.benchmarkId, task)) : response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
  }),

  http.get('/console/benchmarks/{benchmarkId}/tasks/{taskId}/reference', async ({ cookies, params, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const task = namedTaskOf(params.benchmarkId, params.taskId);
    return task ? response(200).json(await referenceFilesOf(params.benchmarkId, task)) : response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
  }),

  http.get('/console/benchmarks/{benchmarkId}/tasks/{taskId}/results', async ({ cookies, params, query, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const task = namedTaskOf(params.benchmarkId, params.taskId);
    if (!task) {
      return response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
    }
    const scope = combinationScopeOf(query);
    if (rankingIn(params.benchmarkId, scope).length === 0) {
      return response(404).json({ message: unknownScopeMessage(params.benchmarkId, scope) });
    }
    const locale = localeOf(request);
    await delay(80);
    return response(200).json(taskEntrantRunsOf(params.benchmarkId, task, scope, locale), writtenIn(locale));
  }),

  http.get('/console/benchmarks/{benchmarkId}/tasks/{taskId}/comparison', async ({ cookies, params, query, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const task = namedTaskOf(params.benchmarkId, params.taskId);
    if (!task) {
      return response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    const comparison = await taskComparisonOf(params.benchmarkId, task, query.getAll('runs'), locale);
    return comparison ? response(200).json(comparison, writtenIn(locale)) : response(404).json({ message: `not every run compared is a run of ${task.id}` });
  }),

  http.get('/console/benchmarks/{benchmarkId}/tasks/{taskId}/check-results', async ({ cookies, params, query, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const task = namedTaskOf(params.benchmarkId, params.taskId);
    if (!task) {
      return response(404).json({ message: `no task ${params.taskId} in ${params.benchmarkId}` });
    }
    const scope = combinationScopeOf(query);
    if (rankingIn(params.benchmarkId, scope).length === 0) {
      return response(404).json({ message: unknownScopeMessage(params.benchmarkId, scope) });
    }
    const locale = localeOf(request);
    await delay(80);
    return response(200).json(checkResultsOf(params.benchmarkId, task, scope, locale), writtenIn(locale));
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
    const task = namedTaskOf(params.benchmarkId, params.taskId);
    const entries = task && consoleEntriesOf(task, directory);
    if (!entries) {
      return response(404).json({ message: `no directory "${directory}" in ${params.taskId} of ${params.benchmarkId}` });
    }
    await delay(60);
    return response(200).json(pageOf(entries, query, DEFAULT_ENTRY_PAGE_SIZE));
  }),

  http.get('/console/benchmarks/{benchmarkId}/models', async ({ cookies, params, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    await delay(80);
    return response(200).json(modelResultsOver(params.benchmarkId, benchmarkOf(params.benchmarkId).runs, locale), writtenIn(locale));
  }),

  http.get('/console/benchmarks/{benchmarkId}/models/{modelId}', async ({ cookies, params, query, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!hasBenchmark(params.benchmarkId) || !ranOn(params.benchmarkId, params.modelId)) {
      return response(404).json({ message: `no model ${params.modelId} on ${params.benchmarkId}` });
    }
    const tag = query.get('tag') ?? '';
    if (tag && !hasCollection(params.benchmarkId, tag)) {
      return response(404).json({ message: `no collection ${tag} in ${params.benchmarkId}` });
    }
    const task = query.get('task') ?? '';
    if (task && !namedTaskOf(params.benchmarkId, task)) {
      return response(404).json({ message: `no task ${task} in ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    await delay(80);
    return response(200).json(modelDetailOf(params.benchmarkId, params.modelId, { tag, task }, locale), writtenIn(locale));
  }),

  http.get('/console/benchmarks/{benchmarkId}/models/{modelId}/tasks', async ({ cookies, params, query, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const harness = query.get('harness') ?? '';
    if (!hasBenchmark(params.benchmarkId) || !ranOn(params.benchmarkId, params.modelId) || (harness && !harnessIdsOf(params.benchmarkId, params.modelId).includes(harness))) {
      return response(404).json({ message: `no model ${params.modelId}${harness ? ` in harness ${harness}` : ''} on ${params.benchmarkId}` });
    }
    const tag = query.get('tag') ?? '';
    if (tag && !hasCollection(params.benchmarkId, tag)) {
      return response(404).json({ message: `no collection ${tag} in ${params.benchmarkId}` });
    }
    const task = query.get('task') ?? '';
    if (task && !namedTaskOf(params.benchmarkId, task)) {
      return response(404).json({ message: `no task ${task} in ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    const filter = { harness, tag, task, q: (query.get('q') ?? '').trim(), spread: query.get('spread') ?? undefined, order: query.get('order') ?? 'hardest' };
    const { rows, totals } = modelTasksOf(params.benchmarkId, params.modelId, filter, locale);
    await delay(100);
    return response(200).json({ ...pageOf(rows, query, DEFAULT_MODEL_TASK_PAGE_SIZE), totals }, writtenIn(locale));
  }),

  http.get('/console/benchmarks/{benchmarkId}/collections', async ({ cookies, params, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    await delay(80);
    return response(200).json(collectionsOf(params.benchmarkId));
  }),

  http.get('/console/benchmarks/{benchmarkId}/collections/{tag}/models', async ({ cookies, params, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!hasCollection(params.benchmarkId, params.tag)) {
      return response(404).json({ message: `no collection ${params.tag} in ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    await delay(80);
    return response(200).json(collectionModelsOf(params.benchmarkId, params.tag, locale), writtenIn(locale));
  }),

  http.get('/console/benchmarks/{benchmarkId}/collections/{tag}/matrix', async ({ cookies, params, query, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!hasCollection(params.benchmarkId, params.tag)) {
      return response(404).json({ message: `no collection ${params.tag} in ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    const { models, rows } = matrixOf(params.benchmarkId, params.tag, query.get('order') ?? 'hardest', locale);
    await delay(100);
    return response(200).json({ ...pageOf(rows, query, DEFAULT_MATRIX_PAGE_SIZE), models }, writtenIn(locale));
  }),

  http.get('/console/benchmarks/{benchmarkId}/hunts', async ({ cookies, params, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    await delay(100);
    return response(200).json(benchmarkOf(params.benchmarkId).hunts.map(hunt => huntOf(params.benchmarkId, hunt)).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)));
  }),

  http.get('/console/benchmarks/{benchmarkId}/hunts/{huntId}/trials', async ({ cookies, params, query, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const hunt = hasBenchmark(params.benchmarkId) ? huntById(params.benchmarkId, params.huntId) : undefined;
    const facet = query.get('facet') ?? '';
    if (!hunt || (facet && !hunt.facets.some(candidate => candidate.id === facet))) {
      return response(404).json({ message: `no hunt ${params.huntId}${facet ? ` with facet ${facet}` : ''} on ${params.benchmarkId}` });
    }
    const locale = localeOf(request);
    const page = pageOf(filteredTrialsOf(hunt, facet, query.get('verdict') ?? undefined), query, DEFAULT_HUNT_TRIAL_PAGE_SIZE);
    await delay(100);
    return response(200).json({ ...page, items: page.items.map(trial => huntTrialOf(params.benchmarkId, trial, locale)) }, writtenIn(locale));
  }),

  http.get('/console/runs/{runId}/hunts', async ({ cookies, params, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const findings = await runHuntFindingsOf(params.runId);
    await delay(80);
    return findings ? response(200).json(findings) : response(404).json({ message: `no run ${params.runId}` });
  }),

  http.get('/console/releases',async ({ cookies, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    await delay(80);
    return response(200).json(releaseOverview());
  }),

  http.get('/console/releases/{releaseId}', ({ cookies, params, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const release = releaseById(params.releaseId);
    return release ? response(200).json(releaseDetailOf(release)) : response(404).json({ message: `no release ${params.releaseId}` });
  }),

  http.put('/console/releases/{releaseId}', async ({ cookies, params, request, response }) => {
    const user = sessionUserOf(cookies);
    if (!user) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!mayEdit(user.role)) {
      return response(403).json(refusalFor(user, 'editor'));
    }
    const release = releaseById(params.releaseId);
    if (!release) {
      return response(404).json({ message: `no release ${params.releaseId}` });
    }
    if (release.status !== 'draft') {
      return response(409).json({ message: `release ${release.id} is ${release.status}; only a draft changes` });
    }
    const content = await request.json();
    const problem = contentProblemOf(release.benchmarkId, content);
    if (problem) {
      return response(422).json({ message: problem });
    }
    await delay(160);
    return response(200).json(releaseDetailOf(updateDraft(release, content, user.account)));
  }),

  http.delete('/console/releases/{releaseId}', async ({ cookies, params, response }) => {
    const user = sessionUserOf(cookies);
    if (!user) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!mayEdit(user.role)) {
      return response(403).json(refusalFor(user, 'editor'));
    }
    const release = releaseById(params.releaseId);
    if (!release) {
      return response(404).json({ message: `no release ${params.releaseId}` });
    }
    if (release.status !== 'draft') {
      return response(409).json({ message: `release ${release.id} is ${release.status}; only a draft is discarded` });
    }
    discardDraft(release);
    await delay(120);
    return response(200).json(releasesOf(release.benchmarkId).map(releaseSummaryOf));
  }),

  http.post('/console/releases/{releaseId}/publish', async ({ cookies, params, request, response }) => {
    const user = sessionUserOf(cookies);
    if (!user) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!mayEdit(user.role)) {
      return response(403).json(refusalFor(user, 'editor'));
    }
    const release = releaseById(params.releaseId);
    if (!release) {
      return response(404).json({ message: `no release ${params.releaseId}` });
    }
    if (release.status !== 'draft') {
      return response(409).json({ message: `release ${release.id} is ${release.status}; only a draft is published` });
    }
    const { note } = await request.json();
    await delay(240);
    return response(200).json(releaseDetailOf(makeCurrent(release, note, user.account)));
  }),

  http.post('/console/releases/{releaseId}/restore', async ({ cookies, params, request, response }) => {
    const user = sessionUserOf(cookies);
    if (!user) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!mayEdit(user.role)) {
      return response(403).json(refusalFor(user, 'editor'));
    }
    const release = releaseById(params.releaseId);
    if (!release) {
      return response(404).json({ message: `no release ${params.releaseId}` });
    }
    if (release.status !== 'superseded') {
      return response(409).json({ message: `release ${release.id} is ${release.status}; only a superseded release is restored` });
    }
    const { note } = await request.json();
    await delay(240);
    return response(200).json(releaseDetailOf(restoreRelease(release, note, user.account)));
  }),

  http.get('/console/benchmarks/{benchmarkId}/releases', ({ cookies, params, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    return hasBenchmark(params.benchmarkId)
      ? response(200).json(releasesOf(params.benchmarkId).map(releaseSummaryOf))
      : response(404).json({ message: `no benchmark ${params.benchmarkId}` });
  }),

  http.post('/console/benchmarks/{benchmarkId}/releases', async ({ cookies, params, response }) => {
    const user = sessionUserOf(cookies);
    if (!user) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!mayEdit(user.role)) {
      return response(403).json(refusalFor(user, 'editor'));
    }
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const existing = draftOf(params.benchmarkId);
    if (existing) {
      return response(409).json({ message: `${params.benchmarkId} already has draft ${existing.id}` });
    }
    await delay(160);
    return response(200).json(releaseDetailOf(createDraft(params.benchmarkId, user.account)));
  }),

  http.get('/console/benchmarks/{benchmarkId}/runs', async ({ cookies, params, query, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!hasBenchmark(params.benchmarkId)) {
      return response(404).json({ message: `no benchmark ${params.benchmarkId}` });
    }
    const task = query.get('task') ?? '';
    if (task && !namedTaskOf(params.benchmarkId, task)) {
      return response(404).json({ message: `no task ${task} in ${params.benchmarkId}` });
    }
    const scope = combinationScopeOf(query);
    if (rankingIn(params.benchmarkId, scope).length === 0) {
      return response(404).json({ message: unknownScopeMessage(params.benchmarkId, scope) });
    }
    const locale = localeOf(request);
    const filter = { q: (query.get('q') ?? '').trim(), task, ...scope, outcome: query.get('outcome') ?? undefined, review: query.get('review') ?? undefined };
    const page = pageOf(filteredRunsOf(params.benchmarkId, filter), query, DEFAULT_RUN_PAGE_SIZE);
    await delay(100);
    return response(200).json({ ...page, items: page.items.map(fact => runRowOf(params.benchmarkId, fact, locale)) }, writtenIn(locale));
  }),

  http.get('/console/runs/{runId}', async ({ cookies, params, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const locale = localeOf(request);
    const run = await consoleRunOf(params.runId, locale);
    await delay(100);
    return run ? response(200).json(run, writtenIn(locale)) : response(404).json({ message: `no run ${params.runId}` });
  }),

  http.get('/console/runs/{runId}/trajectory', async ({ cookies, params, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const trajectory = await trajectoryOf(params.runId);
    await delay(120);
    return trajectory ? response(200).json(trajectory) : response(404).json({ message: `no run ${params.runId}` });
  }),

  http.get('/console/runs/{runId}/replay', async ({ cookies, params, request, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const locale = localeOf(request);
    const replay = await replayOf(params.runId, locale);
    await delay(120);
    return replay ? response(200).json(replay, writtenIn(locale)) : response(404).json({ message: `no replay of run ${params.runId}` });
  }),

  http.get('/console/runs/{runId}/trajectory/steps', async ({ cookies, params, query, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const trajectory = await trajectoryOf(params.runId);
    if (!trajectory) {
      return response(404).json({ message: `no run ${params.runId}` });
    }
    const { steps, ...header } = trajectory;
    await delay(80);
    return response(200).json({ ...header, ...pageOf(steps, query, DEFAULT_TRAJECTORY_PAGE_SIZE) });
  }),

  http.get('/console/runs/{runId}/events', async ({ cookies, params, query, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const trajectory = await trajectoryOf(params.runId);
    if (!trajectory) {
      return response(404).json({ message: `no run ${params.runId}` });
    }
    const kind = query.get('kind');
    const q = (query.get('q') ?? '').trim();
    const page = pageOf(runEventsOf(trajectory).filter(event => (!kind || event.kind === kind) && matchesEventSearch(event, q)), query, DEFAULT_EVENT_PAGE_SIZE);
    await delay(60);
    return response(200).json({ ...page, items: page.items.map(runEventRowOf) });
  }),

  http.get('/console/runs/{runId}/events/{index}', async ({ cookies, params, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const trajectory = await trajectoryOf(params.runId);
    if (!trajectory) {
      return response(404).json({ message: `no run ${params.runId}` });
    }
    const event = runEventsOf(trajectory).find(candidate => candidate.index === Number(params.index));
    await delay(40);
    return event ? response(200).json(event) : response(404).json({ message: `run ${params.runId} has no event ${params.index}` });
  }),

  http.get('/console/benchmarks/{benchmarkId}/tasks/{taskId}/file', async ({ cookies, params, query, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const path = query.get('path');
    const file = namedTaskOf(params.benchmarkId, params.taskId)?.files.find(candidate => candidate.path === path);
    if (!file) {
      return response(404).json({ message: `no file "${path}" in ${params.taskId} of ${params.benchmarkId}` });
    }
    const whole = await taskFileOf(params.benchmarkId, params.taskId, file);
    await delay(60);
    return response(200).json(whole);
  }),
];
