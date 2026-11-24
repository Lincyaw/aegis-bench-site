import createClient from 'openapi-fetch';
import { useQuery } from '@tanstack/react-query';
import type { components, paths } from './schema';

type Schemas = components['schemas'];
export type Stage = Schemas['Stage'];
export type StageRef = Schemas['StageRef'];
export type Half = Schemas['Half'];
export type Metric = Schemas['Metric'];
export type LabeledValue = Schemas['LabeledValue'];
export type FlowStep = Schemas['FlowStep'];
export type TimelineLegend = Schemas['TimelineLegend'];
export type ModelRef = Schemas['ModelRef'];
export type HarnessRef = Schemas['HarnessRef'];
export type LeaderboardEntry = Schemas['LeaderboardEntry'];
export type LeaderboardView = Schemas['LeaderboardView'];
export type BenchmarkRef = Schemas['BenchmarkRef'];
export type BenchmarkSummary = Schemas['BenchmarkSummary'];
export type BenchmarkDetail = Schemas['BenchmarkDetail'];
export type RecentRun = Schemas['RecentRun'];
export type TimelineMark = Schemas['TimelineMark'];
export type TaskSummary = Schemas['TaskSummary'];
export type TaskPage = Schemas['TaskPage'];
export type TaskRuns = Schemas['TaskRuns'];
export type CombinationRuns = Schemas['CombinationRuns'];
export type RunOutcome = Schemas['RunOutcome'];
export type SubmissionVerdict = Schemas['SubmissionVerdict'];
export type RunDetail = Schemas['RunDetail'];
export type GradingCheck = Schemas['GradingCheck'];
export type CheckMethod = Schemas['CheckMethod'];
export type ModelProfile = Schemas['ModelProfile'];
export type Trajectory = Schemas['ATIF.Trajectory'];
export type TrajectoryStep = Schemas['ATIF.Step'];

export const api = createClient<paths>({ baseUrl: '/api' });

/** Unwraps an openapi-fetch result so that React Query sees API errors as failures. */
async function dataOf<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await request;
  if (data === undefined) {
    throw new Error(`${response.status} ${response.url}: ${JSON.stringify(error)}`);
  }
  return data;
}

export function useStages() {
  return useQuery({ queryKey: ['stages'], queryFn: () => dataOf(api.GET('/stages')) });
}

export function useBenchmarks() {
  return useQuery({ queryKey: ['benchmarks'], queryFn: () => dataOf(api.GET('/benchmarks')) });
}

export function useBenchmark(benchmarkId: string) {
  return useQuery({
    queryKey: ['benchmark', benchmarkId],
    queryFn: () => dataOf(api.GET('/benchmarks/{benchmarkId}', { params: { path: { benchmarkId } } })),
  });
}

export function useLeaderboard(benchmarkId: string, view: LeaderboardView) {
  return useQuery({
    queryKey: ['leaderboard', benchmarkId, view],
    queryFn: () => dataOf(api.GET('/benchmarks/{benchmarkId}/leaderboard', { params: { path: { benchmarkId }, query: { view } } })),
  });
}

export function useTasks(benchmarkId: string, q: string, limit: number) {
  return useQuery({
    queryKey: ['tasks', benchmarkId, q, limit],
    queryFn: () => dataOf(api.GET('/benchmarks/{benchmarkId}/tasks', { params: { path: { benchmarkId }, query: { q, limit } } })),
    placeholderData: previous => previous,
  });
}

export function useTaskRuns(benchmarkId: string, taskId: string | undefined) {
  return useQuery({
    queryKey: ['taskRuns', benchmarkId, taskId],
    queryFn: () => dataOf(api.GET('/benchmarks/{benchmarkId}/tasks/{taskId}/runs', { params: { path: { benchmarkId, taskId: taskId! } } })),
    enabled: taskId !== undefined,
  });
}

export function useRun(runId: string | undefined) {
  return useQuery({
    queryKey: ['run', runId],
    queryFn: () => dataOf(api.GET('/runs/{runId}', { params: { path: { runId: runId! } } })),
    enabled: runId !== undefined,
  });
}

export function useTrajectory(runId: string | undefined) {
  return useQuery({
    queryKey: ['trajectory', runId],
    queryFn: () => dataOf(api.GET('/runs/{runId}/trajectory', { params: { path: { runId: runId! } } })),
    enabled: runId !== undefined,
  });
}

export function useModelProfile(modelId: string) {
  return useQuery({
    queryKey: ['model', modelId],
    queryFn: () => dataOf(api.GET('/models/{modelId}', { params: { path: { modelId } } })),
  });
}
