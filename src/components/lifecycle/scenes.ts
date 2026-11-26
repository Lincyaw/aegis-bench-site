/** The stroke of the stage drawings' lines. */
export const SCENE_LINE = { strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** A calm signal from x = from to x = to: humps of width 21.33 alternating above and below the baseline. */
export function calmSignal(from: number, to: number): string {
  let d = `M${from} 213.33`;
  for (let x = from, up = true; x + 21.32 <= to; x += 21.33, up = !up) {
    const y = up ? 208 : 218.67;
    d += `C${(x + 7.11).toFixed(2)} ${y} ${(x + 14.22).toFixed(2)} ${y} ${(x + 21.33).toFixed(2)} 213.33`;
  }
  return d;
}
