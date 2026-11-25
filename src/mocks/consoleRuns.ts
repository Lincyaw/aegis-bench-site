import type { ConsoleRunDetail, Locale, ReviewFilter, RunEvent, RunEventKind, RunOutcome, RunUsage, Trajectory } from '../api/types';
import { STAFF } from './catalog';
import { pickOf } from './hash';
import { batchOf, runFactsOf, taskVersionOf, type RunFact } from './runIndex';
import { stepTimeOf } from './runs';
import { runDetailOf, trajectoryOf } from './trajectories';

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

export interface RunFilter {
  q: string;

  /** A model and harness pair as "<model id>-<harness id>"; every pair when empty */
  combination: string;

  outcome?: RunOutcome;
  review?: ReviewFilter;
}

/** Whether a run's review puts it among the failed runs a review filter keeps. */
export function matchesReview(fact: RunFact, review: ReviewFilter): boolean {
  return fact.outcome === 'failed' && (review === 'unreviewed' ? fact.failureClass === undefined : fact.failureClass === review);
}

/** The runs a filter selects, newest first. */
export function filteredRunsOf(benchmarkId: string, filter: RunFilter): RunFact[] {
  return runFactsOf(benchmarkId)
    .filter(fact => (!filter.q || fact.task.id.includes(filter.q) || fact.task.title.includes(filter.q))
      && (!filter.combination || `${fact.key.modelId}-${fact.key.harnessId}` === filter.combination)
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

export function consoleRunOf(runId: string, locale: Locale): ConsoleRunDetail | undefined {
  const detail = runDetailOf(runId, locale);
  const trajectory = trajectoryOf(runId);
  const fact = detail && runFactsOf(detail.benchmark.id).find(candidate => candidate.runId === runId);
  if (!detail || !trajectory || !fact) {
    return undefined;
  }
  const { key } = fact;
  return {
    ...detail, taskVersion: taskVersionOf(key.benchmarkId, key.taskId), batch: batchOf(key.modelId, key.harnessId),
    startedAt: stepTimeOf(runId, 0), finishedAt: fact.finishedAt, usage: usageOf(trajectory),
    ...(fact.failureClass && { failureClass: fact.failureClass, reviewer: pickOf(STAFF, `reviewer:${runId}`) }),
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
