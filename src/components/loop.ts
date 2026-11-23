import type { Half } from '../api/client';

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

/** Stage node offsets from the loop's centre for a = 240, as placed in the Figma lifecycle map. */
const NODE_OFFSETS: Record<string, [number, number]> = {
  '01': [-85, -69], '02': [-208, -64], '03': [-208, 64], '04': [-85, 69],
  '05': [85, -69], '06': [208, -64], '07': [208, 64], '08': [85, 69],
};

export function nodePosition(stageId: string, cx: number, cy: number, a: number): [number, number] {
  const [dx, dy] = NODE_OFFSETS[stageId];
  return [cx + (dx * a) / 240, cy + (dy * a) / 240];
}

/** Where a stage's label sits: above or below its node, extending away from the loop's centre. */
export function labelPlacement(stageId: string): { above: boolean; towardLeft: boolean } {
  const [dx, dy] = NODE_OFFSETS[stageId];
  const nearCentre = Math.abs(dx) < 100;
  return { above: dy < 0, towardLeft: nearCentre ? true : dx < 0 };
}
