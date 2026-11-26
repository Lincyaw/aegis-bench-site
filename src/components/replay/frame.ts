import { touchKindValues } from '../../api/schema';
import type { Footprint, Touch, TouchKind, World, WorldChange, WorldEdge, WorldEvent, WorldNode } from '../../api/types';

/*
 * A replay's frame: the world as it stands after one step, and how each node is marked by what the run has done to it
 * so far. Frames are folded from the world before the run and the run's footprint, so any step can be shown at once.
 */

/**
 * How a node is marked at a step: by the strongest way the run has touched it so far; linked when it sits across a
 * layer from a node the step itself read or changed; removed when the step's own events took it out of the world.
 */
export type NodeMark = 'untouched' | TouchKind | 'linked' | 'removed';

/** The kinds of change an event badge shows, and the glyph it shows for each. */
export type ChangeMark = 'add' | 'remove' | 'set';
export const CHANGE_GLYPHS: Record<ChangeMark, string> = { add: '+', remove: '−', set: '~' };

/** The change a step's badge shows when the step made several: a changed node first, then an added one. */
export const CHANGE_PRECEDENCE: ChangeMark[] = ['set', 'add', 'remove'];

export interface ReplayFrame {
  /** The world after the step, in the world's order with the nodes events added after them; the step's removed nodes keep their places */
  nodes: WorldNode[];

  /** Edges between the frame's nodes, within and across layers */
  edges: WorldEdge[];

  marks: Map<string, NodeMark>;

  /** The strongest way the run has touched each node up to the step, which the counts of a layer read */
  history: Map<string, TouchKind>;

  /** The strongest way the step itself touched each node it touched */
  current: Map<string, TouchKind>;

  /** What the step's events did to each node they named */
  changes: Map<string, ChangeMark>;

  /** The cross-layer edges at the nodes the step read or changed */
  links: WorldEdge[];
}

/** The stronger of two ways of touching a node; the spec declares them from the weakest. */
export function strongerKind(a: TouchKind | undefined, b: TouchKind): TouchKind {
  return a === undefined || touchKindValues.indexOf(b) > touchKindValues.indexOf(a) ? b : a;
}

/** The strongest way each node was touched among the touches given. */
export function strongestTouches(touches: Touch[]): Map<string, TouchKind> {
  const kinds = new Map<string, TouchKind>();
  touches.forEach(touch => kinds.set(touch.node, strongerKind(kinds.get(touch.node), touch.kind)));
  return kinds;
}

/** The node an event's change names, or none for a change of an edge. */
export function nodeOfChange(change: WorldChange): string | undefined {
  switch (change.type) {
    case 'addNode': return change.node.id;
    case 'removeNode':
    case 'setNode': return change.node;
    case 'addEdge':
    case 'removeEdge': return undefined;
  }
}

export function changeMarkOf(change: WorldChange): ChangeMark {
  switch (change.type) {
    case 'addNode':
    case 'addEdge': return 'add';
    case 'removeNode':
    case 'removeEdge': return 'remove';
    case 'setNode': return 'set';
  }
}

/** What a change says beyond its kind, written as the footprint records it. */
export function changeDetail(change: WorldChange): string {
  switch (change.type) {
    case 'addNode': return change.node.id;
    case 'removeNode': return change.node;
    case 'setNode': return [change.node, ...(change.status ? [`status=${change.status}`] : []), ...Object.entries(change.attrs ?? {}).map(([name, value]) => `${name}=${JSON.stringify(value)}`)].join('  ');
    case 'addEdge':
    case 'removeEdge': return `${change.edge.from} → ${change.edge.to}`;
  }
}

const sameEdge = (a: WorldEdge, b: WorldEdge) => a.from === b.from && a.to === b.to && a.type === b.type;

/** The frame after a step: the world with every event up to the step applied, and every touch up to it counted. */
export function frameAt(world: World, footprint: Footprint, step: number): ReplayFrame {
  const nodes = new Map(world.nodes.map(node => [node.id, node]));
  let edges = world.edges;
  const changes = new Map<string, ChangeMark>();
  for (const { step: at, change } of footprint.events.filter(event => event.step <= step)) {
    const id = nodeOfChange(change);
    if (at === step && id !== undefined) {
      changes.set(id, changeMarkOf(change));
    }
    switch (change.type) {
      case 'addNode':
        nodes.set(change.node.id, change.node);
        break;
      case 'removeNode':
        // A node the step itself removes stays for this frame, so the reader sees what left.
        if (at < step) {
          nodes.delete(change.node);
        }
        edges = edges.filter(edge => edge.from !== change.node && edge.to !== change.node);
        break;
      case 'setNode': {
        const node = nodes.get(change.node);
        if (!node) {
          throw new Error(`an event changes ${change.node}, which the world does not have`);
        }
        nodes.set(node.id, { ...node, ...(change.status && { status: change.status }), ...(change.attrs && { attrs: { ...node.attrs, ...change.attrs } }) });
        break;
      }
      case 'addEdge':
        edges = [...edges, change.edge];
        break;
      case 'removeEdge':
        edges = edges.filter(edge => !sameEdge(edge, change.edge));
        break;
    }
  }
  const history = strongestTouches(footprint.touches.filter(touch => touch.step <= step));
  const current = strongestTouches(footprint.touches.filter(touch => touch.step === step));
  const layerOf = (id: string) => nodes.get(id)?.layer;
  const acting = new Set([...current].filter(([, kind]) => kind !== 'seen').map(([id]) => id));
  const links = edges.filter(edge => layerOf(edge.from) !== layerOf(edge.to) && (acting.has(edge.from) || acting.has(edge.to)));
  const linked = new Set(links.flatMap(edge => [edge.from, edge.to]).filter(id => !current.has(id)));
  const marks = new Map<string, NodeMark>([...nodes.keys()].map(id => [
    id,
    changes.get(id) === 'remove' ? 'removed' : linked.has(id) ? 'linked' : history.get(id) ?? 'untouched',
  ]));
  return { nodes: [...nodes.values()], edges, marks, history, current, changes, links };
}

/** Nodes worth drawing in the footprint view: those the run has touched, linked or changed, and every node they sit in. */
export function footprintNodes(frame: ReplayFrame): WorldNode[] {
  const byId = new Map(frame.nodes.map(node => [node.id, node]));
  const kept = new Set(frame.nodes.filter(node => frame.marks.get(node.id) !== 'untouched' || frame.current.has(node.id) || frame.changes.has(node.id)).map(node => node.id));
  for (const id of [...kept]) {
    for (let parent = byId.get(id)?.parent; parent !== undefined && !kept.has(parent); parent = byId.get(parent)?.parent) {
      kept.add(parent);
    }
  }
  return frame.nodes.filter(node => kept.has(node.id));
}

/**
 * Where the run's attention is at a step, among the nodes drawn: the node the step touched most strongly, or, when the
 * step touched none of them, the node touched last before it.
 */
export function focusOf(frame: ReplayFrame, touchesByNode: Map<string, Touch[]>, drawn: ReadonlySet<string>): { node: string; current: boolean } | undefined {
  const [strongest] = [...frame.current].filter(([id]) => drawn.has(id)).toSorted(([, a], [, b]) => touchKindValues.indexOf(b) - touchKindValues.indexOf(a));
  if (strongest) {
    return { node: strongest[0], current: true };
  }
  const [latest] = [...touchesByNode].filter(([id]) => drawn.has(id)).map(([id, touches]) => ({ id, step: touches[touches.length - 1].step })).toSorted((a, b) => b.step - a.step);
  return latest && { node: latest.id, current: false };
}

/** The nodes a reader's folds leave in view, and how many nodes each folded node in view holds out of it. */
export function unfoldedNodes(nodes: WorldNode[], folded: ReadonlySet<string>): { nodes: WorldNode[]; hidden: Map<string, number> } {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const hidden = new Map<string, number>();
  const shown = nodes.filter(node => {
    let outermost: string | undefined;
    for (let parent = node.parent; parent !== undefined; parent = byId.get(parent)?.parent) {
      outermost = folded.has(parent) ? parent : outermost;
    }
    if (outermost !== undefined) {
      hidden.set(outermost, (hidden.get(outermost) ?? 0) + 1);
    }
    return outermost === undefined;
  });
  return { nodes: shown, hidden };
}

/** How the run has touched each layer at each step: the strongest touch per layer, for the trajectory's rows and the playback's lanes. */
export function layerTouchesByStep(world: World, footprint: Footprint): Map<number, Map<string, TouchKind>> {
  const layers = new Map(world.nodes.map(node => [node.id, node.layer]));
  footprint.events.forEach(({ change }) => change.type === 'addNode' && layers.set(change.node.id, change.node.layer));
  const byStep = new Map<number, Map<string, TouchKind>>();
  for (const touch of footprint.touches) {
    const layer = layers.get(touch.node);
    if (layer === undefined) {
      throw new Error(`step ${touch.step} touches ${touch.node}, which the world never has`);
    }
    const kinds = byStep.get(touch.step) ?? new Map<string, TouchKind>();
    kinds.set(layer, strongerKind(kinds.get(layer), touch.kind));
    byStep.set(touch.step, kinds);
  }
  return byStep;
}

/** The world's events grouped by the step after which they hold. */
export function eventsByStep(footprint: Footprint): Map<number, WorldEvent[]> {
  return Map.groupBy(footprint.events, event => event.step);
}
