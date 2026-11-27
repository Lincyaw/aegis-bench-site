import * as Popover from '@radix-ui/react-popover';
import { clsx } from 'clsx';
import { Fragment, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { halfValues } from '../../api/schema';
import type { Stage } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { benchmarkPath } from '../../routes/site';
import hint from '../../ui/hint.module.css';
import { GoArrowIcon } from '../../ui/icons';
import { HALF_LABELS, benchmarkNames } from '../lifecycle/stages';
import { stageName } from '../result/presentation';
import { PART } from './landingMarkup';
import { VignetteCard } from './Vignettes';
import styles from './LandingStage.module.css';

/** A stage with several benchmarks asks which one to open, next to whatever the reader clicked. */
export interface StageChoice {
  stage: Stage;
  anchor: HTMLElement;
}

/** The layers the motion drives behind and over the copy: the canvas, the veils, the stations' labels and hotspots, and the scene cards. */
export function LoopBackdrop({ stages, onOpenStage }: { stages: Stage[]; onOpenStage: (stage: Stage, anchor: HTMLElement) => void }) {
  const { t } = useTranslation();
  // What a stage's hotspot and scene card open, for a reader who does not see the map.
  const nameOf = (stage: Stage) => {
    const name = stageName(stage);
    return stage.benchmarks.length > 0
      ? t('lifecycle.stageWith', { stage: name, benchmarks: stage.benchmarks.map(benchmark => benchmark.name) })
      : t('lifecycle.stageBuilding', { stage: name });
  };
  return (
    <>
      <canvas className={styles.scene} data-part={PART.scene} aria-hidden="true" />
      <div className={clsx(styles.veil, styles.veilSide)} data-part={PART.veilSide} aria-hidden="true" />
      <div className={clsx(styles.veil, styles.veilDim)} data-part={PART.veilDim} aria-hidden="true" />
      <div className={clsx(styles.veil, styles.veilHero)} data-part={PART.veilHero} aria-hidden="true" />
      <svg className={styles.tether} aria-hidden="true"><line data-part={PART.tether} /></svg>
      <div className={styles.overlay}>
        {stages.map(stage => <StationMarker key={stage.id} stage={stage} name={nameOf(stage)} onOpen={anchor => onOpenStage(stage, anchor)} />)}
        {halfValues.map(half => (
          <div key={half} className={styles.lobe} data-part={PART.lobe} data-half={half} aria-hidden="true">
            <strong>{t(HALF_LABELS[half])}</strong>
            <span>{t(`landing.halfCode.${half}`)}</span>
          </div>
        ))}
      </div>
      <div className={styles.overlay}>
        {stages.map((stage, index) => <VignetteCard key={stage.id} stage={stage} index={index} name={nameOf(stage)} onOpen={anchor => onOpenStage(stage, anchor)} />)}
      </div>
    </>
  );
}

/** A station's label on the map, and the hotspot over its node that opens its benchmarks or says it is still being built. */
export function StationMarker({ stage, name, onOpen }: { stage: Stage; name: string; onOpen: (anchor: HTMLElement) => void }) {
  const { t } = useTranslation();
  const covered = stage.benchmarks.length > 0;
  const open = covered ? (event: { currentTarget: HTMLElement }) => onOpen(event.currentTarget) : undefined;
  return (
    <>
      <button type="button" className={clsx(styles.stationLabel, !covered && styles.planned)} data-part={PART.stationLabel} onClick={open}><b>{stage.id}</b>{stage.name}</button>
      <button
        type="button"
        tabIndex={-1}
        className={clsx(styles.hotspot, !covered && styles.planned)}
        data-part={PART.hotspot}
        data-half={stage.half}
        data-tip={covered ? benchmarkNames(stage) : t('landing.building')}
        aria-label={name}
        onClick={open}
      />
    </>
  );
}

/** The stages down the right edge; the current one is marked as the story reaches it, and a click scrolls to a stage. */
export function StageRail({ stages, current, onSelect }: { stages: Stage[]; current: number | null; onSelect: (index: number) => void }) {
  const { t } = useTranslation();
  return (
    <nav className={styles.rail} aria-label={t('landing.lifecycle')}>
      {stages.map((stage, index) => {
        const covered = stage.benchmarks.length > 0;
        const state = covered ? '' : ` · ${t('landing.planned')}`;
        return (
          <Fragment key={stage.id}>
            {index > 0 && stage.half !== stages[index - 1].half && <hr />}
            <button
              type="button"
              className={clsx(covered && styles.covered)}
              data-half={stage.half}
              aria-current={index === current ? 'step' : undefined}
              aria-label={`${stageName(stage)}${state}`}
              onClick={() => onSelect(index)}
            >
              <span className={styles.railName}>{`${t(HALF_LABELS[stage.half])} · ${stage.name}${state}`}</span>
              {stage.id}
              <span className={styles.railDot} />
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}

/** The benchmarks of the stage the reader clicked; it closes on a choice, outside, on Escape, or once the page scrolls. */
export function StageChooser({ choice, onClose }: { choice: StageChoice | null; onClose: () => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!choice) {
      return;
    }
    addEventListener('scroll', onClose, { passive: true, once: true });
    return () => removeEventListener('scroll', onClose);
  }, [choice, onClose]);
  return (
    <Popover.Root open={choice !== null} onOpenChange={open => { if (!open) { onClose(); } }}>
      {choice && (
        <>
          <Popover.Anchor virtualRef={{ current: choice.anchor }} />
          <Popover.Portal>
            <Popover.Content className={clsx(hint.popover, styles.chooser)} side="bottom" sideOffset={8} collisionPadding={16}>
              <p className="t-micro c-faint">{t('lifecycle.benchmarksAt', { stage: stageName(choice.stage), count: choice.stage.benchmarks.length })}</p>
              {choice.stage.benchmarks.map(benchmark => (
                <LocaleLink key={benchmark.id} to={benchmarkPath(benchmark.id)} onClick={onClose}>{benchmark.name}<GoArrowIcon /></LocaleLink>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </>
      )}
    </Popover.Root>
  );
}
