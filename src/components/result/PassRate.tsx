import { useTranslation } from 'react-i18next';
import type { EntrantMark } from '../../api/types';
import { OutcomeDot } from '../run/Outcome';
import { formatRate } from './presentation';
import { ScoreBar } from './ScoreBar';
import styles from './PassRate.module.css';

/** A pass rate as a bar and a percentage; a dash while no run counts. */
export function PassRate({ rate }: { rate: number | undefined }) {
  return rate === undefined
    ? <span className="t-numeric c-faint">—</span>
    : <span className={styles.rate}><ScoreBar score={rate} /><span className="t-numeric">{formatRate(rate)}</span></span>;
}

/** One dot per combination: filled when it passed at least once, a ring when it never did. */
export function EntrantDots({ entrants }: { entrants: EntrantMark[] }) {
  const { t } = useTranslation();
  return (
    <span className={styles.dots}>
      {entrants.map(({ model, harness, solved }) => {
        const entrant = `${model.name} · ${harness.name}`;
        const label = solved ? t('console.tasks.entrantSolved', { entrant }) : t('console.tasks.entrantUnsolved', { entrant });
        return <span key={`${model.id}-${harness.id}`} className={styles.dot} title={label} role="img" aria-label={label}><OutcomeDot outcome={solved ? 'passed' : 'failed'} /></span>;
      })}
    </span>
  );
}
