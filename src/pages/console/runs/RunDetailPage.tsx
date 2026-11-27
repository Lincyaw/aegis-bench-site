import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleRun, useConsoleTrajectoryPage } from '../../../api/consoleClient';
import type { ConsoleBenchmark, ConsoleRunDetail } from '../../../api/types';
import { FailureClassTag } from '../../../components/result/FailureClassTag';
import { HuggingFaceBoundary } from '../../../components/run/HuggingFace';
import { OutcomeBadge } from '../../../components/run/Outcome';
import { RunMetrics } from '../../../components/run/RunDetail';
import { RunTabRow, RunViewTab } from '../../../components/run/RunTabs';
import { RunUsageTab } from '../../../components/run/RunUsage';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import type { TrajectorySource } from '../../../components/trajectory/TrajectoryView';
import { useLocale } from '../../../i18n/localeContext';
import { dateTimeOf } from '../../../i18n/locales';
import { searchOf } from '../../../routes/address';
import { consoleBenchmarkPath } from '../../../routes/console';
import { consoleRunReplayPath } from '../../../routes/consoleReplay';
import { CONSOLE_RUN_TABS, RUN_VIEW_PARAMS, consoleRunsPath, parseConsoleRunView, type ConsoleRunTab, type ConsoleRunView } from '../../../routes/consoleRuns';
import { consoleTaskPath } from '../../../routes/consoleTasks';
import { defaultRunTab, isRunTab } from '../../../routes/runRecords';
import { FactList, Loading } from '../../../ui/content';
import { ButtonLink } from '../../../ui/controls';
import { RunEventsTab } from './RunEventsTab';
import { RunHuntsTab } from './RunHuntsTab';
import styles from './RunDetailPage.module.css';

/**
 * A run in the console: the public run's five views of what the model received, produced and was graded on, and three
 * of the records behind them, the trajectory's raw events, what the run consumed and what the trajectory analyses found.
 */
export function RunDetailPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { benchmarkId = '', runId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const run = useConsoleRun(runId);
  const view = parseConsoleRunView(params, defaultRunTab(run));
  // Opening a view starts at its own step or check; the events' filter, the hunt and the other parts of the address stay.
  const onView = (next: Partial<ConsoleRunView>) => setParams(searchOf(RUN_VIEW_PARAMS, { ...view, step: undefined, check: undefined, ...next }), { replace: true, preventScrollReset: true });
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader
        crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.runs.title'), to: consoleRunsPath(benchmark.id) }, { label: run.task.id }]}
        title={run.task.title}
        lead={t('console.run.label', { model: run.model.name, harness: run.harness.name, attempt: run.attempt })}
        actions={(
          <>
            <ButtonLink to={consoleTaskPath(benchmark.id, run.task.id)} variant="quiet">{t('console.run.toTask')}</ButtonLink>
            {benchmark.replayable && <ButtonLink to={consoleRunReplayPath(benchmark.id, run.id, { step: view.step })} variant="quiet">{t('console.replay.open')}</ButtonLink>}
            <ButtonLink to={consoleTaskPath(benchmark.id, run.task.id, { tab: 'compare', compared: [run.id] })} variant="line">{t('console.run.compare')}</ButtonLink>
          </>
        )}
      />
      <div className={styles.facts}>
        <OutcomeBadge outcome={run.outcome} />
        {run.outcome === 'failed' && <FailureClassTag failureClass={run.failureClass} />}
        <FactList layout="inline" facts={[
          { label: t('console.run.facts.version'), value: run.taskVersion, format: 'code' },
          { label: t('console.run.facts.batch'), value: run.batch, format: 'code' },
          { label: t('console.run.facts.finished'), value: dateTimeOf(locale, run.finishedAt), format: 'code' },
          ...(run.reviewer ? [{ label: t('console.run.facts.reviewer'), value: run.reviewer, format: 'code' as const }] : []),
        ]} />
      </div>
      <RunMetrics run={run} inputTokens={run.usage.inputTokens} />
      <RunTabRow
        run={run} tabs={CONSOLE_RUN_TABS} current={view.tab} className={styles.tabs} label={t('console.run.tabList')}
        labelOf={tab => (isRunTab(tab) ? t(`runs.tab.${tab}`) : t(`console.run.tab.${tab}`))}
        onSelect={tab => onView({ tab })}
      />
      <div className={styles.panel} role="tabpanel">
        <HuggingFaceBoundary resetKey={view.tab}>
          <Suspense fallback={<Loading />}>
            <RunTabContent benchmark={benchmark} run={run} view={view} onView={onView} />
          </Suspense>
        </HuggingFaceBoundary>
      </div>
    </div>
  );
}

/** The part of the run the tab names: one of the five views every run has, or one of the console's own records. */
export function RunTabContent({ benchmark, run, view, onView }: { benchmark: ConsoleBenchmark; run: ConsoleRunDetail; view: ConsoleRunView; onView: (view: Partial<ConsoleRunView>) => void }) {
  const source: TrajectorySource = { usePage: (offset, pageSize) => useConsoleTrajectoryPage(run.id, offset, pageSize) };
  const onStep = (step: number) => onView({ tab: 'trajectory', step });
  const tab: ConsoleRunTab = view.tab;
  if (isRunTab(tab)) {
    return (
      <RunViewTab
        run={run} tab={tab} view={view} legend={benchmark.timelineLegend} source={source} onView={onView}
        filePath={path => consoleTaskPath(benchmark.id, run.task.id, { tab: 'files', file: path })}
      />
    );
  }
  switch (tab) {
    case 'events': return <RunEventsTab run={run} view={view} onView={onView} onStep={onStep} />;
    case 'usage': return <RunUsageTab run={run} />;
    case 'hunts': return <RunHuntsTab benchmarkId={benchmark.id} run={run} view={view} onStep={onStep} />;
  }
}
