import type { ComponentType } from 'react';
import type { ReplayPanelBlock } from '../../api/types';
import type { PanelBlockProps } from './panel';
import { ContentBlock, EdgesBlock, EventsBlock, LogsBlock, MetricsBlock, RecordBlock, TouchesBlock, TracesBlock } from './PanelBlocks';

/**
 * Every block a node's side panel can be made of. A benchmark's configuration names the blocks and their order, and
 * the panel looks each one up here; a new kind of data needs one more block here and nothing else.
 */
export const PANEL_BLOCKS: Record<ReplayPanelBlock, ComponentType<PanelBlockProps>> = {
  record: RecordBlock,
  content: ContentBlock,
  metrics: MetricsBlock,
  logs: LogsBlock,
  traces: TracesBlock,
  touches: TouchesBlock,
  events: EventsBlock,
  edges: EdgesBlock,
};
