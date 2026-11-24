import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { TimelineLegend, TimelineMark } from '../api/client';
import { timelineMarkValues } from '../api/schema';
import styles from './RunTimeline.module.css';

/** A run as a row of marks, one per agent step: ordinary steps, the benchmark's key action, and submissions. */
export function RunTimeline({ marks }: { marks: TimelineMark[] }) {
  return (
    <span className={styles.timeline} aria-hidden="true">
      {marks.map((mark, index) => <span key={index} className={clsx(styles.mark, styles[mark])} />)}
    </span>
  );
}

/** The timeline as controls: each mark selects its step, and the current step stands out. */
export function RunScrubber({ marks, stepIds, current, onSelect }: { marks: TimelineMark[]; stepIds: number[]; current: number | undefined; onSelect: (stepId: number) => void }) {
  const { t } = useTranslation();
  return (
    <span className={styles.timeline}>
      {marks.map((mark, index) => (
        <button key={stepIds[index]} type="button" className={clsx(styles.mark, styles[mark], stepIds[index] === current && styles.current)} onClick={() => onSelect(stepIds[index])} aria-label={t('runs.step', { step: stepIds[index] })} />
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
