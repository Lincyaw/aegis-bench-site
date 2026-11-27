import { clsx } from 'clsx';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useBenchmarks, useLeaderboardPages, useModelProfile, useStages, type BenchmarkSummary, type LeaderboardView } from '../../../api/client';
import { leaderboardViewValues } from '../../../api/schema';
import { LeaderboardTable } from '../../../components/leaderboard/LeaderboardTable';
import { HalfDot } from '../../../components/lifecycle/LifecycleMap';
import { benchmarksAt } from '../../../components/lifecycle/stages';
import { stageName } from '../../../components/result/presentation';
import { searchOf } from '../../../routes/address';
import { LEADERBOARD_PAGE_SIZE, LEADERBOARD_PARAMS, benchmarkPath, leaderboardPath, parseLeaderboardView, type LeaderboardQuery } from '../../../routes/site';
import { Loading } from '../../../ui/content';
import { MoreButton, ScopeChip, SegmentedControl, TextLink } from '../../../ui/controls';
import { InfoHint } from '../../../ui/hint';
import styles from './LeaderboardPage.module.css';

/** Message keys of the leaderboard's views, in the order the switch shows them. */
const LEADERBOARD_VIEW_LABELS: Record<LeaderboardView, 'leaderboard.view.combination' | 'leaderboard.view.model' | 'leaderboard.view.harness'> = {
  combination: 'leaderboard.view.combination',
  model: 'leaderboard.view.model',
  harness: 'leaderboard.view.harness',
};

/** One benchmark at a time: switching the benchmark or the view only changes the table. */
export function LeaderboardPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useSearchParams();
  const covered = useStages().filter(stage => stage.benchmarks.length > 0);
  const benchmarks = useBenchmarks();
  const benchmarkId = search.get('bench') ?? benchmarks[0].id;
  const benchmark = benchmarks.find(candidate => candidate.id === benchmarkId);
  if (!benchmark) {
    throw new Error(t('leaderboard.unknownBenchmark', { id: benchmarkId }));
  }
  const view = parseLeaderboardView(search.get('view'));
  // The model a page sent the reader here for is the page's scope: its rows stay marked across benchmarks and views until the reader lets it go.
  const model = search.get('model') ?? undefined;
  const choose = (next: Partial<LeaderboardQuery>) => setSearch(searchOf(LEADERBOARD_PARAMS, { bench: benchmark.id, view, model, ...next }), { replace: true, preventScrollReset: true });
  return (
    <div className={clsx('page', styles.page)}>
      <header className={styles.head}>
        <h1 className="t-display">{t('leaderboard.title')}</h1>
        <p className="t-lead c-muted">{t('leaderboard.lead')} <InfoHint label={t('ui.about', { subject: t('leaderboard.title') })}>{t('leaderboard.conditions')}</InfoHint></p>
      </header>
      <div className={styles.picker}>
        <SegmentedControl
          label={t('leaderboard.benchmarkLabel')} value={benchmark.id} onChange={bench => choose({ bench })}
          choices={covered.flatMap(stage => benchmarksAt(stage, benchmarks)).map(candidate => ({ value: candidate.id, label: candidate.name }))}
          captions={covered.map(stage => ({ label: <><HalfDot half={stage.half} />{stageName(stage)}</>, span: stage.benchmarks.length }))}
        />
        <span className={styles.otherStages}><InfoHint label={t('ui.about', { subject: t('site.nav.benchmarks') })}>{t('leaderboard.otherStages')}</InfoHint></span>
      </div>
      <div className={styles.boardHead}>
        <div className={styles.title}>
          <h2 className="t-bench">{benchmark.name}</h2>
          <span className={clsx(styles.meta, 't-micro c-faint')}>
            {t('leaderboard.meta', { stage: stageName(benchmark.stage), metric: benchmark.metric.name, version: benchmark.version, date: benchmark.updatedOn })}
            <InfoHint label={t('ui.about', { subject: benchmark.metric.name })}>{t('leaderboard.note', { metric: benchmark.metric.name, count: benchmark.runsPerTask })}</InfoHint>
          </span>
        </div>
        <div className={styles.tools}>
          {model && <ModelScopeChip modelId={model} to={leaderboardPath({ bench: benchmark.id, view })} />}
          <SegmentedControl label={t('leaderboard.viewLabel')} choices={leaderboardViewValues.map(value => ({ value, label: t(LEADERBOARD_VIEW_LABELS[value]) }))} value={view} onChange={next => choose({ view: next })} />
          <TextLink className="t-small" to={benchmarkPath(benchmark.id)}>{t('leaderboard.details')}</TextLink>
        </div>
      </div>
      <Suspense fallback={<Loading />}>
        <Board benchmark={benchmark} view={view} markedModel={model} />
      </Suspense>
    </div>
  );
}

/** The model the page keeps to, whose rows the board marks; `to` is the leaderboard without it. */
export function ModelScopeChip({ modelId, to }: { modelId: string; to: string }) {
  const { model } = useModelProfile(modelId);
  return <ScopeChip name={model.name} to={to} />;
}

/** The ranking, a page at a time. */
export function Board({ benchmark, view, markedModel }: { benchmark: BenchmarkSummary; view: LeaderboardView; markedModel: string | undefined }) {
  const { t } = useTranslation();
  const pages = useLeaderboardPages(benchmark.id, view, LEADERBOARD_PAGE_SIZE);
  if (pages.isFetchNextPageError) {
    throw pages.error;
  }
  const entries = pages.data.pages.flatMap(page => page.items);
  const total = pages.data.pages[0].total;
  return (
    <div data-half={benchmark.stage.half}>
      <LeaderboardTable benchmarkId={benchmark.id} entries={entries} metric={benchmark.metric} markedModel={markedModel} />
      {entries.length < total && (
        <MoreButton className={styles.more} label={t('leaderboard.loadMore', { shown: entries.length, total })} loading={pages.isFetchingNextPage} onClick={() => void pages.fetchNextPage()} />
      )}
    </div>
  );
}
