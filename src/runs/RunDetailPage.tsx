import { clsx } from 'clsx';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleRun, useConsoleTrajectoryPage } from '../api/consoleClient';
import type { ConsoleBenchmark, ConsoleRunDetail } from '../api/types';
import { ConsoleHeader } from '../console/ConsoleHeader';
import { consoleBenchmarkPath } from '../console/consoleMap';
import { useLocale } from '../i18n/localeContext';
import { dateTimeOf, groupedNumber } from '../i18n/locales';
import { FailureClassTag } from '../results/FailureClassTag';
import { formatCost } from '../results/presentation';
import { consoleTaskPath } from '../tasks/consoleTaskQuery';
import { FactList, Loading } from '../ui/content';
import { ButtonLink } from '../ui/controls';
import { TabRow } from '../ui/navigation';
import navigation from '../ui/navigation.module.css';
import { CONSOLE_RUN_TABS, consoleRunsPath, parseConsoleRunView, runQuerySearch, type ConsoleRunView } from './consoleRunQuery';
import { OutcomeBadge } from './Outcome';
import { defaultRunTab } from './presentation';
import { FailureTab, GradingTab, InputTab, OutputTab } from './RunDetailPanel';
import { RunEventsTab, RunUsageTab } from './RunRecordTabs';
import { TrajectoryView } from './TrajectoryView';
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
  const onView = (next: ConsoleRunView) => setParams(runQuerySearch(next), { replace: true, preventScrollReset: true });
  const counts: Partial<Record<ConsoleRunView['tab'], number>> = { grading: run.grading.total, failure: run.failure?.failedChecks.length, trajectory: run.metrics.steps };
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader
        crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.runs.title'), to: consoleRunsPath(benchmark.id) }, { label: run.task.id }]}
        title={run.task.title}
        lead={t('console.run.label', { model: run.model.name, harness: run.harness.name, attempt: run.attempt })}
        actions={<ButtonLink to={consoleTaskPath(benchmark.id, run.task.id)} variant="line">{t('console.run.toTask')}</ButtonLink>}
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
        { label: t('console.run.inputTokens'), value: groupedNumber(locale, run.usage.inputTokens) },
        { label: t('runs.metrics.outputTokens'), value: groupedNumber(locale, run.metrics.outputTokens) },
        { label: t('runs.metrics.cost'), value: formatCost(run.metrics.costUsd) },
        { label: t('runs.metrics.endReason'), value: t(`runs.endReason.${run.metrics.endReason}`) },
      ]} />
      <TabRow current={view.tab} className={styles.tabs} role="tablist" aria-label={t('console.run.tabList')}>
        {CONSOLE_RUN_TABS.map(tab => (
          <button key={tab} type="button" role="tab" data-tab={tab} aria-selected={tab === view.tab} className={clsx(navigation.tab, 't-small')} onClick={() => onView({ tab })}>
            {tab === 'events' || tab === 'usage' ? t(`console.run.tabs.${tab}`) : t(`runs.tab.${tab}`)}
            {counts[tab] !== undefined && <span className={styles.count}>{counts[tab]}</span>}
          </button>
        ))}
      </TabRow>
      <div className={styles.panel} role="tabpanel">
        <Suspense fallback={<Loading />}>
          <RunTabContent benchmark={benchmark} run={run} view={view} onView={onView} />
        </Suspense>
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
  }
}
