import type { ConsoleRunDetail, Locale, ReviewFilter, RunEvent, RunEventKind, RunFact, RunOutcome, RunRow, RunUsage, Trajectory } from '../api/types';
import { benchmarkOf, matchesTaskSearch, taskRefOf } from './benchmarks';
import { harnessRef, keepsTo, modelRef, type CombinationScope } from './catalog';
import { openedIndexes, readRunFile, readTrajectory } from './records';
import { runDetailOf } from './runs';

/*
 * The console's view of runs: every run of a benchmark with its review, and what each run's trajectory records step by
 * step.
 */

/** Runs per page of the console's run list when a request names no limit, as the spec declares. */
export const DEFAULT_RUN_PAGE_SIZE = 25;

/** Events per page when a request names no limit, as the spec declares. */
export const DEFAULT_EVENT_PAGE_SIZE = 50;

/** No event's excerpt is longer than this, as the spec declares. */
export const MAX_EXCERPT_LENGTH = 400;

export function runRowOf(benchmarkId: string, fact: RunFact, locale: Locale): RunRow {
  return {
    id: fact.id, task: taskRefOf(benchmarkId, fact.taskId), model: modelRef(fact.modelId, locale), harness: harnessRef(fact.harnessId, locale),
    attempt: fact.attempt, outcome: fact.outcome, finishedAt: fact.finishedAt, steps: fact.steps, costUsd: fact.costUsd,
    taskVersion: fact.taskVersion, batch: fact.batch, ...(fact.failureClass && { failureClass: fact.failureClass }),
  };
}

export interface RunFilter extends CombinationScope {
  q: string;

  /** A task's id; every task when empty */
  task: string;

  outcome?: RunOutcome;
  review?: ReviewFilter;
}

/** Whether a run's review puts it among the failed runs a review filter keeps. */
export function matchesReview(fact: RunFact, review: ReviewFilter): boolean {
  return fact.outcome === 'failed' && (review === 'unreviewed' ? fact.failureClass === undefined : fact.failureClass === review);
}

/** The runs a filter selects, newest first. */
export function filteredRunsOf(benchmarkId: string, filter: RunFilter): RunFact[] {
  return benchmarkOf(benchmarkId).runs
    .filter(fact => matchesTaskSearch(taskRefOf(benchmarkId, fact.taskId), filter.q)
      && (!filter.task || fact.taskId === filter.task)
      && keepsTo(filter, fact.modelId, fact.harnessId)
      && (!filter.outcome || fact.outcome === filter.outcome)
      && (!filter.review || matchesReview(fact, filter.review)))
    .toSorted((a, b) => b.finishedAt.localeCompare(a.finishedAt));
}

/** Whether an observation result reports a failed call, as the trajectory marks it. */
export function isFailedResult(extra: Record<string, unknown> | undefined): boolean {
  return extra?.failed === true;
}

/** What a run consumed, added up from its trajectory. */
export function usageOf(trajectory: Trajectory): RunUsage {
  const agentSteps = trajectory.steps.filter(step => step.source === 'agent');
  const calls = agentSteps.flatMap(step => (step.tool_calls ?? []).map(call => ({
    tool: call.function_name,
    failed: (step.observation?.results ?? []).some(result => result.source_call_id === call.tool_call_id && isFailedResult(result.extra)),
  })));
  const byTool = Map.groupBy(calls, call => call.tool);
  return {
    inputTokens: trajectory.final_metrics?.total_prompt_tokens ?? 0,
    cachedTokens: trajectory.final_metrics?.total_cached_tokens ?? 0,
    outputTokens: trajectory.final_metrics?.total_completion_tokens ?? 0,
    costUsd: trajectory.final_metrics?.total_cost_usd ?? 0,
    modelCalls: agentSteps.reduce((sum, step) => sum + (step.llm_call_count ?? 0), 0),
    toolCalls: [...byTool].map(([tool, toolCalls]) => ({ tool, calls: toolCalls.length, failures: toolCalls.filter(call => call.failed).length }))
      .sort((a, b) => b.calls - a.calls || a.tool.localeCompare(b.tool)),
  };
}

/** A run as the console shows it, or nothing when there is no such run. */
export async function consoleRunOf(runId: string, locale: Locale): Promise<ConsoleRunDetail | undefined> {
  const located = openedIndexes().runs.get(runId);
  if (!located) {
    return undefined;
  }
  const { benchmarkId, fact } = located;
  const { record } = benchmarkOf(benchmarkId);
  const [detail, run, trajectory] = await Promise.all([runDetailOf(runId, locale), readRunFile(record, runId), readTrajectory(record, runId)]);
  if (!detail) {
    throw new Error(`run ${runId} has no detail`);
  }
  return {
    ...detail, taskVersion: fact.taskVersion, batch: fact.batch, startedAt: run.startedAt, finishedAt: fact.finishedAt, usage: usageOf(trajectory),
    ...(fact.failureClass && { failureClass: fact.failureClass }), ...(run.reviewer && { reviewer: run.reviewer }),
  };
}

/** Every event of a run's trajectory in the order it happened: the agent's words, its calls and what came back. */
export function runEventsOf(trajectory: Trajectory): RunEvent[] {
  const excerpt = (text: string) => (text.length > MAX_EXCERPT_LENGTH ? `${text.slice(0, MAX_EXCERPT_LENGTH - 1)}…` : text);
  const events = trajectory.steps.flatMap(step => {
    const at = step.timestamp ?? trajectory.steps[0].timestamp ?? '';
    const said = typeof step.message === 'string' ? step.message : step.message.map(part => (part.type === 'text' ? part.text : '')).join('');
    const message = { stepId: step.step_id, kind: 'message' as RunEventKind, at, excerpt: excerpt(said) };
    const calls = (step.tool_calls ?? []).flatMap(call => {
      const result = step.observation?.results.find(candidate => candidate.source_call_id === call.tool_call_id);
      const content = typeof result?.content === 'string' ? result.content : '';
      const kind: RunEventKind = call.function_name === 'submit' ? 'submit' : 'toolCall';
      return [
        { stepId: step.step_id, kind, at, tool: call.function_name, excerpt: excerpt(`${call.function_name}(${JSON.stringify(call.arguments)})`) },
        ...(result ? [{ stepId: step.step_id, kind: (isFailedResult(result.extra) ? 'error' : 'observation') as RunEventKind, at, tool: call.function_name, excerpt: excerpt(content) }] : []),
      ];
    });
    return [message, ...calls];
  });
  return events.map((event, index) => ({ index: index + 1, ...event }));
}
