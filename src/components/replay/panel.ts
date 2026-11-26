import { diffLines } from 'diff';
import type {
  Footprint, LineRange, LogEntry, MetricSeries, RunSignals, Span, Touch, TouchView, TrajectoryStep, World, WorldEdge, WorldEvent, WorldNode,
} from '../../api/types';
import type { PanelScope } from '../../routes/consoleReplay';
import { textOf } from '../trajectory/steps';

/*
 * What a node's side panel reads: the node's part of the run's signals, the run's clock, and the touch whose view the
 * panel shows as what the agent saw. Every block of the panel takes the same props and shows its own kind of data.
 */

/** A node's part of a run's signals: its series, the log entries it wrote or whose stack runs through it, and the traces that pass through it. */
export interface NodeSignals {
  series: MetricSeries[];
  logs: LogEntry[];

  /** Each trace whole, its spans in the order they started */
  traces: Span[][];
}

export function nodeSignalsOf(signals: RunSignals, node: string): NodeSignals {
  const traceIds = new Set(signals.spans.filter(span => span.node === node).map(span => span.traceId));
  const traces = Map.groupBy(signals.spans.filter(span => traceIds.has(span.traceId)), span => span.traceId);
  return {
    series: signals.series.filter(series => series.node === node),
    logs: signals.logs.filter(entry => entry.node === node || (entry.stack ?? []).some(frame => frame.node === node)),
    traces: [...traces.values()].map(spans => spans.toSorted((a, b) => a.start.localeCompare(b.start))),
  };
}

/** The run's clock: when each step happened, in milliseconds, and the step nearest a moment. */
export interface StepClock {
  times: Map<number, number>;
  nearest: (time: number) => number;
}

export function stepClockOf(steps: TrajectoryStep[]): StepClock {
  const times = new Map(steps.flatMap(step => (step.timestamp ? [[step.step_id, Date.parse(step.timestamp)] as const] : [])));
  return {
    times,
    nearest: time => {
      const [closest] = [...times].toSorted(([, a], [, b]) => Math.abs(a - time) - Math.abs(b - time));
      if (!closest) {
        throw new Error('the trajectory records no step\'s time');
      }
      return closest[0];
    },
  };
}

/** A touch the panel shows as what the agent saw, with the call's output as the trajectory records it. */
export interface SeenView {
  touch: Touch & { view: TouchView };
  output: string;
}

/** The touch whose view shows what the agent last saw of the node by a step: the latest touch with a view at or before it. */
export function lastSeen(touches: Touch[], step: number): (Touch & { view: TouchView }) | undefined {
  return touches.filter((touch): touch is Touch & { view: TouchView } => touch.view !== undefined && touch.step <= step).at(-1);
}

/** What the agent last saw of a node by a step, with the output of the call that showed it, in the trajectory's words. */
export function seenViewOf(touches: Touch[], step: number, steps: TrajectoryStep[]): SeenView | undefined {
  const touch = lastSeen(touches, step);
  const result = touch && steps.find(candidate => candidate.step_id === touch.step)?.observation?.results.find(entry => entry.source_call_id === touch.toolCallId);
  return touch && { touch, output: textOf(result?.content) };
}

/** A file's text just before and just after a step's own edit of it, when the step edited it. */
export function editAt(world: World, footprint: Footprint, node: string, step: number): { before: string; after: string } | undefined {
  const writes = footprint.events.flatMap(({ step: at, change }) => (change.type === 'setNode' && change.node === node && change.content !== undefined ? [{ at, content: change.content }] : []));
  const after = writes.find(write => write.at === step)?.content;
  const before = writes.filter(write => write.at < step).at(-1)?.content ?? world.nodes.find(candidate => candidate.id === node)?.content;
  return after !== undefined && before !== undefined ? { before, after } : undefined;
}

/** The lines of a file the agent had seen by a step. */
export function linesSeen(touches: Touch[], step: number): LineRange[] {
  return touches.flatMap(touch => (touch.view?.lines && touch.step <= step ? [touch.view.lines] : []));
}

/** What every block of a node's panel is given. */
export interface PanelBlockProps {
  /** The node's record as the world keeps it at the step */
  node: WorldNode;

  scope: PanelScope;

  /** What the agent last saw of the node, when it saw any of its data */
  seen: SeenView | undefined;

  step: number;
  clock: StepClock;
  signals: NodeSignals;

  /** Every touch of the node over the run */
  touches: Touch[];

  /** Every event that changed the node over the run */
  events: WorldEvent[];

  edges: WorldEdge[];

  /** The nodes it holds */
  members: WorldNode[];

  /** A file's text just before and just after the seen step changed it, when that step edited it */
  edit: { before: string; after: string } | undefined;

  onStep: (step: number) => void;
  onSelect: (node: string) => void;
}

/** How many unchanged lines a view keeps around the lines it is about. */
export const CONTEXT_LINES = 3;

/** A line of a file as a panel shows it: its number in the file shown, how it changed, and whether the agent saw it. A gap stands for lines left out. */
export type ContentRow = { kind: 'line'; number: number; text: string; change: 'same' | 'add' | 'remove'; seen: boolean } | { kind: 'gap' };

/** Rows within a few lines of the rows that matter, the rest folded into gaps. */
export function aroundRows(rows: ContentRow[], matters: (row: ContentRow) => boolean): ContentRow[] {
  const near = rows.map((_, index) => rows.slice(Math.max(0, index - CONTEXT_LINES), index + CONTEXT_LINES + 1).some(matters));
  return rows.flatMap((row, index) => (near[index] ? [row] : index > 0 && near[index - 1] ? [{ kind: 'gap' as const }] : []));
}

/** A file's lines, those the agent saw marked; with a range, only the lines around it. */
export function contentRows(text: string, seen: LineRange[], range: LineRange | undefined): ContentRow[] {
  const rows: ContentRow[] = text.replace(/\n$/, '').split('\n').map((line, index) => ({
    kind: 'line', number: index + 1, text: line, change: 'same', seen: seen.some(lines => lines.from <= index + 1 && index + 1 <= lines.to),
  }));
  return range ? aroundRows(rows, row => row.kind === 'line' && range.from <= row.number && row.number <= range.to) : rows;
}

/** An edit of a file as the lines it removed and added, numbered in the new text, with the unchanged lines around them. */
export function diffRows(before: string, after: string): ContentRow[] {
  let number = 0;
  const rows = diffLines(before, after).flatMap(part => part.value.replace(/\n$/, '').split('\n').map((line): ContentRow => {
    const change = part.added ? 'add' : part.removed ? 'remove' : 'same';
    number += change === 'remove' ? 0 : 1;
    return { kind: 'line', number, text: line, change, seen: false };
  }));
  return aroundRows(rows, row => row.kind === 'line' && row.change !== 'same');
}

/** The spans of a trace in call order: each span followed by the spans it called, with its depth. */
export function callOrder(spans: Span[]): { span: Span; depth: number }[] {
  const children = Map.groupBy(spans.filter(span => span.parentId !== undefined), span => span.parentId);
  const visit = (span: Span, depth: number): { span: Span; depth: number }[] => [{ span, depth }, ...(children.get(span.spanId) ?? []).flatMap(child => visit(child, depth + 1))];
  return spans.filter(span => span.parentId === undefined).flatMap(root => visit(root, 0));
}

/** A moment as the trajectory's clock writes it, to the second. */
export function clockTime(time: number): string {
  return new Date(time).toISOString().slice(11, 19);
}
