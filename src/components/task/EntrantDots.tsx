import { useTranslation } from 'react-i18next';
import { combinationKey } from '../../api/constraints';
import type { EntrantMark } from '../../api/types';
import { OutcomeDot } from '../run/Outcome';
import { combinationName } from '../result/presentation';
import styles from './EntrantDots.module.css';

/** One dot per combination: filled when it passed at least once, a ring when it never did. */
export function EntrantDots({ entrants }: { entrants: EntrantMark[] }) {
  const { t } = useTranslation();
  return (
    <span className={styles.dots}>
      {entrants.map(({ model, harness, solved }) => {
        const entrant = combinationName(model, harness);
        const label = solved ? t('console.tasks.entrantSolved', { entrant }) : t('console.tasks.entrantUnsolved', { entrant });
        return <span key={combinationKey(model.id, harness.id)} className={styles.dot} title={label} role="img" aria-label={label}><OutcomeDot outcome={solved ? 'passed' : 'failed'} /></span>;
      })}
    </span>
  );
}
