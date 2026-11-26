import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimelineStep, TouchKind, WorldEvent, WorldLayer } from '../../api/types';
import { ArrowIcon, IconButton, SegmentedControl } from '../../ui/controls';
import { CHANGE_GLYPHS, CHANGE_PRECEDENCE, changeMarkOf } from './frame';
import { REPLAY_SPEEDS, type ReplaySpeed } from './playback';
import marks from './marks.module.css';
import styles from './ReplayPlayback.module.css';

/**
 * The replay's controls and its time: play, step back and forth, the speed, and a column per agent step with the
 * step's mark, a lane per layer for what the step did to it, and a lane for the world's events. Every column's mark
 * goes to its step; the steps still to come are faded.
 */
export function ReplayPlayback({ timeline, layers, layerTouches, events, current, last, playing, speed, onStep, onPlay, onSpeed, onPrevious, onNext }: {
  timeline: TimelineStep[];
  layers: WorldLayer[];
  layerTouches: Map<number, Map<string, TouchKind>>;
  events: Map<number, WorldEvent[]>;
  current: number;

  /** The trajectory's last step */
  last: number;

  playing: boolean;
  speed: ReplaySpeed;
  onStep: (step: number) => void;
  onPlay: (playing: boolean) => void;
  onSpeed: (speed: ReplaySpeed) => void;

  /** Absent at the trajectory's either end */
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const { t } = useTranslation();
  const later = (step: number) => (step > current ? '' : undefined);
  return (
    <section className={styles.playback} aria-label={t('console.replay.playback.label')}>
      <div className={styles.controls}>
        <IconButton label={t('console.replay.playback.previous')} onClick={() => onPrevious?.()} disabled={!onPrevious} variant="quiet"><ArrowIcon direction="left" /></IconButton>
        <IconButton label={t(playing ? 'console.replay.playback.pause' : 'console.replay.playback.play')} onClick={() => onPlay(!playing)} disabled={!playing && !onNext}>
          {/* Play points forward, so on hover it nudges the way it points, as the arrows do, instead of turning round. */}
          {playing
            ? <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3.5 2.5v7M8.5 2.5v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            : <svg viewBox="0 0 12 12" width="12" height="12" data-direction="right" aria-hidden="true"><path d="M3.5 2.2 9.8 6 3.5 9.8Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" /></svg>}
        </IconButton>
        <IconButton label={t('console.replay.playback.next')} onClick={() => onNext?.()} disabled={!onNext} variant="quiet"><ArrowIcon direction="right" /></IconButton>
        <SegmentedControl label={t('console.replay.playback.speed')} choices={REPLAY_SPEEDS.map(value => ({ value, label: `${value}×` }))} value={speed} onChange={onSpeed} />
      </div>
      <div className={styles.timeline} style={{ '--steps': timeline.length } as CSSProperties}>
        <span className="t-micro c-faint">{t('console.replay.playback.marks')}</span>
        {timeline.map(step => (
          <button
            key={step.stepId} type="button" className={styles.mark} data-mark={step.mark} data-later={later(step.stepId)}
            aria-current={step.stepId === current ? 'step' : undefined} aria-label={t('console.replay.playback.step', { step: step.stepId })} onClick={() => onStep(step.stepId)}
          />
        ))}
        {layers.map(layer => [
          <span key={layer.id} className="t-micro c-faint">{layer.name}</span>,
          ...timeline.map(step => (
            <span key={`${layer.id} ${step.stepId}`} className={styles.slot} data-later={later(step.stepId)}>
              <span className={marks.cell} data-kind={layerTouches.get(step.stepId)?.get(layer.id)} />
            </span>
          )),
        ])}
        <span className="t-micro c-faint">{t('console.replay.playback.events')}</span>
        {timeline.map(step => {
          const kinds = new Set((events.get(step.stepId) ?? []).map(event => changeMarkOf(event.change)));
          const shown = CHANGE_PRECEDENCE.find(kind => kinds.has(kind));
          return (
            <span key={`events ${step.stepId}`} className={styles.slot} data-later={later(step.stepId)}>
              {shown && <span className={marks.badge}>{CHANGE_GLYPHS[shown]}</span>}
            </span>
          );
        })}
      </div>
      <span className="t-micro c-muted">{t('console.replay.playback.position', { step: current, last })}</span>
    </section>
  );
}
