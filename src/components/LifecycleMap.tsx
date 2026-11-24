import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Stage } from '../api/client';
import { labelPlacement, lobePath, nodePosition } from './loop';
import styles from './LifecycleMap.module.css';

export interface StageLabel {
  primary: string;
  secondary: string;
}

interface LifecycleMapProps {
  stages: Stage[];

  /** Names of the published benchmarks, by id, for the chooser of a stage with several. */
  benchmarkNames: Record<string, string>;

  /** Labels of the stages that have them; other stages show their number unless the map is compact. */
  labels?: Record<string, StageLabel>;

  /** The stage this page is about. */
  current?: string;

  compact?: boolean;
}

const WIDTH = 640;
const HEIGHT = 260;
const CX = 300;
const CY = 130;
const A = 240;

const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

const at = (x: number, y: number) => ({ left: `${(x / WIDTH) * 100}%`, top: `${(y / HEIGHT) * 100}%` });

/**
 * The lifecycle loop as a map: clicking a stage with one benchmark opens it, a stage with several asks which,
 * and a stage still under construction only says so.
 */
export function LifecycleMap({ stages, benchmarkNames, labels = {}, current, compact = false }: LifecycleMapProps) {
  const navigate = useNavigate();
  const [choosing, setChoosing] = useState<string | undefined>();
  const [hinting, setHinting] = useState<string | undefined>();
  const open = (stage: Stage) => {
    if (stage.benchmarks.length === 1) {
      navigate(`/benchmarks/${stage.benchmarks[0].id}`);
    } else {
      setChoosing(choosing === stage.id ? undefined : stage.id);
    }
  };
  return (
    <div className={`${styles.map} ${compact ? styles.compact : ''}`}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
        <path d={lobePath('dev', CX, CY, A)} className={styles.dev} />
        <path d={lobePath('ops', CX, CY, A)} className={styles.ops} />
        {!compact && <text x={CX - 132} y={CY + 4} className={styles.half}>研 发</text>}
        {!compact && <text x={CX + 132} y={CY + 4} className={styles.half}>运 维</text>}
        {!compact && (
          <circle r="3.5" className={styles.agent}>
            {!REDUCED_MOTION && <animateMotion dur="28s" repeatCount="indefinite" path={`${lobePath('dev', CX, CY, A, 64)} ${lobePath('ops', CX, CY, A, 64).replace('M', 'L')}`} />}
          </circle>
        )}
      </svg>
      {stages.map(stage => {
        const [x, y] = nodePosition(stage.id, CX, CY, A);
        const covered = stage.benchmarks.length > 0;
        const label = labels[stage.id];
        const { above, towardLeft } = labelPlacement(stage.id);
        const name = `${stage.id} ${stage.name}`;
        return (
          <div key={stage.id} className={styles.stage} style={at(x, y)}>
            {covered ? (
              <button
                type="button"
                className={`${styles.node} ${styles[stage.half]} ${current === stage.id ? styles.selected : ''}`}
                aria-label={`${name}：${stage.benchmarks.map(({ id }) => benchmarkNames[id]).join('、')}`}
                aria-expanded={stage.benchmarks.length > 1 ? choosing === stage.id : undefined}
                onClick={() => open(stage)}
              />
            ) : (
              <button
                type="button"
                className={`${styles.node} ${styles.building} ${current === stage.id ? styles.selected : ''}`}
                aria-label={`${name}：建设中`}
                onMouseEnter={() => setHinting(stage.id)}
                onMouseLeave={() => setHinting(undefined)}
                onFocus={() => setHinting(stage.id)}
                onBlur={() => setHinting(undefined)}
              />
            )}
            {!compact && label && (
              <span className={`${styles.label} ${above ? styles.above : styles.below} ${towardLeft ? styles.left : styles.right}`}>
                <span className="t-micro c-main">{label.primary}</span>
                <span className="t-micro c-faint">{label.secondary}</span>
              </span>
            )}
            {!compact && !label && (
              <span className={`${styles.number} t-mono c-faint`} style={numberOffset(stage.id)}>{stage.id}</span>
            )}
            {hinting === stage.id && <span className={`${styles.hint} t-micro`} role="tooltip">{name} · 评测基准建设中</span>}
            {choosing === stage.id && (
              <div className={styles.chooser} role="menu">
                <p className="t-micro c-faint">{name} · {stage.benchmarks.length} 个评测基准</p>
                {stage.benchmarks.map(({ id }) => <Link key={id} role="menuitem" to={`/benchmarks/${id}`} className="t-label">{benchmarkNames[id]}</Link>)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function numberOffset(stageId: string) {
  const [x, y] = nodePosition(stageId, 0, 0, 240);
  const nearCentre = Math.abs(x) < 100;
  const dx = nearCentre ? (x < 0 ? 15 : -15) : (x < 0 ? -20 : 20);
  return { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${y < 0 ? -20 : 21}px))` };
}
