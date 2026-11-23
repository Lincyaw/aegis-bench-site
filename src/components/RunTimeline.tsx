import type { TimelineLegend, TimelineMark } from '../api/client';
import styles from './RunTimeline.module.css';

/** A run as a row of marks, one per agent step: ordinary steps, the benchmark's key action, and submissions. */
export function RunTimeline({ marks, current, onSelect }: { marks: TimelineMark[]; current?: number; onSelect?: (index: number) => void }) {
  return (
    <span className={styles.timeline} aria-hidden={onSelect ? undefined : true}>
      {marks.map((mark, index) => (
        onSelect
          ? <button key={index} type="button" className={`${styles.mark} ${styles[mark]} ${current === index ? styles.current : ''}`} onClick={() => onSelect(index)} aria-label={`第 ${index + 2} 步`} />
          : <span key={index} className={`${styles.mark} ${styles[mark]}`} />
      ))}
    </span>
  );
}

export function TimelineLegendRow({ legend }: { legend: TimelineLegend }) {
  const marks: TimelineMark[] = ['action', 'change', 'submitPassed', 'submitFailed'];
  return (
    <ul className={`${styles.legend} t-micro c-faint`}>
      {marks.map(mark => <li key={mark}><span className={`${styles.mark} ${styles[mark]}`} />{legend[mark]}</li>)}
    </ul>
  );
}
