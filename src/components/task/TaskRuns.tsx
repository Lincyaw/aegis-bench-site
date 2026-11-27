import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { combinationKey } from '../../api/constraints';
import type { TaskEntrantRuns, ValidationRun } from '../../api/types';
import { useLocale } from '../../i18n/localeContext';
import { dateTimeOf } from '../../i18n/locales';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { consoleRunPath } from '../../routes/consoleRuns';
import { Tag } from '../../ui/content';
import table from '../../ui/table.module.css';
import { ModelLabel } from '../model/ModelBadge';
import { PassRate } from '../result/PassRate';
import { OutcomeBadge, OutcomeDot } from '../run/Outcome';
import styles from './TaskRuns.module.css';

/** Each combination's runs of a task as dots that open them, with how many passed, failed to execute and were reviewed. */
export function EntrantRunsTable({ benchmarkId, entrants }: { benchmarkId: string; entrants: TaskEntrantRuns[] }) {
  const { t } = useTranslation();
  return (
    <div className={clsx(table.table, styles.entrantRuns)} role="table" aria-label={t('console.task.runs.view.entrants')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">{t('console.task.runs.column.entrant')}</span>
        <span role="columnheader">{t('console.task.runs.column.runs')}</span>
        <span role="columnheader">{t('console.task.runs.column.passed')}</span>
        <span role="columnheader">{t('console.task.runs.column.executionFailed')}</span>
        <span role="columnheader">{t('console.task.runs.column.passRate')}</span>
        <span role="columnheader">{t('console.task.runs.column.review')}</span>
      </div>
      {entrants.map(entrant => <EntrantRunsRow key={combinationKey(entrant.model.id, entrant.harness.id)} benchmarkId={benchmarkId} entrant={entrant} />)}
    </div>
  );
}

export function EntrantRunsRow({ benchmarkId, entrant }: { benchmarkId: string; entrant: TaskEntrantRuns }) {
  const { t } = useTranslation();
  const { result } = entrant;
  const reviewed = result.failed - result.unreviewed;
  return (
    <div className={table.row} role="row">
      <span role="cell" className={styles.entrant}><ModelLabel model={entrant.model} /><span className="t-small c-muted">{entrant.harness.name}</span></span>
      <span role="cell" className={styles.runDots}>
        {entrant.runs.map(run => {
          const label = t('console.task.runs.runOf', { attempt: run.attempt, outcome: t(`runs.outcome.${run.outcome}`) });
          return <LocaleLink key={run.id} className={styles.runDot} to={consoleRunPath(benchmarkId, run.id)} title={label} aria-label={label}><OutcomeDot outcome={run.outcome} /></LocaleLink>;
        })}
      </span>
      <span role="cell" className="t-numeric">{result.passed}</span>
      <span role="cell" className="t-numeric c-muted">{result.executionFailed}</span>
      <span role="cell"><PassRate rate={result.passRate} /></span>
      <span role="cell" className="t-micro c-muted">{result.failed === 0 ? t('console.task.runs.noFailure') : t('console.task.runs.reviewed', { reviewed, failed: result.failed })}</span>
    </div>
  );
}

export function ValidationRow({ run }: { run: ValidationRun }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <li className={styles.validation}>
      <span className={styles.validationAgent}>
        <span className="t-label">{t(`console.task.runs.agent.${run.agent}`)}</span>
        <span className="t-micro c-muted">{t(`console.task.runs.agentNote.${run.agent}`)}</span>
      </span>
      <OutcomeBadge outcome={run.outcome} />
      <Tag dashed={!run.expected}>{run.expected ? t('console.task.runs.expected') : t('console.task.runs.unexpected')}</Tag>
      <span className="t-mono c-faint">{run.version} · {dateTimeOf(locale, run.finishedAt)}</span>
    </li>
  );
}
