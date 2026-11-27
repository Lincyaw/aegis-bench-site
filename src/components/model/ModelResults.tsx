import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { HarnessResult, ModelTaskQuery, ModelTaskRow } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { consoleModelPath } from '../../routes/consoleModels';
import { consoleRunPath } from '../../routes/consoleRuns';
import { consoleTaskPath } from '../../routes/consoleTasks';
import table from '../../ui/table.module.css';
import { FailureBar } from '../result/FailureBar';
import { PassRate } from '../result/PassRate';
import { NO_VALUE, formatCost } from '../result/presentation';
import { OutcomeDot } from '../run/Outcome';
import styles from './ModelResults.module.css';

/** The model's result with each harness; a row narrows the page to that harness and keeps the page's other filters. */
export function HarnessTable({ benchmarkId, modelId, query, results }: { benchmarkId: string; modelId: string; query: ModelTaskQuery; results: HarnessResult[] }) {
  const { t } = useTranslation();
  return (
    <div className={clsx(table.table, styles.harnesses)} role="table" aria-label={t('console.model.byHarness')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">{t('console.model.harnessLabel')}</span>
        <span role="columnheader">{t('console.models.column.passRate')}</span>
        <span role="columnheader">{t('console.models.column.everyTime')}</span>
        <span role="columnheader">{t('console.models.column.once')}</span>
        <span role="columnheader">{t('console.models.column.cost')}</span>
        <span role="columnheader">{t('console.models.column.failures')}</span>
      </div>
      {results.map(({ harness, result }) => (
        <div key={harness.id} className={clsx(table.row, table.link)} role="row" aria-current={harness.id === query.harness ? 'true' : undefined}>
          <span role="cell" className="t-label">
            <LocaleLink className={table.primary} to={consoleModelPath(benchmarkId, modelId, { ...query, offset: 0, harness: harness.id })} replace preventScrollReset>{harness.name}</LocaleLink>
          </span>
          <span role="cell"><PassRate rate={result.passRate} /></span>
          <span role="cell" className="t-numeric c-muted">{t('console.overview.tasksOf', { solved: result.solvedEveryTime, total: result.tasks })}</span>
          <span role="cell" className="t-numeric c-muted">{t('console.overview.tasksOf', { solved: result.solvedOnce, total: result.tasks })}</span>
          <span role="cell" className="t-numeric c-muted">{result.meanCostUsd === undefined ? NO_VALUE : formatCost(result.meanCostUsd)}</span>
          <span role="cell"><FailureBar result={result} /></span>
        </div>
      ))}
    </div>
  );
}

/** The model's runs on each task, grouped by harness; each dot opens its run. */
export function ModelTaskTable({ benchmarkId, modelId, harness, rows }: { benchmarkId: string; modelId: string; harness: string | undefined; rows: ModelTaskRow[] }) {
  const { t } = useTranslation();
  return (
    <div className={clsx(table.table, styles.tasks)} role="table" aria-label={t('console.model.tasks')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">{t('console.model.column.task')}</span>
        <span role="columnheader">{t('console.model.column.runs')}</span>
        <span role="columnheader">{t('console.model.column.passRate')}</span>
        <span role="columnheader">{t('console.model.column.failures')}</span>
      </div>
      {rows.map(row => (
        <div key={row.task.id} className={table.row} role="row">
          <span role="cell" className={styles.task}><LocaleLink to={consoleTaskPath(benchmarkId, row.task.id, { tab: 'runs', model: modelId, harness })} className="t-label">{row.task.title}</LocaleLink><span className="t-mono c-faint">{row.task.id}</span></span>
          <span role="cell" className={styles.runGroups}>
            {[...Map.groupBy(row.runs, run => run.harness.id).values()].map(runs => (
              <span key={runs[0].harness.id} className={styles.runGroup}>
                {runs.map(run => {
                  const label = t('console.model.runOf', { harness: run.harness.name, attempt: run.attempt, outcome: t(`runs.outcome.${run.outcome}`) });
                  return <LocaleLink key={run.id} className={styles.runDot} to={consoleRunPath(benchmarkId, run.id)} title={label} aria-label={label}><OutcomeDot outcome={run.outcome} /></LocaleLink>;
                })}
              </span>
            ))}
          </span>
          <span role="cell"><PassRate rate={row.result.passRate} /></span>
          <span role="cell"><FailureBar result={row.result} /></span>
        </div>
      ))}
    </div>
  );
}
