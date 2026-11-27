import { clsx } from 'clsx';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useTaskCheckResults, useTaskResults } from '../../../api/consoleClient';
import { combinationKey } from '../../../api/constraints';
import type { CombinationScope, ConsoleTaskDetail } from '../../../api/types';
import { EntrantRunsRow, ValidationRow } from '../../../components/task/TaskRuns';
import { searchOf } from '../../../routes/address';
import { consoleRunsPath } from '../../../routes/consoleRuns';
import { TASK_PAGE_PARAMS, TASK_RUN_VIEWS, type TaskPageView } from '../../../routes/consoleTasks';
import { HintedHeading } from '../../../ui/content';
import content from '../../../ui/content.module.css';
import { SegmentedControl, TextLink } from '../../../ui/controls';
import { InfoHint } from '../../../ui/hint';
import table from '../../../ui/table.module.css';
import styles from './TaskDetailPage.module.css';

/** A task's runs, by combination or by check, of the combinations the page keeps to, and the runs that check the task itself. */
export function TaskRunsTab({ task, view }: { task: ConsoleTaskDetail; view: TaskPageView }) {
  const { t } = useTranslation();
  const [, setParams] = useSearchParams();
  return (
    <div className={styles.section}>
      <div className={styles.switch}>
        <SegmentedControl
          label={t('console.task.runs.viewLabel')} value={view.view}
          choices={TASK_RUN_VIEWS.map(choice => ({ value: choice, label: t(`console.task.runs.view.${choice}`) }))}
          onChange={next => setParams(searchOf(TASK_PAGE_PARAMS, { ...view, tab: 'runs', view: next }), { replace: true, preventScrollReset: true })}
        />
      </div>
      {view.view === 'entrants' ? <EntrantRuns task={task} scope={view} /> : <CheckMatrix task={task} scope={view} />}
      <TextLink className="t-small" to={consoleRunsPath(task.benchmark.id, { task: task.id, model: view.model, harness: view.harness })}>
        {t('console.task.allRuns')}
      </TextLink>
    </div>
  );
}

export function EntrantRuns({ task, scope }: { task: ConsoleTaskDetail; scope: CombinationScope }) {
  const { t } = useTranslation();
  const results = useTaskResults(task.benchmark.id, task.id, scope);
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
        {results.entrants.map(entrant => <EntrantRunsRow key={combinationKey(entrant.model.id, entrant.harness.id)} benchmarkId={task.benchmark.id} entrant={entrant} />)}
      </div>
      <section className={clsx(content.panel, styles.panel)}>
        <HintedHeading rank="h2" className="t-heading" title={t('console.task.runs.validations')} about={t('console.task.runs.validationsNote')} />
        <ul className={styles.validations}>{results.validations.map(run => <ValidationRow key={run.agent} run={run} />)}</ul>
      </section>
    </>
  );
}

/** Each check against each combination; the cells darken with the share of counted runs that failed the check. */
export function CheckMatrix({ task, scope }: { task: ConsoleTaskDetail; scope: CombinationScope }) {
  const { t } = useTranslation();
  const results = useTaskCheckResults(task.benchmark.id, task.id, scope);
  const columns = { '--columns': `minmax(14rem, 1.6fr) repeat(${results.entrants.length}, minmax(3.5rem, 1fr))` } as CSSProperties;
  return (
    <div className={styles.matrixScroll}>
      <div className={clsx(table.table, styles.matrix)} style={columns} role="table" aria-label={t('console.task.runs.view.checks')}>
        <div className={clsx(table.row, table.head)} role="row">
          <span role="columnheader">
            <span className="visually-hidden">{t('console.task.runs.column.check')}</span>
            <InfoHint label={t('ui.about', { subject: t('console.task.runs.view.checks') })}>{t('console.task.runs.checksNote')}</InfoHint>
          </span>
          {results.entrants.map(({ model, harness }) => (
            <span key={combinationKey(model.id, harness.id)} role="columnheader" className={styles.matrixHead}>
              <span className="t-micro">{model.name}</span><span className="t-micro c-faint">{harness.name}</span>
            </span>
          ))}
        </div>
        {results.checks.map(check => (
          <div key={check.id} className={table.row} role="row">
            <span role="rowheader" className={styles.matrixCheck}><span className="t-mono c-faint">{check.id}</span><span className="t-small">{check.title}</span></span>
            {results.entrants.map(({ model, harness }, index) => {
              // A check's counts follow the entrants' order, as the API lists them.
              const { passed, counted, passRate } = check.byEntrant[index];
              return (
                <span key={combinationKey(model.id, harness.id)} role="cell" className={clsx(styles.cell, 't-micro')} style={{ '--pass-rate': passRate } as CSSProperties}>
                  {passed} / {counted}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
