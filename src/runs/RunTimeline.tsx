import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { TimelineLegend, TimelineStep } from '../api/client';
import { timelineMarkValues } from '../api/schema';
import styles from './RunTimeline.module.css';

/** A run as a row of marks, one per agent step as the server marked it: ordinary steps, the benchmark's key action, and submissions. */
export function RunTimeline({ timeline }: { timeline: TimelineStep[] }) {
  return (
    <span className={styles.timeline} aria-hidden="true">
      {timeline.map(step => <span key={step.stepId} className={clsx(styles.mark, styles[step.mark])} />)}
    </span>
  );
}

/** The timeline as controls: each mark selects its step, and the current step stands out. */
export function RunScrubber({ timeline, current, onSelect }: { timeline: TimelineStep[]; current: number | undefined; onSelect: (stepId: number) => void }) {
  const { t } = useTranslation();
  return (
    <span className={styles.timeline}>
      {timeline.map(step => (
        <button key={step.stepId} type="button" className={clsx(styles.mark, styles[step.mark], step.stepId === current && styles.current)} onClick={() => onSelect(step.stepId)} aria-label={t('runs.step', { step: step.stepId })} />
      ))}
    </span>
  );
}

export function TimelineLegendRow({ legend }: { legend: TimelineLegend }) {
  return (
    <ul className={clsx(styles.legend, 't-micro c-faint')}>
      {timelineMarkValues.map(mark => <li key={mark}><span className={clsx(styles.mark, styles[mark])} />{legend[mark]}</li>)}
    </ul>
  );
}
