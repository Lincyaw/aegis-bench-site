import { useSuspenseQuery } from '@tanstack/react-query';
import createClient from 'openapi-fetch';
import { useLocale } from '../i18n/localeContext';
import type { components, paths } from './schema';

type Schemas = components['schemas'];
export type Locale = Schemas['Locale'];
export type Stage = Schemas['Stage'];
export type StageRef = Schemas['StageRef'];
export type Half = Schemas['Half'];
export type Metric = Schemas['Metric'];
export type LabeledValue = Schemas['LabeledValue'];
export type TimelineLegend = Schemas['TimelineLegend'];
export type VendorSlot = Schemas['VendorSlot'];
export type ModelRef = Schemas['ModelRef'];
export type HarnessRef = Schemas['HarnessRef'];
export type LeaderboardEntry = Schemas['LeaderboardEntry'];
export type LeaderboardView = Schemas['LeaderboardView'];
export type BenchmarkRef = Schemas['BenchmarkRef'];
export type BenchmarkSummary = Schemas['BenchmarkSummary'];
export type BenchmarkDetail = Schemas['BenchmarkDetail'];
export type RecentRun = Schemas['RecentRun'];
export type TimelineMark = Schemas['TimelineMark'];
export type TimelineStep = Schemas['TimelineStep'];
export type TaskSummary = Schemas['TaskSummary'];
export type TaskPage = Schemas['TaskPage'];
export type TaskRuns = Schemas['TaskRuns'];
export type CombinationRuns = Schemas['CombinationRuns'];
export type RunOutcome = Schemas['RunOutcome'];
export type RunEndReason = Schemas['RunEndReason'];
export type SubmissionVerdict = Schemas['SubmissionVerdict'];
export type RunDetail = Schemas['RunDetail'];
export type GradingCheck = Schemas['GradingCheck'];
export type CheckMethod = Schemas['CheckMethod'];
export type ModelProfile = Schemas['ModelProfile'];
export type Trajectory = Schemas['ATIF.Trajectory'];
export type TrajectoryStep = Schemas['ATIF.Step'];

export const api = createClient<paths>({ baseUrl: '/api' });

/** The body of an openapi-fetch response; an API error becomes a thrown error, which the route's error boundary shows. */
export async function responseBody<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await request;
  if (data === undefined) {
    throw new Error(`${response.status} ${response.url}: ${JSON.stringify(error)}`);
  }
  return data;
}

/** Display names come back in the reader's language; see the API's LanguageHeader. */
export function languageHeader(locale: Locale) {
  return { 'Accept-Language': locale };
}

export function useStages() {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['stages', locale],
    queryFn: () => responseBody(api.GET('/stages', { params: { header: languageHeader(locale) } })),
  }).data;
}

export function useBenchmarks() {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['benchmarks', locale],
    queryFn: () => responseBody(api.GET('/benchmarks', { params: { header: languageHeader(locale) } })),
  }).data;
}

export function useBenchmark(benchmarkId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['benchmark', benchmarkId, locale],
    queryFn: () => responseBody(api.GET('/benchmarks/{benchmarkId}', { params: { path: { benchmarkId }, header: languageHeader(locale) } })),
  }).data;
}

export function useLeaderboard(benchmarkId: string, view: LeaderboardView) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['leaderboard', benchmarkId, view, locale],
    queryFn: () => responseBody(api.GET('/benchmarks/{benchmarkId}/leaderboard', { params: { path: { benchmarkId }, query: { view }, header: languageHeader(locale) } })),
  }).data;
}

/** Tasks are records, so their list is the same in every language. */
export function useTasks(benchmarkId: string, q: string, limit: number) {
  return useSuspenseQuery({
    queryKey: ['tasks', benchmarkId, q, limit],
    queryFn: () => responseBody(api.GET('/benchmarks/{benchmarkId}/tasks', { params: { path: { benchmarkId }, query: { q, limit } } })),
  }).data;
}

export function useTaskRuns(benchmarkId: string, taskId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['taskRuns', benchmarkId, taskId, locale],
    queryFn: () => responseBody(api.GET('/benchmarks/{benchmarkId}/tasks/{taskId}/runs', { params: { path: { benchmarkId, taskId }, header: languageHeader(locale) } })),
  }).data;
}

export function useRun(runId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['run', runId, locale],
    queryFn: () => responseBody(api.GET('/runs/{runId}', { params: { path: { runId }, header: languageHeader(locale) } })),
  }).data;
}

/** A trajectory is a record, so it is the same in every language. */
export function useTrajectory(runId: string) {
  return useSuspenseQuery({
    queryKey: ['trajectory', runId],
    queryFn: () => responseBody(api.GET('/runs/{runId}/trajectory', { params: { path: { runId } } })),
  }).data;
}

export function useModelProfile(modelId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['model', modelId, locale],
    queryFn: () => responseBody(api.GET('/models/{modelId}', { params: { path: { modelId }, header: languageHeader(locale) } })),
  }).data;
}
