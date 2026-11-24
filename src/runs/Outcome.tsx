import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { RunOutcome } from '../api/client';
import styles from './Outcome.module.css';

/** A run's outcome as a dot: filled when passed, a ring when failed, dashed when the run did not count. */
export function OutcomeDot({ outcome }: { outcome: RunOutcome }) {
  return <span className={clsx(styles.dot, styles[outcome])} aria-hidden="true" />;
}

/** A run's outcome as a tinted label, beside the run's title. */
export function OutcomeBadge({ outcome }: { outcome: RunOutcome }) {
  const { t } = useTranslation();
  return <span className={clsx(styles.badge, styles[outcome], 't-micro')}><OutcomeDot outcome={outcome} />{t(`runs.outcome.${outcome}`)}</span>;
}

/** A dot and a text in the outcome's colour, such as a check's verdict or a run's result in a benchmark's words. */
export function OutcomeText({ outcome, children }: { outcome: RunOutcome; children: ReactNode }) {
  return <span className={clsx(styles.text, styles[outcome])}><OutcomeDot outcome={outcome} />{children}</span>;
}
