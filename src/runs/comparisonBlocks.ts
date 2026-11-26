import type { ComparisonBlock } from '../api/types';
import { TrajectoryDetail, TrajectoryOverview } from './AnnotatedTrajectory';
import type { BlockParts } from './comparison';
import { ChecksDetail, ChecksOverview, FileChangesDetail, FileChangesOverview, ReplyDetail, ReplyOverview } from './ResultBlocks';

/**
 * Every block a comparison of a task's runs can be made of. A benchmark's configuration names the blocks and their
 * order, and the page looks each one up here; a new kind of task needs one more block here and nothing else.
 */
export const COMPARISON_BLOCKS: Record<ComparisonBlock, BlockParts> = {
  fileChanges: { Overview: FileChangesOverview, Detail: FileChangesDetail },
  checks: { Overview: ChecksOverview, Detail: ChecksDetail },
  reply: { Overview: ReplyOverview, Detail: ReplyDetail },
  trajectory: { Overview: TrajectoryOverview, Detail: TrajectoryDetail },
};
