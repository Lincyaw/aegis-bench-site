import { clsx } from 'clsx';
import { Suspense, type ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
import { useBenchmarks, useRun } from '../api/client';
import { HuggingFaceUnreachableError } from '../api/errors';
import type { RunDetail } from '../api/types';
import { ModelLabel } from '../components/model/ModelBadge';
import { formatCost } from '../components/result/presentation';
import { OutcomeBadge } from '../components/run/Outcome';
import { RunTimeline } from '../components/run/RunTimeline';
import { LocaleLink } from '../i18n/LocaleRouting';
import { useLocale } from '../i18n/localeContext';
import { groupedNumber } from '../i18n/locales';
import { runRecordsPath } from '../routes/runRecords';
import content from '../ui/content.module.css';
import styles from './runBlocks.module.css';

/*
 * The blocks a report cites its runs with, each reading the run from the public API: a run's replay as a card, and one
 * of its figures inside a sentence. A run id that names no run, or a run whose record cannot be read from Hugging Face,
 * is said where the block stands, so the rest of the report still reads.
 */

/** The figures of a run a report can quote. */
export type RunFigureField = 'steps' | 'durationMinutes' | 'outputTokens' | 'costUsd';

/** A run's model, task, outcome and step timeline, opening the run's record. */
export function Replay({ run }: { run: string }) {
  return <RunBlock run={run}>{detail => <ReplayCard detail={detail} />}</RunBlock>;
}

/** One figure of a run, such as its steps, set inside a sentence. */
export function RunNumber({ run, field }: { run: string; field: RunFigureField }) {
  const locale = useLocale();
  return <RunBlock run={run}>{detail => <span className="t-numeric">{field === 'costUsd' ? formatCost(detail.metrics.costUsd) : groupedNumber(locale, detail.metrics[field])}</span>}</RunBlock>;
}

/** Reads the run a block cites, saying so in place while it loads, when the id is empty and when it names no run. */
export function RunBlock({ run, children }: { run: string; children: (detail: RunDetail) => ReactNode }) {
  const { t } = useTranslation();
  return run === ''
    ? <span className="t-small c-bad">{t('reports.run.empty')}</span>
    : (
      <ErrorBoundary
        resetKeys={[run]}
        fallbackRender={({ error }) => (error instanceof HuggingFaceUnreachableError
          ? <span className="t-small c-faint">{t('reports.run.unreachable')} <a className="c-main" href={error.huggingFaceUrl} target="_blank" rel="noreferrer">{t('ui.openOnHuggingFace')}</a></span>
          : <span className="t-small c-bad">{t('reports.run.missing', { run })}</span>)}
      >
        <Suspense fallback={<span className="t-small c-faint">{t('reports.run.loading')}</span>}><RunOf run={run}>{children}</RunOf></Suspense>
      </ErrorBoundary>
    );
}

export function RunOf({ run, children }: { run: string; children: (detail: RunDetail) => ReactNode }) {
  return children(useRun(run));
}

export function ReplayCard({ detail }: { detail: RunDetail }) {
  const { t } = useTranslation();
  const benchmark = useBenchmarks().find(candidate => candidate.id === detail.benchmark.id);
  if (!benchmark) {
    throw new Error(`run ${detail.id} names benchmark ${detail.benchmark.id}, which the site does not list`);
  }
  return (
    <span className={clsx(content.panel, styles.replay)} data-half={benchmark.stage.half}>
      <span className={styles.head}>
        <ModelLabel model={detail.model} />
        <span className="t-small c-muted">{detail.harness.name}</span>
        <OutcomeBadge outcome={detail.outcome} />
      </span>
      <RunTimeline timeline={detail.timeline} />
      <span className={styles.foot}>
        <span className="t-small"><span className="t-mono c-faint">{detail.task.id}</span> {detail.task.title}</span>
        <LocaleLink className="t-small" to={runRecordsPath(detail.benchmark.id, { task: detail.task.id, run: detail.id, tab: 'trajectory' })}>{t('reports.run.open')}</LocaleLink>
      </span>
    </span>
  );
}
