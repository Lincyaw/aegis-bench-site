import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleRun, useConsoleTrajectoryPage } from '../../../api/consoleClient';
import type { ConsoleBenchmark, ConsoleRunDetail } from '../../../api/types';
import { FailureClassTag } from '../../../components/result/FailureClassTag';
import { formatCost } from '../../../components/result/presentation';
import { HuggingFaceBoundary, HuggingFaceLink } from '../../../components/run/HuggingFace';
import { OutcomeBadge } from '../../../components/run/Outcome';
import { FailureTab, GradingTab, InputTab, OutputTab } from '../../../components/run/RunDetail';
import { RunUsageTab } from '../../../components/run/RunUsage';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { TrajectoryView } from '../../../components/trajectory/TrajectoryView';
import { useLocale } from '../../../i18n/localeContext';
import { dateTimeOf, groupedNumber } from '../../../i18n/locales';
import { searchOf } from '../../../routes/address';
import { consoleBenchmarkPath } from '../../../routes/console';
import { consoleRunReplayPath } from '../../../routes/consoleReplay';
import { CONSOLE_RUN_TABS, RUN_VIEW_PARAMS, consoleRunsPath, parseConsoleRunView, type ConsoleRunView } from '../../../routes/consoleRuns';
import { consoleTaskPath } from '../../../routes/consoleTasks';
import { defaultRunTab } from '../../../routes/runRecords';
import { FactList, Loading } from '../../../ui/content';
import { ButtonLink } from '../../../ui/controls';
import { Tab, TabRow } from '../../../ui/navigation';
import { RunHuntsTab } from './RunHuntsTab';
import { RunEventsTab } from './RunRecordTabs';
import styles from './RunDetailPage.module.css';

/**
 * A run in the console: the public run's five views of what the model received, produced and was graded on, and two
 * of the records behind them, the trajectory's raw events and what the run consumed.
 */
export function RunDetailPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { benchmarkId = '', runId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const run = useConsoleRun(runId);
  const view = parseConsoleRunView(params, defaultRunTab(run));
  const onView = (next: ConsoleRunView) => setParams(searchOf(RUN_VIEW_PARAMS, next), { replace: true, preventScrollReset: true });
  const counts: Partial<Record<ConsoleRunView['tab'], number>> = { grading: run.grading.total, failure: run.failure?.failedChecks.length, trajectory: run.metrics.steps };
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
      <FactList layout="inline" facts={[
        { label: t('runs.metrics.steps'), value: run.metrics.steps },
        { label: t('runs.metrics.duration'), value: t('benchmarks.minutes', { count: run.metrics.durationMinutes }) },
        { label: t('runs.metrics.submissions'), value: t('benchmarks.times', { count: run.metrics.submissions }) },
        ...(run.usage.inputTokens === undefined ? [] : [{ label: t('console.run.inputTokens'), value: groupedNumber(locale, run.usage.inputTokens) }]),
        { label: t('runs.metrics.outputTokens'), value: groupedNumber(locale, run.metrics.outputTokens) },
        { label: t('runs.metrics.cost'), value: formatCost(run.metrics.costUsd) },
        { label: t('runs.metrics.endReason'), value: t(`runs.endReason.${run.metrics.endReason}`) },
      ]} />
      {run.huggingFaceUrl && <HuggingFaceLink about={t('runs.huggingFace')} url={run.huggingFaceUrl} />}
      <TabRow current={view.tab} className={styles.tabs} role="tablist" aria-label={t('console.run.tabList')}>
        {CONSOLE_RUN_TABS.map(tab => (
          <Tab key={tab} id={tab} current={view.tab} count={counts[tab]} onSelect={() => onView({ tab })}>
            {tab === 'events' || tab === 'usage' ? t(`console.run.tabs.${tab}`) : tab === 'hunts' ? t('console.analysis.runTab') : t(`runs.tab.${tab}`)}
          </Tab>
        ))}
      </TabRow>
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

export function RunTabContent({ benchmark, run, view, onView }: { benchmark: ConsoleBenchmark; run: ConsoleRunDetail; view: ConsoleRunView; onView: (view: ConsoleRunView) => void }) {
  const filePath = (path: string) => consoleTaskPath(benchmark.id, run.task.id, { tab: 'files', file: path });
  const useConsoleRunTrajectoryPage = (offset: number, pageSize: number) => useConsoleTrajectoryPage(run.id, offset, pageSize);
  switch (view.tab) {
    case 'input': return <InputTab run={run} filePath={filePath} />;
    case 'output': return <OutputTab run={run} onStep={step => onView({ tab: 'trajectory', step })} />;
    case 'grading': return <GradingTab run={run} filePath={filePath} check={view.check} onCheck={check => onView({ tab: 'grading', check })} />;
    case 'failure': return <FailureTab run={run} onCheck={check => onView({ tab: 'grading', check })} onStep={step => onView({ tab: 'trajectory', step })} />;
    case 'trajectory': return (
      <TrajectoryView
        usePage={useConsoleRunTrajectoryPage} timeline={run.timeline} legend={benchmark.timelineLegend}
        evidence={run.failure?.review?.evidenceSteps ?? []} selected={view.step} onSelect={step => onView({ tab: 'trajectory', step })}
      />
    );
    case 'events': return <RunEventsTab run={run} onStep={step => onView({ tab: 'trajectory', step })} />;
    case 'usage': return <RunUsageTab run={run} />;
    case 'hunts': return <RunHuntsTab runId={run.id} onStep={step => onView({ tab: 'trajectory', step })} />;
  }
}
