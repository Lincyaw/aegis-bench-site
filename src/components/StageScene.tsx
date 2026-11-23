import { useId, type ReactNode } from 'react';

/** Line drawings of the stages that have benchmarks, exported from the Figma Site/Stage scene components. */
const fill = (token: string) => ({ fill: `var(--${token})` });
const stroke = (token: string) => ({ stroke: `var(--${token})` });
const line = { strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function bar(x1: number, x2: number, y: number, token: string, opacity?: number, height = 8) {
  const r = height / 2;
  return <path key={`${x1}-${y}`} opacity={opacity} d={`M${x2 - r} ${y}H${x1 + r}A${r} ${r} 0 0 0 ${x1 + r} ${y + height}H${x2 - r}A${r} ${r} 0 0 0 ${x2 - r} ${y}Z`} style={fill(token)} />;
}

function coding(): ReactNode {
  return (
    <>
      <path d="M34.67 29.33H445.33a8 8 0 0 1 8 8V282.67a8 8 0 0 1-8 8H34.67a8 8 0 0 1-8-8V37.33a8 8 0 0 1 8-8Z" strokeWidth="2" style={stroke('text-faint')} />
      <path d="M26.67 58.67H453.33" strokeWidth="2" style={stroke('text-faint')} />
      {[45.33, 60, 74.67].map(cx => <circle key={cx} cx={cx} cy="44" r="4" opacity="0.16" style={fill('text-main')} />)}
      {[80, 106.67, 133.33, 160, 186.67, 213.33, 240].map(y => bar(42.67, 56, y, 'text-main', 0.16))}
      {bar(74.67, 202.67, 80, 'brand-dev')}
      {bar(96, 282.67, 106.67, 'text-main', 0.42)}
      {bar(96, 192, 133.33, 'brand-dev')}
      {bar(117.33, 341.33, 160, 'text-main', 0.42)}
      {bar(117.33, 277.33, 186.67, 'text-main', 0.42)}
      {bar(96, 216, 213.33, 'brand-dev')}
      {bar(74.67, 128, 240, 'text-main', 0.42)}
      <rect x="133.33" y="236" width="8" height="16" rx="1.33" style={fill('brand-dev')} />
    </>
  );
}

function check(cy: number, mark: 'ok' | 'bad', barEnd: number): ReactNode {
  return (
    <g key={cy}>
      <circle cx="58.67" cy={cy} r="10.67" {...line} style={stroke('text-faint')} />
      {mark === 'ok'
        ? <path d={`M53.33 ${cy}l4 4 8-8`} {...line} style={stroke('accent-success')} />
        : <path d={`M54 ${cy - 4.67}l9.33 9.33M63.33 ${cy - 4.67}L54 ${cy + 4.67}`} {...line} style={stroke('accent-warning')} />}
      {bar(85.33, barEnd, cy - 4, 'text-main', 0.16)}
    </g>
  );
}

function testing(): ReactNode {
  return (
    <>
      {check(58.67, 'ok', 285.33)}
      {check(98.67, 'ok', 338.67)}
      {check(138.67, 'bad', 245.33)}
      {check(178.67, 'ok', 312)}
      {check(218.67, 'ok', 272)}
      {bar(40, 440, 264, 'text-main', 0.16, 5.33)}
      {bar(40, 344, 264, 'brand-ops', undefined, 5.33)}
      <text x="362.67" y="144" style={{ ...fill('text-faint'), font: '14px var(--font-mono)' }}>rerun</text>
    </>
  );
}

function operations(): ReactNode {
  // A calm signal: humps of width 21.33 alternating above and below the baseline.
  const wave = (from: number, to: number) => {
    let d = `M${from} 213.33`;
    for (let x = from, up = true; x + 21.32 <= to; x += 21.33, up = !up) {
      const y = up ? 208 : 218.67;
      d += `C${(x + 7.11).toFixed(2)} ${y} ${(x + 14.22).toFixed(2)} ${y} ${(x + 21.33).toFixed(2)} 213.33`;
    }
    return d;
  };
  return (
    <>
      <path d="M40 53.33V266.67H440" {...line} style={stroke('text-faint')} />
      <path d={`${wave(40, 189.33)}H202.67L216 74.67L229.33 213.33`} {...line} style={stroke('text-muted')} />
      <path d={`${wave(250.67, 421.33)}H440`} {...line} style={stroke('accent-success')} />
      <circle cx="237.33" cy="74.67" r="10.67" opacity="0.5" {...line} style={stroke('accent-warning')} />
      <rect x="314.67" y="37.33" width="125.33" height="29.33" rx="14.67" {...line} style={stroke('text-faint')} />
      <circle cx="333.33" cy="52" r="5.33" style={fill('accent-success')} />
      <text x="346.67" y="57.43" style={{ ...fill('accent-success'), font: '14px var(--font-text)' }}>已恢复</text>
    </>
  );
}

const SCENES: Record<string, () => ReactNode> = { '03': coding, '05': testing, '07': operations };

export function hasScene(stageId: string): boolean {
  return stageId in SCENES;
}

export function StageScene({ stageId }: { stageId: string }) {
  const clip = useId();
  return (
    <svg viewBox="0 0 480 320" width="100%" fill="none" role="img" aria-label="环节示意图" style={{ display: 'block' }}>
      <clipPath id={clip}><rect width="480" height="320" rx="6" /></clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect width="480" height="320" rx="6" style={fill('bg-page')} />
        {SCENES[stageId]()}
      </g>
      <rect x="0.5" y="0.5" width="479" height="319" rx="5.5" strokeOpacity="0.1" style={stroke('text-main')} />
    </svg>
  );
}
