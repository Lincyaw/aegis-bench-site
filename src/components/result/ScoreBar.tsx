import styles from './ScoreBar.module.css';

/** A horizontal score bar; percent and ratio scores both fill against 1. */
export function ScoreBar({ score }: { score: number }) {
  return <span className={styles.bar} aria-hidden="true"><span style={{ width: `${Math.min(1, score) * 100}%` }} /></span>;
}
