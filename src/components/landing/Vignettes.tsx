import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { Stage } from '../../api/types';
import { GoArrowIcon } from '../../ui/icons';
import { benchmarkNames } from '../lifecycle/stages';
import { PART } from './landingMarkup';
import styles from './Vignettes.module.css';

/*
 * Each stage's scene, drawn in one stroke vocabulary: c in the stage's half colour, dim and ink in the text greys,
 * ok and bad in the status colours, with f-prefixed fills. The other classes name the parts its timeline animates.
 */

export function RequirementsDrawing() {
  const { t } = useTranslation();
  return (
    <svg className={styles.drawing} viewBox="0 0 360 240">
      <path className="dim draw" d="M44 62h104a10 10 0 0 1 10 10v52a10 10 0 0 1-10 10H86l-18 16v-16H44a10 10 0 0 1-10-10V72a10 10 0 0 1 10-10z" />
      <path className="ink draw" d="M50 84q10-6 20 0t20 0t20 0t20 0" />
      <path className="ink draw" d="M50 100q10-6 20 0t20 0t20 0" />
      <path className="ink draw" d="M50 116q10-6 20 0t20 0" />
      <path className="c draw" d="M176 100h32m-7-6l7 6l-7 6" />
      {[[58, 78], [92, 60], [126, 86]].map(([y, width]) => (
        <g key={y} className="row">
          <rect className="dim" x="226" y={y} width="14" height="14" rx="3" />
          <path className="c tick" d={`M229.5 ${y + 7}l3 3l5-6`} />
          <rect className="fdim" x="250" y={y + 4} width={width} height="6" rx="3" />
        </g>
      ))}
      <text x="86" y="196" textAnchor="middle">{t('landing.scene.request')}</text>
      <text x="281" y="196" textAnchor="middle">{t('landing.scene.tasks')}</text>
    </svg>
  );
}

export function DesignDrawing() {
  return (
    <svg className={styles.drawing} viewBox="0 0 360 240">
      <path className="dim link" d="M180 56v18H92v24" />
      <path className="dim link" d="M180 74h88v24" />
      <path className="dim link" d="M92 128v42h50" />
      <path className="dim link" d="M268 128v42h-50" />
      <rect className="c solid pop node" x="148" y="26" width="64" height="30" rx="5" />
      <rect className="ink solid pop node" x="56" y="98" width="72" height="30" rx="5" />
      <rect className="ink solid pop node" x="232" y="98" width="72" height="30" rx="5" />
      <g className="pop node"><path className="ink solid" d="M146 162v24a34 8 0 0 0 68 0v-24" /><ellipse className="ink solid" cx="180" cy="162" rx="34" ry="8" /></g>
      <text className="mono" x="180" y="45" textAnchor="middle">UI</text>
      <text className="mono" x="92" y="117" textAnchor="middle">API</text>
      <text className="mono" x="268" y="117" textAnchor="middle">AUTH</text>
      <text className="mono" x="180" y="192" textAnchor="middle">DB</text>
      <path className="flow" d="M180 56v18H92v24v30v42h50" stroke="none" />
      <circle className="fc dot" r="4" cx="0" cy="0" />
    </svg>
  );
}

export function ImplementationDrawing() {
  const lines = [[56, 96, 'fc'], [72, 140, 'fink'], [72, 72, 'fc'], [88, 168, 'fink'], [88, 120, 'fink'], [72, 90, 'fc'], [56, 40, 'fink']] as const;
  return (
    <svg className={styles.drawing} viewBox="0 0 360 240">
      <rect className="dim" x="20" y="22" width="320" height="196" rx="6" />
      <path className="dim" d="M20 44h320" />
      {[34, 45, 56].map(cx => <circle key={cx} className="fdim" cx={cx} cy="33" r="3" />)}
      {lines.map((_, k) => <rect key={k} className="fdim" x="32" y={60 + k * 20} width="10" height="6" rx="3" />)}
      {lines.map(([x, width, fill], k) => <rect key={k} className={`${fill} code`} x={x} y={60 + k * 20} width={width} height="6" rx="3" />)}
      <rect className="fc caret" x="56" y="57" width="6" height="12" rx="1" />
    </svg>
  );
}

export function ReviewDrawing() {
  return (
    <svg className={styles.drawing} viewBox="0 0 360 240">
      <rect className="dim" x="20" y="22" width="320" height="196" rx="6" />
      <g className="drow"><rect className="fdim" x="44" y="42" width="120" height="6" rx="3" /></g>
      <g className="drow"><rect className="fbad mark-bg" x="21" y="58" width="318" height="22" /><path className="bad" d="M30 69h6" /><rect className="fdim" x="44" y="66" width="150" height="6" rx="3" /></g>
      <g className="drow"><rect className="fok mark-bg" x="21" y="82" width="318" height="22" /><path className="ok" d="M30 93h6m-3-3v6" /><rect className="fink" x="44" y="90" width="170" height="6" rx="3" /></g>
      <g className="drow"><rect className="fok mark-bg" x="21" y="106" width="318" height="22" /><path className="ok" d="M30 117h6m-3-3v6" /><rect className="fink" x="60" y="114" width="110" height="6" rx="3" /></g>
      <g className="drow"><rect className="fdim" x="44" y="138" width="90" height="6" rx="3" /></g>
      <g className="pop comment">
        <path className="c solid" d="M206 128h108a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6h-80l-10 10v-10h-18a6 6 0 0 1-6-6v-28a6 6 0 0 1 6-6z" />
        <rect className="fc" x="218" y="140" width="70" height="5" rx="2.5" />
        <rect className="fdim" x="218" y="151" width="46" height="5" rx="2.5" />
      </g>
      <circle className="ok draw" cx="302" cy="54" r="14" />
      <path className="ok draw" d="M295 54l5 5l9-10" />
    </svg>
  );
}

export function TestingDrawing() {
  return (
    <svg className={styles.drawing} viewBox="0 0 360 240">
      {[150, 190, 120, 170, 140].map((width, k) => {
        const y = 44 + k * 30;
        return (
          <g key={y} className="trow">
            <circle className="dim st" cx="44" cy={y} r="8" />
            {k === 2 && <path className="bad draw cross" d={`M40.5 ${y - 3.5}l7 7m0-7l-7 7`} />}
            <path className="ok draw chk" d={`M40 ${y}l3 3l6-6`} />
            <rect className="fdim" x="64" y={y - 3} width={width} height="6" rx="3" />
          </g>
        );
      })}
      <rect className="fdim" x="30" y="198" width="300" height="4" rx="2" />
      <rect className="fc prog" x="30" y="198" width="0" height="4" rx="2" />
      <text className="mono rerun" x="272" y="108">rerun</text>
    </svg>
  );
}

export function ReleaseDrawing() {
  const { t } = useTranslation();
  const steps = [
    { cx: 52, icon: 'M45 101h8v8h-8zM51 107h8v8h-8z', label: t('landing.scene.build') },
    { cx: 136, icon: 'M129 108l5 5l9-10', label: t('landing.scene.test') },
    { cx: 220, icon: 'M212 104l8-5l8 5v9l-8 5l-8-5zM212 104l8 5l8-5M220 109v9', label: t('landing.scene.package') },
    { cx: 304, icon: 'M296 113a5 5 0 0 1 1-9.5a7 7 0 0 1 13 1a4.5 4.5 0 0 1 3 8.5z', label: t('landing.scene.deploy') },
  ];
  return (
    <svg className={styles.drawing} viewBox="0 0 360 240">
      <path className="dim" d="M72 108h44M156 108h44M240 108h44" />
      {steps.map(step => (
        <g key={step.cx}>
          <circle className="dim solid st" cx={step.cx} cy="108" r="20" />
          <path className="ink" d={step.icon} />
          <text x={step.cx} y="150" textAnchor="middle">{step.label}</text>
        </g>
      ))}
      <circle className="c pop done" cx="304" cy="108" r="20" />
      <circle className="fc token" r="5" cx="52" cy="108" />
    </svg>
  );
}

export function OperationsDrawing() {
  const { t } = useTranslation();
  return (
    <svg className={styles.drawing} viewBox="0 0 360 240">
      <path className="dim" d="M30 40v160h300" />
      <path className="baseline" d="M30 160h300" />
      <path className="ink draw sig" d="M30 160q8-6 16 0t16 0t16 0t16 0t16 0t16 0t16 0l10 0l10-104l10 104" />
      <path className="ok draw rec" d="M188 160q8-6 16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0h14" />
      <circle className="bad pop pulse" cx="178" cy="56" r="8" />
      <rect className="dim" x="236" y="28" width="94" height="22" rx="11" />
      <circle className="status" cx="250" cy="39" r="4" />
      <text className="alert-text" x="260" y="43">{t('landing.scene.alert')}</text>
      <text className="ok-text" x="260" y="43">{t('lifecycle.recovered')}</text>
    </svg>
  );
}

export function MaintenanceDrawing() {
  const blocks = [[96, 66, 'ink'], [156, 66, 'ink'], [216, 66, 'c'], [96, 104, 'ink'], [156, 104, 'c'], [216, 104, 'ink']] as const;
  return (
    <svg className={styles.drawing} viewBox="0 0 360 240">
      {blocks.map(([x, y, stroke]) => <rect key={`${x} ${y}`} className={`${stroke} solid pop block`} x={x} y={y} width="50" height="28" rx="4" />)}
      <rect className="dim" x="140" y="164" width="82" height="26" rx="13" />
      <text className="mono v-old" x="181" y="181" textAnchor="middle">v1.4</text>
      <text className="mono v-new" x="181" y="181" textAnchor="middle">v2.0</text>
    </svg>
  );
}

/** A stage's scene card, shown above its station while the stage is read; a covered stage's card opens its benchmarks. */
export function VignetteCard({ stage, index, name, onOpen }: { stage: Stage; index: number; name: string; onOpen: (anchor: HTMLElement) => void }) {
  const Drawing = [
    RequirementsDrawing, DesignDrawing, ImplementationDrawing, ReviewDrawing, TestingDrawing, ReleaseDrawing, OperationsDrawing, MaintenanceDrawing,
  ][index];
  const covered = stage.benchmarks.length > 0;
  return (
    <button
      type="button" className={clsx(styles.card, covered && styles.covered)} data-part={PART.vignette} data-half={stage.half} aria-label={name}
      onClick={covered ? event => onOpen(event.currentTarget) : undefined}
    >
      <Drawing />
      {covered && <span className={clsx(styles.go, 't-micro')}>{benchmarkNames(stage)}<GoArrowIcon /></span>}
    </button>
  );
}
