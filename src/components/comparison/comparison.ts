import type { TaskComparison, Trajectory } from '../../api/types';

/*
 * How a comparison of a task's runs is read: the numerals that tell its runs apart, what a site lends the comparison,
 * and the contract every block of the comparison keeps.
 */

/** What a site lends its comparison: how to read the comparison and whole trajectories, and where a run's own page is. */
export interface ComparisonSource {
  useComparison: (runIds: string[]) => TaskComparison;
  useTrajectories: (runIds: string[]) => Trajectory[];
  runPath: (runId: string) => string;
}

/** Runs are told apart by Roman numeral in the order they were chosen; letters already name vendors and harnesses. */
export const RUN_NUMERALS = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'] as const;

/** The numeral of the run at a position in the comparison. */
export function numeralAt(index: number): string {
  const numeral = RUN_NUMERALS[index];
  if (numeral === undefined) {
    throw new Error(`no numeral for run ${index + 1}`);
  }
  return numeral;
}

/** The numeral of a run of the comparison. */
export function numeralOf(comparison: TaskComparison, runId: string): string {
  return numeralAt(comparison.runs.findIndex(run => run.id === runId));
}

/** The key a row of a block opens in place by: the block's kind of row and, for a row per item, the item. */
export function rowKeyOf(kind: 'file' | 'check' | 'reply' | 'review', item?: string): string {
  return item === undefined ? kind : `${kind}:${item}`;
}

/**
 * A block's part of the comparison: its rows, a cell per compared run, each item row opening in place; the trajectory
 * block opens a run's trajectory in the side panel instead.
 */
export interface BlockProps {
  comparison: TaskComparison;

  /** The rows open in place */
  expanded: string[];

  /** Opens the rows, or closes them when all are open */
  onExpand: (keys: string[]) => void;

  /** Shows a run's trajectory in the side panel */
  onTrajectory: (runId: string) => void;
}
