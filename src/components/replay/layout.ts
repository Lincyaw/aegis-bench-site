import { Graph, layout, type EdgeLabel, type GraphLabel, type NodeLabel } from '@dagrejs/dagre';
import type { WorldEdge, WorldLayer, WorldLayerShape, WorldNode } from '../../api/types';

/*
 * Where a frame's nodes stand: each layer drawn by the way of its shape, the layers stacked into bands from the top.
 * Every way is deterministic, so a node keeps its place from step to step unless the world around it changes, and the
 * canvas can slide it when it does.
 */

/**
 * A node's box, as marks.module.css draws it; a label's width is exact because labels are set in the monospaced face at
 * 11px, whose every glyph is 0.6em wide.
 */
export const NODE_HEIGHT = 24;
export const MONO_ADVANCE = 6.6;
export const NODE_PADDING = 8;
export const NODE_BORDER = 1;

/** A status beside a label: the gap before it, its dot and the gap after, and its word at the micro size, where a Han glyph takes a full em. */
export const STATUS_GAP = 8;
export const STATUS_DOT = 6;
export const STATUS_DOT_GAP = 4;
export const MICRO_SIZE = 12;
export const LATIN_ADVANCE = 7;

/** A parent's toggle, beside its node. */
export const TOGGLE_SIZE = 20;
export const TOGGLE_GAP = 4;

/** Rows of a tree or a group, and how a tree indents and wraps. */
export const ROW_PITCH = 28;
export const TREE_INDENT = 22;
export const TREE_GUIDE = 10;
export const TREE_ROWS = 6;
export const BLOCK_GAP = 32;

/** The gaps between a graph's nodes within a rank and between ranks. */
export const GRAPH_NODE_GAP = 16;
export const GRAPH_RANK_GAP = 64;

/** A group's box: its head, which names the parent, its inner padding, its narrowest width and the gap to the next box. */
export const BOX_HEAD = 34;
export const BOX_PADDING = 12;
export const BOX_MIN_WIDTH = 240;
export const BOX_GAP = 16;

/** A band's head, which names the layer, its padding at the bottom and the canvas's margin. */
export const BAND_HEAD = 44;
export const BAND_FOOT = 24;
export const CANVAS_MARGIN = 24;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Placed extends Rect {
  node: WorldNode;
}

export interface PlacedEdge {
  edge: WorldEdge;
  d: string;
}

/** A layer's drawing, in coordinates from the layer's own origin. */
export interface Placement {
  nodes: Placed[];

  /** Parents drawn as boxes around their children */
  boxes: Placed[];

  edges: PlacedEdge[];

  /** Lines that show a tree's nesting, each keyed by what it leads to, so it can move rather than be drawn anew */
  guides: { key: string; d: string }[];

  height: number;
}

/** How a layer of one shape lays out its nodes within a width, given each node's width. */
export type LayerLayout = (nodes: WorldNode[], edges: WorldEdge[], width: number, widthOf: (node: WorldNode) => number) => Placement;

/** About how wide a text is at the micro size. */
export function microTextWidth(text: string): number {
  const han = text.match(/\p{Script=Han}/gu)?.length ?? 0;
  return han * MICRO_SIZE + (text.length - han) * LATIN_ADVANCE;
}

/** The width of a node's box: its label, the status word when it has one, and the toggle when it has children. */
export function nodeWidth(label: string, status: string | undefined, toggles: boolean): number {
  const statusWidth = status === undefined ? 0 : STATUS_GAP + STATUS_DOT + STATUS_DOT_GAP + microTextWidth(status);
  return Math.ceil(2 * NODE_BORDER + 2 * NODE_PADDING + label.length * MONO_ADVANCE + statusWidth + (toggles ? TOGGLE_SIZE + TOGGLE_GAP : 0));
}

/** The children of each node, among the nodes given, in their order. */
export function childrenOf(nodes: WorldNode[]): Map<string, WorldNode[]> {
  const ids = new Set(nodes.map(node => node.id));
  return Map.groupBy(nodes.filter(node => node.parent !== undefined && ids.has(node.parent)), node => node.parent ?? '');
}

/** A curve from one box's right side to another's left, as edges run in a graph laid out from left to right. */
export function sideways(from: Rect, to: Rect): string {
  const [x1, y1, x2, y2] = [from.x + from.width, from.y + from.height / 2, to.x, to.y + to.height / 2];
  const bend = Math.max(Math.abs(x2 - x1) / 2, GRAPH_RANK_GAP / 2);
  return `M ${x1} ${y1} C ${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2} ${y2}`;
}

/** A curve between two boxes in different bands, leaving the one and entering the other on their facing sides. */
export function across(from: Rect, to: Rect): string {
  const down = to.y > from.y;
  const [x1, y1] = [from.x + from.width / 2, down ? from.y + from.height : from.y];
  const [x2, y2] = [to.x + to.width / 2, down ? to.y : to.y + to.height];
  const bend = (y2 - y1) / 2;
  return `M ${x1} ${y1} C ${x1} ${y1 + bend} ${x2} ${y2 - bend} ${x2} ${y2}`;
}

/**
 * A curve between two boxes of a tree: from the one on the left to the one on the right when they stand in different
 * columns, or out to the right and back when they share one.
 */
export function bow(from: Rect, to: Rect): string {
  const [left, right] = from.x <= to.x ? [from, to] : [to, from];
  if (right.x > left.x + left.width) {
    return sideways(left, right);
  }
  const [x1, y1, x2, y2] = [from.x + from.width, from.y + from.height / 2, to.x + to.width, to.y + to.height / 2];
  const out = Math.max(x1, x2) + TREE_INDENT + Math.abs(y2 - y1) / 4;
  return `M ${x1} ${y1} C ${out} ${y1} ${out} ${y2} ${x2} ${y2}`;
}

/**
 * A tree: every root heads a block, its descendants listed beneath it, indented by depth, in columns of a few rows that
 * each hold whole subtrees of the root's children; the blocks run from left to right and wrap at the width. A tree may be
 * as deep as its world, such as directories, files, classes and their methods.
 */
export function layoutTree(nodes: WorldNode[], edges: WorldEdge[], width: number, widthOf: (node: WorldNode) => number): Placement {
  const children = childrenOf(nodes);
  const ids = new Set(nodes.map(node => node.id));
  const roots = nodes.filter(node => node.parent === undefined || !ids.has(node.parent));
  const placed: Placed[] = [];
  const guides: Placement['guides'] = [];
  let [x, top, rowHeight] = [0, 0, 0];
  for (const root of roots) {
    const entries: { node: WorldNode; depth: number }[] = [];
    const descend = (parent: WorldNode, depth: number) => (children.get(parent.id) ?? []).forEach(child => {
      entries.push({ node: child, depth });
      descend(child, depth + 1);
    });
    descend(root, 1);
    // A column breaks only between the root's children, so a file keeps its symbols, or a directory its files, beside it;
    // a child with more than a column's rows has a column to itself.
    const columns: { node: WorldNode; depth: number }[][] = [];
    entries.forEach((entry, index) => {
      const column = columns.at(-1);
      const next = entries.findIndex((later, at) => at > index && later.depth === 1);
      const size = (next < 0 ? entries.length : next) - index;
      if (column && (entry.depth > 1 || column.length + size <= TREE_ROWS)) {
        column.push(entry);
      } else {
        columns.push([entry]);
      }
    });
    const columnWidths = columns.map(column => Math.max(...column.map(entry => entry.depth * TREE_INDENT + widthOf(entry.node))));
    const blockWidth = Math.max(widthOf(root), columnWidths.reduce((sum, columnWidth) => sum + columnWidth + BLOCK_GAP / 2, 0));
    if (x > 0 && x + blockWidth > width) {
      [x, top, rowHeight] = [0, top + rowHeight + BLOCK_GAP / 2, 0];
    }
    placed.push({ node: root, x, y: top, width: widthOf(root), height: NODE_HEIGHT });
    let columnX = x;
    columns.forEach((column, index) => {
      const guideX = columnX + TREE_GUIDE;
      const last = top + ROW_PITCH * column.length + NODE_HEIGHT / 2;
      // Every column's guide is drawn as a corner from the root, so it keeps one shape while it moves.
      guides.push({ key: `${root.id} ${index}`, d: `M ${x + TREE_GUIDE} ${top + NODE_HEIGHT} V ${top + NODE_HEIGHT + 2} H ${guideX} V ${last}` });
      column.forEach((entry, row) => {
        const y = top + ROW_PITCH * (row + 1);
        const entryX = columnX + entry.depth * TREE_INDENT;
        placed.push({ node: entry.node, x: entryX, y, width: widthOf(entry.node), height: NODE_HEIGHT });
        guides.push({ key: entry.node.id, d: `M ${guideX} ${y + NODE_HEIGHT / 2} H ${entryX}` });
      });
      columnX += columnWidths[index] + BLOCK_GAP / 2;
    });
    x += blockWidth + BLOCK_GAP;
    rowHeight = Math.max(rowHeight, ROW_PITCH * Math.max(...columns.map(column => column.length), 0) + NODE_HEIGHT);
  }
  const byId = new Map(placed.map(entry => [entry.node.id, entry]));
  const joined = edges.flatMap(edge => {
    const [from, to] = [byId.get(edge.from), byId.get(edge.to)];
    return from && to && from.node.id !== to.node.parent && to.node.id !== from.node.parent ? [{ edge, d: bow(from, to) }] : [];
  });
  return { nodes: placed, boxes: [], edges: joined, guides, height: top + rowHeight };
}

/**
 * A directed graph, ranked from sources on the left to sinks on the right. A parent is a box round its children, its
 * label in the box's head; the layout makes room for each head by moving down what lies below the box's top. Edges join
 * the nodes that are not boxes.
 */
export function layoutGraph(nodes: WorldNode[], edges: WorldEdge[], _width: number, widthOf: (node: WorldNode) => number): Placement {
  const ids = new Set(nodes.map(node => node.id));
  const parents = new Set(nodes.flatMap(node => (node.parent !== undefined && ids.has(node.parent) ? [node.parent] : [])));
  const graph = new Graph<GraphLabel, NodeLabel, EdgeLabel>({ compound: parents.size > 0 });
  graph.setGraph({ rankdir: 'LR', nodesep: GRAPH_NODE_GAP, ranksep: GRAPH_RANK_GAP, marginx: 0, marginy: 0 });
  graph.setDefaultEdgeLabel(() => ({}));
  // A box's size is the layout's to find from its children.
  nodes.forEach(node => graph.setNode(node.id, parents.has(node.id) ? { width: 0, height: 0 } : { width: widthOf(node), height: NODE_HEIGHT }));
  nodes.forEach(node => node.parent !== undefined && ids.has(node.parent) && graph.setParent(node.id, node.parent));
  const inner = edges.filter(edge => ids.has(edge.from) && ids.has(edge.to) && !parents.has(edge.from) && !parents.has(edge.to));
  inner.forEach(edge => graph.setEdge(edge.from, edge.to));
  layout(graph);
  const rects = new Map(nodes.map(node => {
    const { x = 0, y = 0, width, height } = graph.node(node.id);
    return [node.id, { node, x: x - width / 2, y: y - height / 2, width, height }];
  }));
  const rect = (id: string) => {
    const entry = rects.get(id);
    if (!entry) {
      throw new Error(`the graph lost node ${id}`);
    }
    return entry;
  };
  // From the top box down, each box gets room for its head: what starts below its top moves down, and what spans its top grows.
  let height = graph.graph().height ?? 0;
  for (const box of [...parents].map(rect).toSorted((a, b) => a.y - b.y)) {
    const inside = nodes.filter(node => node.parent === box.node.id).map(node => rect(node.id).y);
    const room = BOX_HEAD + BOX_PADDING / 2 - (Math.min(...inside) - box.y);
    if (room > 0) {
      const line = box.y + 1;
      rects.forEach(entry => {
        if (entry.y > line) {
          entry.y += room;
        } else if (entry.y + entry.height > line) {
          entry.height += room;
        }
      });
      height += room;
    }
    box.width = Math.max(box.width, widthOf(box.node) + 2 * BOX_PADDING);
  }
  const placed = nodes.filter(node => !parents.has(node.id)).map(node => rect(node.id));
  const boxes = [...parents].map(rect);
  return { nodes: placed, boxes, edges: inner.map(edge => ({ edge, d: sideways(rect(edge.from), rect(edge.to)) })), guides: [], height };
}

/** Groups: every parent a box with its children listed inside, the boxes from left to right, wrapping at the width; nodes in no box follow. */
export function layoutGroups(nodes: WorldNode[], edges: WorldEdge[], width: number, widthOf: (node: WorldNode) => number): Placement {
  const children = childrenOf(nodes);
  const ids = new Set(nodes.map(node => node.id));
  const placed: Placed[] = [];
  const boxes: Placed[] = [];
  let [x, top, rowHeight] = [0, 0, 0];
  const advance = (boxWidth: number, boxHeight: number) => {
    if (x > 0 && x + boxWidth > width) {
      [x, top, rowHeight] = [0, top + rowHeight + BOX_GAP, 0];
    }
    const at = { x, y: top };
    x += boxWidth + BOX_GAP;
    rowHeight = Math.max(rowHeight, boxHeight);
    return at;
  };
  for (const parent of nodes.filter(node => children.has(node.id) && (node.parent === undefined || !ids.has(node.parent)))) {
    const members = children.get(parent.id) ?? [];
    const boxWidth = Math.max(BOX_MIN_WIDTH, widthOf(parent), ...members.map(member => widthOf(member) + 2 * BOX_PADDING));
    const boxHeight = BOX_HEAD + ROW_PITCH * members.length + BOX_PADDING / 2;
    const at = advance(boxWidth, boxHeight);
    boxes.push({ node: parent, ...at, width: boxWidth, height: boxHeight });
    members.forEach((member, row) => placed.push({ node: member, x: at.x + BOX_PADDING, y: at.y + BOX_HEAD + ROW_PITCH * row, width: widthOf(member), height: NODE_HEIGHT }));
  }
  for (const loose of nodes.filter(node => !children.has(node.id) && (node.parent === undefined || !ids.has(node.parent)))) {
    placed.push({ node: loose, ...advance(widthOf(loose), NODE_HEIGHT), width: widthOf(loose), height: NODE_HEIGHT });
  }
  const byId = new Map([...placed, ...boxes].map(entry => [entry.node.id, entry]));
  const inner = edges.flatMap(edge => {
    const [from, to] = [byId.get(edge.from), byId.get(edge.to)];
    return from && to && !children.has(edge.from) && !children.has(edge.to) ? [{ edge, d: sideways(from, to) }] : [];
  });
  return { nodes: placed, boxes, edges: inner, guides: [], height: top + rowHeight };
}

/** The way each shape lays out a layer; a benchmark names its layers' shapes, and a new shape needs one more entry here. */
export const LAYER_LAYOUTS: Record<WorldLayerShape, LayerLayout> = {
  tree: layoutTree,
  graph: layoutGraph,
  groups: layoutGroups,
};

/** A layer's band: where it starts down the canvas, how tall it is, and its drawing, whose origin is the band's top left inside its head. */
export interface Band {
  layer: WorldLayer;
  top: number;
  height: number;
  origin: { x: number; y: number };
  placement: Placement;
}

/** The layers' bands down the canvas, each laid out by its shape within the canvas's width, and the canvas's whole size. */
export function layoutBands(layers: WorldLayer[], nodes: WorldNode[], edges: WorldEdge[], width: number, widthOf: (node: WorldNode) => number): { bands: Band[]; width: number; height: number } {
  let top = 0;
  let widest = width;
  const bands = layers.map(layer => {
    const own = nodes.filter(node => node.layer === layer.id);
    const ids = new Set(own.map(node => node.id));
    const placement = LAYER_LAYOUTS[layer.shape](own, edges.filter(edge => ids.has(edge.from) && ids.has(edge.to)), width - 2 * CANVAS_MARGIN, widthOf);
    const band = { layer, top, height: BAND_HEAD + placement.height + BAND_FOOT, origin: { x: CANVAS_MARGIN, y: top + BAND_HEAD }, placement };
    widest = Math.max(widest, ...[...placement.nodes, ...placement.boxes].map(entry => 2 * CANVAS_MARGIN + entry.x + entry.width));
    top += band.height;
    return band;
  });
  return { bands, width: widest, height: top };
}

/** A line inside a band, a tree's guide or an edge, where the canvas draws it: its band's origin and its own path. */
export interface BandLine {
  key: string;
  d: string;
  x: number;
  y: number;
  kind: 'guide' | 'edge';
}

/** A line's identity from frame to frame: what it joins and the path it takes, so a line whose path changes goes and comes anew. */
export function pathKey(line: { key: string; d: string }): string {
  return `${line.key} ${line.d}`;
}

/** Every line the bands draw, keyed by its band and what it joins, so a frame can tell the lines that stay from those that go. */
export function bandLines(drawing: { bands: Band[] }): BandLine[] {
  return drawing.bands.flatMap(({ layer, origin, placement }) => [
    ...placement.guides.map(guide => ({ key: `${layer.id} guide ${guide.key}`, d: guide.d, ...origin, kind: 'guide' as const })),
    ...placement.edges.map(({ edge, d }) => ({ key: `${layer.id} edge ${edge.from} ${edge.to} ${edge.type}`, d, ...origin, kind: 'edge' as const })),
  ]);
}

/** Every node's box as the canvas draws it, in the canvas's coordinates; a group's parent is drawn as the head of its box. */
export function drawnNodes(bands: Band[]): Placed[] {
  return bands.flatMap(({ origin, placement }) => [
    ...placement.boxes.map(entry => ({
      node: entry.node, x: origin.x + entry.x + BOX_PADDING, y: origin.y + entry.y + (BOX_HEAD - NODE_HEIGHT) / 2, width: entry.width - 2 * BOX_PADDING, height: NODE_HEIGHT,
    })),
    ...placement.nodes.map(entry => ({ ...entry, x: origin.x + entry.x, y: origin.y + entry.y })),
  ]);
}
