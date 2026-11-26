import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { SCENE_LINE as LINE, calmSignal } from './scenes';

/** Line drawings of the stages that have benchmarks, exported from the Figma Site/Stage scene components. */

/** A rounded bar from x1 to x2, such as a line of code or a test name. */
export function SceneBar({ x1, x2, y, color, opacity, height = 8 }: { x1: number; x2: number; y: number; color: string; opacity?: number; height?: number }) {
  const r = height / 2;
  return <path opacity={opacity} d={`M${x2 - r} ${y}H${x1 + r}A${r} ${r} 0 0 0 ${x1 + r} ${y + height}H${x2 - r}A${r} ${r} 0 0 0 ${x2 - r} ${y}Z`} style={{ fill: `var(${color})` }} />;
}

export function CodingScene() {
  return (
    <>
      <path d="M34.67 29.33H445.33a8 8 0 0 1 8 8V282.67a8 8 0 0 1-8 8H34.67a8 8 0 0 1-8-8V37.33a8 8 0 0 1 8-8Z" strokeWidth="2" style={{ stroke: 'var(--text-faint)' }} />
      <path d="M26.67 58.67H453.33" strokeWidth="2" style={{ stroke: 'var(--text-faint)' }} />
      {[45.33, 60, 74.67].map(cx => <circle key={cx} cx={cx} cy="44" r="4" opacity="0.16" style={{ fill: 'var(--text-main)' }} />)}
      {[80, 106.67, 133.33, 160, 186.67, 213.33, 240].map(y => <SceneBar key={y} x1={42.67} x2={56} y={y} color="--text-main" opacity={0.16} />)}
      <SceneBar x1={74.67} x2={202.67} y={80} color="--brand-dev" />
      <SceneBar x1={96} x2={282.67} y={106.67} color="--text-main" opacity={0.42} />
      <SceneBar x1={96} x2={192} y={133.33} color="--brand-dev" />
      <SceneBar x1={117.33} x2={341.33} y={160} color="--text-main" opacity={0.42} />
      <SceneBar x1={117.33} x2={277.33} y={186.67} color="--text-main" opacity={0.42} />
      <SceneBar x1={96} x2={216} y={213.33} color="--brand-dev" />
      <SceneBar x1={74.67} x2={128} y={240} color="--text-main" opacity={0.42} />
      <rect x="133.33" y="236" width="8" height="16" rx="1.33" style={{ fill: 'var(--brand-dev)' }} />
    </>
  );
}

/** A test in the testing scene: its verdict mark and its name. */
export function SceneTest({ cy, passed, nameEnd }: { cy: number; passed: boolean; nameEnd: number }) {
  return (
    <g>
      <circle cx="58.67" cy={cy} r="10.67" {...LINE} style={{ stroke: 'var(--text-faint)' }} />
      {passed
        ? <path d={`M53.33 ${cy}l4 4 8-8`} {...LINE} style={{ stroke: 'var(--accent-success)' }} />
        : <path d={`M54 ${cy - 4.67}l9.33 9.33M63.33 ${cy - 4.67}L54 ${cy + 4.67}`} {...LINE} style={{ stroke: 'var(--accent-warning)' }} />}
      <SceneBar x1={85.33} x2={nameEnd} y={cy - 4} color="--text-main" opacity={0.16} />
    </g>
  );
}

export function TestingScene() {
  return (
    <>
      <SceneTest cy={58.67} passed nameEnd={285.33} />
      <SceneTest cy={98.67} passed nameEnd={338.67} />
      <SceneTest cy={138.67} passed={false} nameEnd={245.33} />
      <SceneTest cy={178.67} passed nameEnd={312} />
      <SceneTest cy={218.67} passed nameEnd={272} />
      <SceneBar x1={40} x2={440} y={264} color="--text-main" opacity={0.16} height={5.33} />
      <SceneBar x1={40} x2={344} y={264} color="--brand-ops" height={5.33} />
      <text x="362.67" y="144" style={{ fill: 'var(--text-faint)', font: '14px var(--font-mono)' }}>rerun</text>
    </>
  );
}

export function OperationsScene() {
  const { t } = useTranslation();
  return (
    <>
      <path d="M40 53.33V266.67H440" {...LINE} style={{ stroke: 'var(--text-faint)' }} />
      <path d={`${calmSignal(40, 189.33)}H202.67L216 74.67L229.33 213.33`} {...LINE} style={{ stroke: 'var(--text-muted)' }} />
      <path d={`${calmSignal(250.67, 421.33)}H440`} {...LINE} style={{ stroke: 'var(--accent-success)' }} />
      <circle cx="237.33" cy="74.67" r="10.67" opacity="0.5" {...LINE} style={{ stroke: 'var(--accent-warning)' }} />
      <rect x="314.67" y="37.33" width="125.33" height="29.33" rx="14.67" {...LINE} style={{ stroke: 'var(--text-faint)' }} />
      <circle cx="333.33" cy="52" r="5.33" style={{ fill: 'var(--accent-success)' }} />
      <text x="346.67" y="57.43" style={{ fill: 'var(--accent-success)', font: '14px var(--font-text)' }}>{t('lifecycle.recovered')}</text>
    </>
  );
}

/** The drawing of a stage, for the stages that have one: 03 coding, 05 testing and 07 operations. */
export function StageScene({ stageId }: { stageId: string }) {
  const { t } = useTranslation();
  const clip = useId();
  const scene = stageId === '03' ? <CodingScene /> : stageId === '05' ? <TestingScene /> : stageId === '07' ? <OperationsScene /> : undefined;
  return scene && (
    <svg viewBox="0 0 480 320" width="100%" fill="none" role="img" aria-label={t('lifecycle.sceneLabel')} style={{ display: 'block' }}>
      <clipPath id={clip}><rect width="480" height="320" rx="6" /></clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect width="480" height="320" rx="6" style={{ fill: 'var(--bg-page)' }} />
        {scene}
      </g>
      <rect x="0.5" y="0.5" width="479" height="319" rx="5.5" strokeOpacity="0.1" style={{ stroke: 'var(--text-main)' }} />
    </svg>
  );
}
