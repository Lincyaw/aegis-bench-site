import { delay, http, HttpResponse } from 'msw';
import type {
  BenchmarkDetail, BenchmarkSummary, LeaderboardEntry, LeaderboardView, ModelProfile, RunDetail, Stage, TaskPage, TaskRuns, Trajectory,
} from '../api/client';
import { leaderboardViewValues } from '../api/schema';
import { BENCHMARKS, benchmarkDetail, benchmarkSummary, hasBenchmark, leaderboardView, stagesWithBenchmarks } from './benchmarks';
import { RUNS_PER_TASK } from './catalog';
import { hasModel, modelProfile } from './models';
import { passRateOf, runDetailOf, taskRunsOf, taskSummariesOf } from './runs';
import { DEFAULT_TASK_PAGE_SIZE, taskOf } from './tasks';
import { recentRunsOf, trajectoryOf } from './trajectories';

const API = '/api';

export function notFound(message: string) {
  return HttpResponse.json({ message }, { status: 404 });
}

export const handlers = [
  http.get(`${API}/stages`, () => HttpResponse.json<Stage[]>(stagesWithBenchmarks())),

  http.get(`${API}/benchmarks`, () => HttpResponse.json<BenchmarkSummary[]>(BENCHMARKS.map(record => benchmarkSummary(record.copy.id)))),

  http.get(`${API}/benchmarks/:benchmarkId`, async ({ params }) => {
    const id = String(params.benchmarkId);
    if (!hasBenchmark(id)) {
      return notFound(`no benchmark ${id}`);
    }
    await delay(120);
    return HttpResponse.json<BenchmarkDetail>(benchmarkDetail(id, recentRunsOf(id)));
  }),

  http.get(`${API}/benchmarks/:benchmarkId/leaderboard`, ({ params, request }) => {
    const id = String(params.benchmarkId);
    const view = new URL(request.url).searchParams.get('view') ?? 'combination';
    if (!hasBenchmark(id) || !leaderboardViewValues.includes(view as LeaderboardView)) {
      return notFound(`no leaderboard ${id} ${view}`);
    }
    return HttpResponse.json<LeaderboardEntry[]>(leaderboardView(id, view as LeaderboardView));
  }),

  http.get(`${API}/benchmarks/:benchmarkId/tasks`, async ({ params, request }) => {
    const id = String(params.benchmarkId);
    if (!hasBenchmark(id)) {
      return notFound(`no benchmark ${id}`);
    }
    const search = new URL(request.url).searchParams;
    const q = (search.get('q') ?? '').trim();
    const offset = Number(search.get('offset') ?? 0);
    const limit = Number(search.get('limit') ?? DEFAULT_TASK_PAGE_SIZE);
    const matching = taskSummariesOf(id).filter(task => !q || task.id.includes(q) || task.title.includes(q));
    await delay(80);
    return HttpResponse.json<TaskPage>({ items: matching.slice(offset, offset + limit), total: matching.length });
  }),

  http.get(`${API}/benchmarks/:benchmarkId/tasks/:taskId/runs`, async ({ params }) => {
    const id = String(params.benchmarkId);
    const task = hasBenchmark(id) ? taskOf(id, String(params.taskId)) : undefined;
    if (!task) {
      return notFound(`no task ${params.taskId} in ${id}`);
    }
    const combinations = taskRunsOf(id, task.id);
    await delay(80);
    return HttpResponse.json<TaskRuns>({ task: { id: task.id, title: task.title, passRate: passRateOf(combinations) }, runsPerTask: RUNS_PER_TASK, combinations });
  }),

  http.get(`${API}/runs/:runId`, async ({ params }) => {
    const detail = runDetailOf(String(params.runId));
    await delay(100);
    return detail ? HttpResponse.json<RunDetail>(detail) : notFound(`no run ${params.runId}`);
  }),

  http.get(`${API}/runs/:runId/trajectory`, async ({ params }) => {
    const trajectory = trajectoryOf(String(params.runId));
    await delay(140);
    return trajectory ? HttpResponse.json<Trajectory>(trajectory) : notFound(`no run ${params.runId}`);
  }),

  http.get(`${API}/models/:modelId`, ({ params }) => {
    const id = String(params.modelId);
    return hasModel(id) ? HttpResponse.json<ModelProfile>(modelProfile(id)) : notFound(`no model ${id}`);
  }),
];
