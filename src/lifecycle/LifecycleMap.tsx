import { clsx } from 'clsx';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Half, Stage } from '../api/client';
import { LocaleLink } from '../i18n/LocaleRouting';
import { useLocalizedNavigate } from '../i18n/localeContext';
import { benchmarkPath } from '../site/siteMap';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '../ui/media';
import { MAP, labelPlacement, lobePath, nodePlacement, numberOffset } from './loop';
import { HALF_LABELS, type StageLabel } from './stages';
import styles from './LifecycleMap.module.css';

/** The two lobes of the loop, each coloured by its half. */
export function LoopLobes() {
  return (['dev', 'ops'] as const).map(half => <path key={half} d={lobePath(half, MAP.cx, MAP.cy, MAP.a)} className={styles.lobe} data-half={half} />);
}

/**
 * The lifecycle loop as a map: clicking a stage with one benchmark opens it, a stage with several asks which, and a
 * stage still under construction only says so. Stages with a label show it; the others show their number.
 */
export function LifecycleMap({ stages, labels }: { stages: Stage[]; labels: Record<string, StageLabel> }) {
  const { t } = useTranslation();
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  return (
    <div className={styles.map}>
      <svg viewBox={`0 0 ${MAP.width} ${MAP.height}`} aria-hidden="true">
        <LoopLobes />
        <text x={MAP.cx - 132} y={MAP.cy + 4} className={styles.halfName}>{t(HALF_LABELS.dev)}</text>
        <text x={MAP.cx + 132} y={MAP.cy + 4} className={styles.halfName}>{t(HALF_LABELS.ops)}</text>
        <circle r="3.5" className={styles.agent}>
          {!reducedMotion && <animateMotion dur="28s" repeatCount="indefinite" path={`${lobePath('dev', MAP.cx, MAP.cy, MAP.a, 64)} ${lobePath('ops', MAP.cx, MAP.cy, MAP.a, 64).replace('M', 'L')}`} />}
        </circle>
      </svg>
      {stages.map(stage => <StageNode key={stage.id} stage={stage} caption={<StageCaption stage={stage} label={labels[stage.id]} />} />)}
    </div>
  );
}

/** The loop small, as a mark of where one stage sits; its nodes still open their benchmarks. */
export function LifecycleMiniMap({ stages, current }: { stages: Stage[]; current: string }) {
  return (
    <div className={clsx(styles.map, styles.mini)}>
      <svg viewBox={`0 0 ${MAP.width} ${MAP.height}`} aria-hidden="true"><LoopLobes /></svg>
      {stages.map(stage => <StageNode key={stage.id} stage={stage} current={stage.id === current} />)}
    </div>
  );
}

export function StageCaption({ stage, label }: { stage: Stage; label: StageLabel | undefined }) {
  if (!label) {
    const [dx, dy] = numberOffset(stage.id);
    return <span className={clsx(styles.number, 't-mono c-faint')} style={{ transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))` }}>{stage.id}</span>;
  }
  const { above, towardLeft } = labelPlacement(stage.id);
  return (
    <span className={clsx(styles.label, above ? styles.above : styles.below, towardLeft ? styles.left : styles.right)}>
      <span className="t-micro c-main">{label.primary}</span>
      <span className="t-micro c-faint">{label.secondary}</span>
    </span>
  );
}

/** One stage on the map: it opens its benchmark, offers a choice among several, or says it is under construction. */
export function StageNode({ stage, current = false, caption }: { stage: Stage; current?: boolean; caption?: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const [choosing, setChoosing] = useState(false);
  const [hinting, setHinting] = useState(false);
  const name = `${stage.id} ${stage.name}`;
  const [only] = stage.benchmarks;
  const published = stage.benchmarks.length > 0;
  return (
    <div className={styles.stage} style={nodePlacement(stage.id)} data-half={stage.half}>
      {published ? (
        <button
          type="button"
          className={styles.node}
          aria-current={current ? 'true' : undefined}
          aria-label={t('lifecycle.stageWith', { stage: name, benchmarks: stage.benchmarks.map(benchmark => benchmark.name).join(t('lifecycle.listSeparator')) })}
          aria-expanded={stage.benchmarks.length > 1 ? choosing : undefined}
          onClick={() => (stage.benchmarks.length === 1 ? navigate(benchmarkPath(only.id)) : setChoosing(!choosing))}
        />
      ) : (
        <button
          type="button"
          className={clsx(styles.node, styles.building)}
          aria-current={current ? 'true' : undefined}
          aria-label={t('lifecycle.stageBuilding', { stage: name })}
          onMouseEnter={() => setHinting(true)}
          onMouseLeave={() => setHinting(false)}
          onFocus={() => setHinting(true)}
          onBlur={() => setHinting(false)}
        />
      )}
      {caption}
      {hinting && <span className={clsx(styles.hint, 't-micro')} role="tooltip">{t('lifecycle.stageBuilding', { stage: name })}</span>}
      {choosing && (
        <div className={styles.chooser} role="menu">
          <p className="t-micro c-faint">{t('lifecycle.benchmarksAt', { stage: name, count: stage.benchmarks.length })}</p>
          {stage.benchmarks.map(benchmark => <LocaleLink key={benchmark.id} role="menuitem" to={benchmarkPath(benchmark.id)} className="t-label">{benchmark.name}</LocaleLink>)}
        </div>
      )}
    </div>
  );
}

/** A dot in a half's colour, as on the loop. */
export function HalfDot({ half }: { half: Half }) {
  return <span className={styles.dot} data-half={half} aria-hidden="true" />;
}

/** A dashed dot: a stage still under construction. */
export function BuildingDot() {
  return <span className={clsx(styles.dot, styles.buildingDot)} aria-hidden="true" />;
}
