import { clsx } from 'clsx';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useTaskCheckResults, useTaskResults } from '../api/consoleClient';
import type { ConsoleTaskDetail, TaskEntrantRuns, ValidationRun } from '../api/types';
import { useLocale } from '../i18n/localeContext';
import { dateTimeOf } from '../i18n/locales';
import { LocaleLink } from '../i18n/LocaleRouting';
import { ModelLabel } from '../models/ModelBadge';
import { PassRate } from '../results/PassRate';
import { consoleRunPath, consoleRunsPath } from '../runs/consoleRunQuery';
import { OutcomeBadge, OutcomeDot } from '../runs/Outcome';
import { combinationKey } from '../runs/runRecordsQuery';
import { Tag } from '../ui/content';
import content from '../ui/content.module.css';
import { SegmentedControl } from '../ui/controls';
import controls from '../ui/controls.module.css';
import table from '../ui/table.module.css';
import { TASK_RUN_VIEWS, inFocus, taskPageSearch, type TaskFocus, type TaskPageView } from './consoleTaskQuery';
import styles from './TaskDetailPage.module.css';

/** A task's runs, by combination or by check, of the combinations the page keeps to, and the runs that check the task itself. */
export function TaskRunsTab({ task, view }: { task: ConsoleTaskDetail; view: TaskPageView }) {
  const { t } = useTranslation();
  const [, setParams] = useSearchParams();
  // The run list narrows to the combination when the page keeps to one; it has no filter for a model alone.
  const combination = view.model && view.harness ? combinationKey(view.model, view.harness) : undefined;
  return (
    <div className={styles.section}>
      <div className={styles.switch}>
        <SegmentedControl
          label={t('console.task.runs.viewLabel')} value={view.view}
          choices={TASK_RUN_VIEWS.map(choice => ({ value: choice, label: t(`console.task.runs.view.${choice}`) }))}
          onChange={next => setParams(taskPageSearch({ ...view, tab: 'runs', view: next }), { replace: true, preventScrollReset: true })}
        />
      </div>
      {view.view === 'entrants' ? <EntrantRuns task={task} focus={view} /> : <CheckMatrix task={task} focus={view} />}
      <LocaleLink className={clsx(controls.textLink, 't-small')} to={consoleRunsPath(task.benchmark.id, { q: task.id, combination })}>{t('console.task.allRuns')}</LocaleLink>
    </div>
  );
}

export function EntrantRuns({ task, focus }: { task: ConsoleTaskDetail; focus: TaskFocus }) {
  const { t } = useTranslation();
  const results = useTaskResults(task.benchmark.id, task.id);
  return (
    <>
      <div className={clsx(table.table, styles.entrantRuns)} role="table" aria-label={t('console.task.runs.view.entrants')}>
        <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
          <span role="columnheader">{t('console.task.runs.column.entrant')}</span>
          <span role="columnheader">{t('console.task.runs.column.runs')}</span>
          <span role="columnheader">{t('console.task.runs.column.passed')}</span>
          <span role="columnheader">{t('console.task.runs.column.executionFailed')}</span>
          <span role="columnheader">{t('console.task.runs.column.passRate')}</span>
          <span role="columnheader">{t('console.task.runs.column.review')}</span>
        </div>
        {results.entrants.filter(entrant => inFocus(focus, entrant)).map(entrant => <EntrantRunsRow key={`${entrant.model.id}-${entrant.harness.id}`} benchmarkId={task.benchmark.id} entrant={entrant} />)}
      </div>
      <section className={clsx(content.panel, styles.panel)}>
        <h2 className="t-heading">{t('console.task.runs.validations')}</h2>
        <p className="t-micro c-faint">{t('console.task.runs.validationsNote')}</p>
        <ul className={styles.validations}>{results.validations.map(run => <ValidationRow key={run.agent} run={run} />)}</ul>
      </section>
    </>
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

/** Each check against each combination; the cells darken with the share of counted runs that failed the check. */
export function CheckMatrix({ task, focus }: { task: ConsoleTaskDetail; focus: TaskFocus }) {
  const { t } = useTranslation();
  const results = useTaskCheckResults(task.benchmark.id, task.id);
  // A check's counts follow the entrants' order, so the columns kept are picked by position.
  const kept = results.entrants.flatMap((entrant, index) => (inFocus(focus, entrant) ? [index] : []));
  const columns = { '--columns': `minmax(14rem, 1.6fr) repeat(${kept.length}, minmax(3.5rem, 1fr))` } as CSSProperties;
  return (
    <>
      <div className={styles.matrixScroll}>
        <div className={clsx(table.table, styles.matrix)} style={columns} role="table" aria-label={t('console.task.runs.view.checks')}>
          <div className={clsx(table.row, table.head)} role="row">
            <span role="columnheader" />
            {kept.map(index => {
              const { model, harness } = results.entrants[index];
              return (
                <span key={`${model.id}-${harness.id}`} role="columnheader" className={styles.matrixHead}>
                  <span className="t-micro">{model.name}</span><span className="t-micro c-faint">{harness.name}</span>
                </span>
              );
            })}
          </div>
          {results.checks.map(check => (
            <div key={check.id} className={table.row} role="row">
              <span role="rowheader" className={styles.matrixCheck}><span className="t-mono c-faint">{check.id}</span><span className="t-small">{check.title}</span></span>
              {kept.map(index => {
                const { passed, counted } = check.byEntrant[index];
                return (
                  <span
                    key={`${results.entrants[index].model.id}-${results.entrants[index].harness.id}`} role="cell" className={clsx(styles.cell, 't-micro')}
                    style={{ '--share': counted === 0 ? 0 : (counted - passed) / counted } as CSSProperties}
                  >
                    {passed} / {counted}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="t-micro c-faint">{t('console.task.runs.checksNote')}</p>
    </>
  );
}
