import type { ComponentType } from 'react';
import type { ComparisonBlock } from '../../api/types';
import { Trajectory } from '../trajectory/AnnotatedTrajectory';
import type { BlockProps } from './comparison';
import { Checks, FileChanges, Reply } from './ResultBlocks';

/**
 * Every block a comparison of a task's runs can be made of. A benchmark's configuration names the blocks and their
 * order, and the page looks each one up here; a new kind of task needs one more block here and nothing else.
 */
export const COMPARISON_BLOCKS: Record<ComparisonBlock, ComponentType<BlockProps>> = {
  fileChanges: FileChanges,
  checks: Checks,
  reply: Reply,
  trajectory: Trajectory,
};
