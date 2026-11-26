import type { Half } from '../../api/client';

/**
 * The lifecycle loop is a lemniscate of Bernoulli: x = a·cos t / (1 + sin²t), y = a·sin t·cos t / (1 + sin²t).
 * The development half is the left lobe and the operations half the right one.
 */
export function lobePath(half: Half, cx: number, cy: number, a: number, segments = 96): string {
  const from = half === 'dev' ? Math.PI / 2 : -Math.PI / 2;
  const points = Array.from({ length: segments + 1 }, (_, index) => {
    const t = from + (Math.PI * index) / segments;
    const d = 1 + Math.sin(t) ** 2;
    return `${(cx + (a * Math.cos(t)) / d).toFixed(2)} ${(cy + (a * Math.sin(t) * Math.cos(t)) / d).toFixed(2)}`;
  });
  return `M ${points.join(' L ')}`;
}

/** The lifecycle map's drawing: its view box and the loop's centre and size within it. */
export const MAP = { width: 640, height: 260, cx: 300, cy: 130, a: 240 } as const;

/** Stage node offsets from the loop's centre for a = 240, as placed in the Figma lifecycle map. */
export const NODE_OFFSETS: Record<string, [number, number]> = {
  '01': [-85, -69], '02': [-208, -64], '03': [-208, 64], '04': [-85, 69],
  '05': [85, -69], '06': [208, -64], '07': [208, 64], '08': [85, 69],
};

/** Nodes this close to the centre sit inside the loop's crossing; their labels turn inward. */
export const CENTRE_REACH = 100;

export function nodePosition(stageId: string, cx: number, cy: number, a: number): [number, number] {
  const [dx, dy] = NODE_OFFSETS[stageId];
  return [cx + (dx * a) / MAP.a, cy + (dy * a) / MAP.a];
}

/** A stage node's place on the lifecycle map, as a share of the map's box. */
export function nodePlacement(stageId: string): { left: string; top: string } {
  const [x, y] = nodePosition(stageId, MAP.cx, MAP.cy, MAP.a);
  return { left: `${(x / MAP.width) * 100}%`, top: `${(y / MAP.height) * 100}%` };
}

/** Where a stage's label sits: above or below its node, extending away from the loop's centre. */
export function labelPlacement(stageId: string): { above: boolean; towardLeft: boolean } {
  const [dx, dy] = NODE_OFFSETS[stageId];
  return { above: dy < 0, towardLeft: Math.abs(dx) < CENTRE_REACH || dx < 0 };
}

/** Where a stage's number sits relative to its node, in pixels: beside it and away from the loop. */
export function numberOffset(stageId: string): [number, number] {
  const [dx, dy] = NODE_OFFSETS[stageId];
  const nearCentre = Math.abs(dx) < CENTRE_REACH;
  return [nearCentre ? (dx < 0 ? 15 : -15) : (dx < 0 ? -20 : 20), dy < 0 ? -20 : 21];
}
