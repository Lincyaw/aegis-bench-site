import { clsx } from 'clsx';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { ResultCounts } from '../../api/types';
import { useLocale } from '../../i18n/localeContext';
import { groupedNumber } from '../../i18n/locales';
import { FAILURE_KINDS, failureCountOf, type FailureKind } from './presentation';
import styles from './FailureBar.module.css';

/** A set of runs' failures stacked by kind, with the number of failures beside; the label spells every count out. */
export function FailureBar({ result }: { result: ResultCounts }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const label = FAILURE_KINDS.map(kind => `${t(`console.failureClass.${kind}`)} ${failureCountOf(result, kind)}`).join(' · ');
  return (
    <span className={styles.failures} title={label} role="img" aria-label={label}>
      <span className={styles.bar}>
        {result.failed > 0 && FAILURE_KINDS.map(kind => <span key={kind} className={styles.kind} data-kind={kind} style={{ '--share': failureCountOf(result, kind) / result.failed } as CSSProperties} />)}
      </span>
      <span className="t-numeric c-muted">{groupedNumber(locale, result.failed)}</span>
    </span>
  );
}

/** A stretch of a bar that stacks failures: one kind in its colour, as wide as its `count` among its neighbours. */
export function FailureSegment({ kind, count, label, className }: { kind: FailureKind; count: number; label: string; className?: string }) {
  return <span className={clsx(styles.kind, className)} data-kind={kind} style={{ flexGrow: count }} title={label} aria-label={label} />;
}

/** What each colour of a failure bar stands for. */
export function FailureLegend() {
  const { t } = useTranslation();
  return (
    <span className={styles.legend}>
      {FAILURE_KINDS.map(kind => <span key={kind} className="t-micro c-muted"><span className={clsx(styles.kind, styles.swatch)} data-kind={kind} aria-hidden="true" />{t(`console.failureClass.${kind}`)}</span>)}
    </span>
  );
}
