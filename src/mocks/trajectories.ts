import type { SubmissionVerdict, TimelineMark, TimelineStep, Trajectory, TrajectoryStep } from '../api/types';
import { benchmarkOf } from './benchmarks';
import { openedIndexes, readTrajectory } from './records';

/** Trajectory steps per page when a request names no limit, as the spec declares. */
export const DEFAULT_TRAJECTORY_PAGE_SIZE = 25;

/** The run's trajectory in ATIF-v1.8, a record in its original language, or nothing when there is no such run. */
export async function trajectoryOf(runId: string): Promise<Trajectory | undefined> {
  const located = openedIndexes().runs.get(runId);
  return located && readTrajectory(benchmarkOf(located.benchmarkId).record, runId);
}

/** The server's marking rule for a step: a submission by its verdict, a call to one of the benchmark's change tools as a change, any other step as an action. */
export function markOf(step: TrajectoryStep, changeTools: string[]): TimelineMark {
  const submission = (step.observation?.results[0]?.extra as { submission?: SubmissionVerdict } | undefined)?.submission;
  if (submission) {
    return submission.passed ? 'submitPassed' : 'submitFailed';
  }
  const tool = step.tool_calls?.[0]?.function_name;
  return tool !== undefined && changeTools.includes(tool) ? 'change' : 'action';
}

/** Every agent step of a trajectory with its mark, in step order. */
export function timelineOf(trajectory: Trajectory, changeTools: string[]): TimelineStep[] {
  return trajectory.steps.filter(step => step.source === 'agent').map(step => ({ stepId: step.step_id, mark: markOf(step, changeTools) }));
}
