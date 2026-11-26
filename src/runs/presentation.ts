import type { RunDetail } from '../api/client';

/** The five views of a run, in the order its tabs show them; each is labelled by runs.tab.<view>. */
export const RUN_TABS = ['input', 'output', 'grading', 'failure', 'trajectory'] as const;

/** Trajectory steps the list shows at a time. */
export const TRAJECTORY_PAGE_SIZE = 25;

/**
 * Where the page holding a step starts. ATIF numbers a trajectory's steps from 1 without gaps, so a step's id gives
 * its position.
 */
export function trajectoryPageStartOf(stepId: number): number {
  return Math.floor((stepId - 1) / TRAJECTORY_PAGE_SIZE) * TRAJECTORY_PAGE_SIZE;
}
export type RunTab = (typeof RUN_TABS)[number];

/** A failed run opens on why it failed, an execution failure on its trajectory, a passed run on what it produced. */
export function defaultRunTab(run: RunDetail): RunTab {
  switch (run.outcome) {
    case 'failed': return 'failure';
    case 'executionFailed': return 'trajectory';
    case 'passed': return 'output';
  }
}

