import { delay, http, HttpResponse } from 'msw';
import type {
  BenchmarkDetail, BenchmarkSummary, LeaderboardEntry, LeaderboardView, ModelProfile, RunDetail, Stage, TaskPage, TaskRuns, Trajectory,
} from '../api/client';
import { BENCHMARK_IDS, benchmarkDetail, benchmarkSummary, leaderboardView, MODELS, modelProfile, STAGES } from './catalog';
import { passRateOf, recentRunsOf, runDetailOf, taskOf, taskRunsOf, taskSummariesOf, trajectoryOf } from './runs';

const API = '/api';
const LEADERBOARD_VIEWS: LeaderboardView[] = ['combination', 'model', 'harness'];

function notFound(message: string) {
  return HttpResponse.json({ message }, { status: 404 });
}

export const handlers = [
  http.get(`${API}/stages`, () => HttpResponse.json<Stage[]>(STAGES)),

  http.get(`${API}/benchmarks`, () => HttpResponse.json<BenchmarkSummary[]>(BENCHMARK_IDS.map(benchmarkSummary))),

  http.get(`${API}/benchmarks/:benchmarkId`, async ({ params }) => {
    const id = String(params.benchmarkId);
    if (!BENCHMARK_IDS.includes(id)) {
      return notFound(`no benchmark ${id}`);
    }
    await delay(120);
    return HttpResponse.json<BenchmarkDetail>(benchmarkDetail(id, recentRunsOf(id)));
  }),

  http.get(`${API}/benchmarks/:benchmarkId/leaderboard`, ({ params, request }) => {
    const id = String(params.benchmarkId);
    const view = (new URL(request.url).searchParams.get('view') ?? 'combination') as LeaderboardView;
    if (!BENCHMARK_IDS.includes(id) || !LEADERBOARD_VIEWS.includes(view)) {
      return notFound(`no leaderboard ${id} ${view}`);
    }
    return HttpResponse.json<LeaderboardEntry[]>(leaderboardView(id, view));
  }),

  http.get(`${API}/benchmarks/:benchmarkId/tasks`, async ({ params, request }) => {
    const id = String(params.benchmarkId);
    if (!BENCHMARK_IDS.includes(id)) {
      return notFound(`no benchmark ${id}`);
    }
    const search = new URL(request.url).searchParams;
    const q = (search.get('q') ?? '').trim();
    const offset = Number(search.get('offset') ?? 0);
    const limit = Number(search.get('limit') ?? 14);
    const matching = taskSummariesOf(id).filter(task => !q || task.id.includes(q) || task.title.includes(q));
    await delay(80);
    return HttpResponse.json<TaskPage>({ items: matching.slice(offset, offset + limit), total: matching.length });
  }),

  http.get(`${API}/benchmarks/:benchmarkId/tasks/:taskId/runs`, async ({ params }) => {
    const id = String(params.benchmarkId);
    const task = BENCHMARK_IDS.includes(id) ? taskOf(id, String(params.taskId)) : undefined;
    if (!task) {
      return notFound(`no task ${params.taskId} in ${id}`);
    }
    const combinations = taskRunsOf(id, task.id);
    await delay(80);
    return HttpResponse.json<TaskRuns>({ task: { id: task.id, title: task.title, passRate: passRateOf(combinations) }, runsPerTask: 5, combinations });
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
    return MODELS.some(model => model.id === id) ? HttpResponse.json<ModelProfile>(modelProfile(id)) : notFound(`no model ${id}`);
  }),
];
