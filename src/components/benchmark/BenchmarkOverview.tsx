import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { combinationKey } from '../../api/constraints';
import type { EntrantResult, PendingWork, RunRow } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { useLocale } from '../../i18n/localeContext';
import { dateTimeOf, groupedNumber } from '../../i18n/locales';
import { consoleModelPath } from '../../routes/consoleModels';
import { PENDING_RUNS, consoleRunPath, consoleRunsPath } from '../../routes/consoleRuns';
import { InfoHint } from '../../ui/hint';
import table from '../../ui/table.module.css';
import { ModelLabel } from '../model/ModelBadge';
import { FailureClassTag } from '../result/FailureClassTag';
import { PassRate } from '../result/PassRate';
import { formatCost } from '../result/presentation';
import styles from './BenchmarkOverview.module.css';

/** Each combination's pass rate, how many tasks it always or ever solved, and what a run of it costs; a row opens the model in that harness. */
export function EntrantTable({ benchmarkId, entrants }: { benchmarkId: string; entrants: EntrantResult[] }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <div className={clsx(table.table, styles.entrants)} role="table" aria-label={t('console.overview.entrants')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">{t('console.overview.column.entrant')}</span>
        <span role="columnheader">{t('console.overview.column.passRate')}</span>
        <span role="columnheader">{t('console.overview.column.everyTime')}</span>
        <span role="columnheader">{t('console.overview.column.once')}</span>
        <span role="columnheader">{t('console.overview.column.cost')}</span>
        <span role="columnheader">{t('console.overview.column.steps')}</span>
      </div>
      {entrants.map(({ model, harness, result }) => (
        <div key={combinationKey(model.id, harness.id)} className={clsx(table.row, table.link)} role="row">
          <span role="cell" className={styles.entrant}>
            <LocaleLink className={table.primary} to={consoleModelPath(benchmarkId, model.id, { harness: harness.id })}><ModelLabel model={model} /></LocaleLink>
            <span className="t-small c-muted">{harness.name}</span>
          </span>
          <span role="cell"><PassRate rate={result.passRate} /></span>
          <span role="cell" className="t-numeric c-muted">{t('console.overview.tasksOf', { solved: result.solvedEveryTime, total: result.tasks })}</span>
          <span role="cell" className="t-numeric c-muted">{t('console.overview.tasksOf', { solved: result.solvedOnce, total: result.tasks })}</span>
          <span role="cell" className="t-numeric c-muted">{result.meanCostUsd === undefined ? '—' : formatCost(result.meanCostUsd)}</span>
          <span role="cell" className="t-numeric c-muted">{result.meanSteps === undefined ? '—' : groupedNumber(locale, Math.round(result.meanSteps))}</span>
        </div>
      ))}
    </div>
  );
}

export function RecentFailure({ benchmarkId, run }: { benchmarkId: string; run: RunRow }) {
  const locale = useLocale();
  return (
    <li>
      <LocaleLink className={styles.failure} to={consoleRunPath(benchmarkId, run.id)}>
        <span className={styles.who}><ModelLabel model={run.model} /><span className="t-small c-muted">{run.harness.name}</span></span>
        <span className="t-small"><span className="t-mono c-faint">{run.task.id}</span> {run.task.title}</span>
        <span className={styles.meta}><FailureClassTag failureClass={run.failureClass} /><span className="t-mono c-faint">{dateTimeOf(locale, run.finishedAt)}</span></span>
      </LocaleLink>
    </li>
  );
}

/** A kind of work waiting, which opens the runs it waits on, with the ⓘ that says what doing it involves. */
export function PendingItem({ benchmarkId, work }: { benchmarkId: string; work: PendingWork }) {
  const { t } = useTranslation();
  const title = t(`console.overview.pendingKind.${work.kind}.title`, { count: work.count });
  return (
    <li className={styles.pending}>
      <LocaleLink className="t-label" to={consoleRunsPath(benchmarkId, PENDING_RUNS[work.kind])}>{title}</LocaleLink>
      <InfoHint label={t('ui.about', { subject: title })}>{t(`console.overview.pendingKind.${work.kind}.body`)}</InfoHint>
    </li>
  );
}
