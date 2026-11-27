import { NO_VALUE, formatRate } from './presentation';
import { ScoreBar } from './ScoreBar';
import styles from './PassRate.module.css';

/** A pass rate as a bar and a percentage; a dash while no run counts. */
export function PassRate({ rate }: { rate: number | undefined }) {
  return rate === undefined
    ? <span className="t-numeric c-faint">{NO_VALUE}</span>
    : <span className={styles.rate}><ScoreBar score={rate} /><span className="t-numeric">{formatRate(rate)}</span></span>;
}
