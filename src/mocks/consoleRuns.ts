import type { CombinationScope, ConsoleRunDetail, Locale, ReviewFilter, RunEvent, RunEventRow, RunFact, RunOutcome, RunRow, RunUsage, Trajectory, TrajectoryStep } from '../api/types';
import { MAX_EXCERPT_LENGTH } from '../api/constraints';
import { benchmarkOf, matchesTaskSearch, taskRefOf } from './benchmarks';
import { harnessRef, keepsTo, modelRef } from './catalog';
import { openedIndexes, readRunFile, readTrajectory } from './records';
import { runDetailOf } from './runs';

/*
 * The console's view of runs: every run of a benchmark with its review, and what each run's trajectory records step by
 * step.
 */

/** The function_name of the tool call that submits, which the spec sorts as a submit event. */
export const SUBMIT_FUNCTION = 'submit';

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
  const callCounts = agentSteps.flatMap(step => (step.llm_call_count === undefined ? [] : [step.llm_call_count]));
  const { total_prompt_tokens: inputTokens, total_cached_tokens: cachedTokens } = trajectory.final_metrics ?? {};
  return {
    ...(inputTokens !== undefined && { inputTokens }), ...(cachedTokens !== undefined && { cachedTokens }),
    ...(callCounts.length > 0 && { modelCalls: callCounts.reduce((sum, count) => sum + count, 0) }),
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

/**
 * Every event of a run's trajectory in index order, each with the part of its step it was read from as the record:
 * the step's message, then its tool calls, then its observation results.
 */
export function runEventsOf(trajectory: Trajectory): RunEvent[] {
  const events = trajectory.steps.flatMap((step): Omit<RunEvent, 'index'>[] => {
    const place = { stepId: step.step_id, at: step.timestamp };
    const calls = step.tool_calls ?? [];
    return [
      { ...place, kind: 'message', record: step.message },
      ...calls.map(call => ({ ...place, kind: call.function_name === SUBMIT_FUNCTION ? 'submit' : 'toolCall', tool: call.function_name, record: call }) as const),
      ...(step.observation?.results ?? []).map(result => {
        const tool = calls.find(call => call.tool_call_id === result.source_call_id)?.function_name;
        return { ...place, kind: isFailedResult(result.extra) ? 'error' : 'observation', ...(tool && { tool }), record: result } as const;
      }),
    ];
  });
  return events.map((event, index) => ({ index: index + 1, ...event }));
}

/** The text of a message or of an observation result's content: a list of parts gives its text parts, a line apart. */
export function contentTextOf(content: TrajectoryStep['message'] | undefined): string {
  if (Array.isArray(content)) {
    return content.flatMap(part => (part.type === 'text' ? [part.text] : [])).join('\n');
  }
  return content ?? '';
}

/**
 * An event as a list shows it: its record traded for the first line of its text, cut as the spec declares. The text is
 * a message's, a tool call's arguments as JSON, or an observation result's content.
 */
export function runEventRowOf({ record, ...event }: RunEvent): RunEventRow {
  const text = typeof record === 'string' || Array.isArray(record) ? contentTextOf(record) : 'function_name' in record ? JSON.stringify(record.arguments) : contentTextOf(record.content);
  return { ...event, excerpt: Array.from(text.split('\n', 1)[0]).slice(0, MAX_EXCERPT_LENGTH).join('') };
}

/** Every string a record holds, at any depth. */
export function stringsOf(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(stringsOf);
  }
  return [];
}

/** Whether an event's tool, or any string its record holds, contains the search text; an empty search keeps every event. */
export function matchesEventSearch(event: RunEvent, q: string): boolean {
  return !q || Boolean(event.tool?.includes(q)) || stringsOf(event.record).some(text => text.includes(q));
}
