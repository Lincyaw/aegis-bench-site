import * as Popover from '@radix-ui/react-popover';
import { clsx } from 'clsx';
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBenchmarks, useStages, type Stage } from '../api/client';
import { halfValues } from '../api/schema';
import { LocaleLink } from '../i18n/LocaleRouting';
import { useLocalizedNavigate } from '../i18n/localeContext';
import { HALF_LABELS, benchmarkNames, benchmarksAt } from '../lifecycle/stages';
import { SiteNav } from '../site/SiteLayout';
import { benchmarkPath } from '../site/siteMap';
import { PART } from './landingMarkup';
import { LandingMotion } from './landingMotion';
import { Closing, Hero, LifecycleIntro, StagePanel, Updates } from './LandingSections';
import { VignetteCard } from './Vignettes';
import styles from './LandingPage.module.css';

/** A stage with several benchmarks asks which one to open, next to whatever the reader clicked. */
interface StageChoice {
  stage: Stage;
  anchor: HTMLElement;
}

/**
 * The landing page: the lifecycle as an infinity loop that starts as smoke behind the title, condenses into a line,
 * visits each stage with a small scene of what it is, and settles into the mark at the end.
 */
export function LandingPage() {
  const stages = useStages();
  const benchmarks = useBenchmarks();
  const navigate = useLocalizedNavigate();
  const root = useRef<HTMLDivElement>(null);
  const motion = useRef<LandingMotion | null>(null);
  const [currentStage, setCurrentStage] = useState<number | null>(null);
  const [choice, setChoice] = useState<StageChoice | null>(null);
  const closeChoice = useCallback(() => setChoice(null), []);
  useLayoutEffect(() => {
    if (!root.current) {
      throw new Error('The landing page is not rendered');
    }
    const mounted = new LandingMotion(root.current, stages, setCurrentStage);
    motion.current = mounted;
    return () => {
      mounted.unmount();
      motion.current = null;
    };
  }, [stages]);
  const openStage = (stage: Stage, anchor: HTMLElement) => {
    if (stage.benchmarks.length === 1) {
      navigate(benchmarkPath(stage.benchmarks[0].id));
    } else {
      setChoice({ stage, anchor });
    }
  };
  const scrollToStage = (index: number) => {
    if (!motion.current) {
      throw new Error('The landing motion is not mounted');
    }
    motion.current.scrollToStage(index);
  };
  return (
    <div ref={root}>
      <LoopBackdrop stages={stages} onOpenStage={openStage} />
      <SiteNav sections={null} />
      <StageRail stages={stages} current={currentStage} onSelect={scrollToStage} />
      <main className={styles.main}>
        <Hero benchmarks={benchmarks} />
        <LifecycleIntro />
        {stages.map((stage, index) => <StagePanel key={stage.id} stage={stage} index={index} benchmarks={benchmarksAt(stage, benchmarks)} />)}
        <Updates />
        <Closing />
      </main>
      <StageChooser choice={choice} onClose={closeChoice} />
    </div>
  );
}

/** The layers the motion drives behind and over the copy: the canvas, the veils, the stations' labels and hotspots, and the scene cards. */
export function LoopBackdrop({ stages, onOpenStage }: { stages: Stage[]; onOpenStage: (stage: Stage, anchor: HTMLElement) => void }) {
  const { t } = useTranslation();
  return (
    <>
      <canvas className={styles.scene} data-part={PART.scene} aria-hidden="true" />
      <div className={clsx(styles.veil, styles.veilSide)} data-part={PART.veilSide} aria-hidden="true" />
      <div className={clsx(styles.veil, styles.veilDim)} data-part={PART.veilDim} aria-hidden="true" />
      <div className={clsx(styles.veil, styles.veilHero)} data-part={PART.veilHero} aria-hidden="true" />
      <svg className={styles.tether} aria-hidden="true"><line data-part={PART.tether} /></svg>
      <div className={styles.overlay} aria-hidden="true">
        {stages.map(stage => <StationMarker key={stage.id} stage={stage} onOpen={anchor => onOpenStage(stage, anchor)} />)}
        {halfValues.map(half => (
          <div key={half} className={styles.lobe} data-part={PART.lobe} data-half={half}>
            <strong>{t(HALF_LABELS[half])}</strong>
            <span>{t(`landing.halfCode.${half}`)}</span>
          </div>
        ))}
      </div>
      <div className={styles.overlay} aria-hidden="true">
        {stages.map((stage, index) => <VignetteCard key={stage.id} stage={stage} index={index} onOpen={anchor => onOpenStage(stage, anchor)} />)}
      </div>
    </>
  );
}

/** A station's label on the map, and the hotspot over its node that opens its benchmarks or says it is still being built. */
export function StationMarker({ stage, onOpen }: { stage: Stage; onOpen: (anchor: HTMLElement) => void }) {
  const { t } = useTranslation();
  const covered = stage.benchmarks.length > 0;
  const open = covered ? (event: { currentTarget: HTMLElement }) => onOpen(event.currentTarget) : undefined;
  return (
    <>
      <div className={clsx(styles.stationLabel, !covered && styles.planned)} data-part={PART.stationLabel} onClick={open}><b>{stage.id}</b>{stage.name}</div>
      <button
        type="button"
        tabIndex={-1}
        className={clsx(styles.hotspot, !covered && styles.planned)}
        data-part={PART.hotspot}
        data-half={stage.half}
        data-tip={covered ? `${benchmarkNames(stage)} →` : t('landing.building')}
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
              aria-label={`${stage.id} ${stage.name}${state}`}
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
            <Popover.Content className={styles.chooser} side="bottom" sideOffset={8} collisionPadding={16}>
              <p className="t-micro c-faint">{t('lifecycle.benchmarksAt', { stage: `${choice.stage.id} ${choice.stage.name}`, count: choice.stage.benchmarks.length })}</p>
              {choice.stage.benchmarks.map(benchmark => (
                <LocaleLink key={benchmark.id} to={benchmarkPath(benchmark.id)} onClick={onClose}>{benchmark.name}</LocaleLink>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </>
      )}
    </Popover.Root>
  );
}
