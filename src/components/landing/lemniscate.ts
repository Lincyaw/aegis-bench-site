import * as THREE from 'three';

/** Half the width of the loop; the mark is drawn from the same lemniscate, so the loop can settle into it exactly. */
export const LOOP_SIZE = 12;
export const LOOP_HALF_HEIGHT = LOOP_SIZE / Math.sqrt(8);

/** How far the loop rises and falls out of its plane, so it reads as a path in space rather than a flat figure. */
export const LOOP_RISE = 0.7;

/** Position of each stage along the loop, as a share of one lap; the development half spans .25 to .75. */
export const STATION_AT = [0.35, 0.45, 0.55, 0.65, 0.85, 0.95, 1.05, 1.15];
export const LAP_START = STATION_AT[0];

/** An SVG path along the lemniscate between two angles. */
export function lemniscatePath(from: number, to: number, steps: number): string {
  return Array.from({ length: steps + 1 }, (_, k) => {
    const t = from + ((to - from) * k) / steps;
    const d = 1 + Math.sin(t) ** 2;
    return `${k ? 'L' : 'M'}${((LOOP_SIZE * Math.cos(t)) / d).toFixed(3)} ${((LOOP_SIZE * Math.sin(t) * Math.cos(t)) / d).toFixed(3)}`;
  }).join('');
}

/** The mark: the development half, the operations half, and the lap the agent runs around both. */
export const LOOP_MARK = {
  viewBox: `${-LOOP_SIZE} ${(-LOOP_HALF_HEIGHT).toFixed(3)} ${LOOP_SIZE * 2} ${(LOOP_HALF_HEIGHT * 2).toFixed(3)}`,
  dev: lemniscatePath(Math.PI / 2, Math.PI * 1.5, 160),
  ops: lemniscatePath(-Math.PI / 2, Math.PI / 2, 160),
  lap: lemniscatePath(0, Math.PI * 2, 320),
};

/** A point on the loop in the scene, for s from 0 to 1 along one lap. */
export function loopPoint(s: number): THREE.Vector3 {
  const t = s * Math.PI * 2;
  const d = 1 + Math.sin(t) ** 2;
  return new THREE.Vector3((LOOP_SIZE * Math.cos(t)) / d, LOOP_RISE * Math.sin(t), (LOOP_SIZE * Math.sin(t) * Math.cos(t)) / d);
}

/** How much of the development half's colour the loop takes at s; the halves blend over a short stretch. */
export function devShare(s: number): number {
  return THREE.MathUtils.smoothstep(s, 0.2, 0.3) * (1 - THREE.MathUtils.smoothstep(s, 0.7, 0.8));
}
