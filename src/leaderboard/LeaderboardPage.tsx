import { clsx } from 'clsx';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useBenchmarks, useLeaderboardPages, useStages, type BenchmarkSummary, type LeaderboardView } from '../api/client';
import { leaderboardViewValues } from '../api/schema';
import { LocaleLink } from '../i18n/LocaleRouting';
import { HalfDot } from '../lifecycle/LifecycleMap';
import { benchmarksAt } from '../lifecycle/stages';
import { benchmarkPath } from '../site/siteMap';
import { Loading } from '../ui/content';
import { MoreButton, SegmentedControl } from '../ui/controls';
import controls from '../ui/controls.module.css';
import { LeaderboardTable } from './LeaderboardTable';
import { LEADERBOARD_PAGE_SIZE, LEADERBOARD_VIEW_LABELS, parseLeaderboardView } from './presentation';
import styles from './LeaderboardPage.module.css';

/** One benchmark at a time: switching the benchmark or the view only changes the table. */
export function LeaderboardPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useSearchParams();
  const stages = useStages();
  const benchmarks = useBenchmarks();
  const benchmarkId = search.get('bench') ?? benchmarks[0].id;
  const benchmark = benchmarks.find(candidate => candidate.id === benchmarkId);
  if (!benchmark) {
    throw new Error(t('leaderboard.unknownBenchmark', { id: benchmarkId }));
  }
  const view = parseLeaderboardView(search.get('view'));
  const choose = (next: { bench?: string; view?: LeaderboardView }) => setSearch({ bench: benchmark.id, view, ...next }, { replace: true, preventScrollReset: true });
  return (
    <div className={clsx('page', styles.page)}>
      <header className={styles.head}>
        <h1 className="t-display">{t('leaderboard.title')}</h1>
        <p className="t-lead c-muted">{t('leaderboard.lead')}</p>
      </header>
      <div className={styles.picker}>
        <div className={styles.groups}>
          {stages.filter(stage => stage.benchmarks.length > 0).map(stage => (
            <div key={stage.id} className={styles.group}>
              <p className="t-micro c-faint"><HalfDot half={stage.half} />{stage.id} {stage.name}</p>
              <div className={styles.pills}>
                {benchmarksAt(stage, benchmarks).map(candidate => (
                  <button key={candidate.id} type="button" aria-pressed={candidate.id === benchmark.id} className={clsx(controls.pill, controls.medium, 'loop-edge')} onClick={() => choose({ bench: candidate.id })}>
                    {candidate.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <span className="t-micro c-faint">{t('leaderboard.otherStages')}</span>
      </div>
      <div className={styles.boardHead}>
        <div className={styles.title}>
          <h2 className="t-bench">{benchmark.name}</h2>
          <span className="t-micro c-faint">{t('leaderboard.meta', { stage: `${benchmark.stage.id} ${benchmark.stage.name}`, metric: benchmark.metric.name, version: benchmark.version, date: benchmark.updatedOn })}</span>
        </div>
        <div className={styles.tools}>
          <SegmentedControl label={t('leaderboard.viewLabel')} choices={leaderboardViewValues.map(value => ({ value, label: t(LEADERBOARD_VIEW_LABELS[value]) }))} value={view} onChange={next => choose({ view: next })} />
          <LocaleLink className={clsx(controls.textLink, 't-small')} to={benchmarkPath(benchmark.id)}>{t('leaderboard.details')}</LocaleLink>
        </div>
      </div>
      <Suspense fallback={<Loading />}>
        <Board benchmark={benchmark} view={view} />
      </Suspense>
      <p className={clsx(styles.note, 't-micro c-faint')}>{t('leaderboard.note', { metric: benchmark.metric.name, count: benchmark.runsPerTask })}</p>
    </div>
  );
}

/** The ranking, a page at a time. */
export function Board({ benchmark, view }: { benchmark: BenchmarkSummary; view: LeaderboardView }) {
  const { t } = useTranslation();
  const pages = useLeaderboardPages(benchmark.id, view, LEADERBOARD_PAGE_SIZE);
  if (pages.isFetchNextPageError) {
    throw pages.error;
  }
  const entries = pages.data.pages.flatMap(page => page.items);
  const total = pages.data.pages[0].total;
  return (
    <div data-half={benchmark.stage.half}>
      <LeaderboardTable benchmarkId={benchmark.id} entries={entries} metric={benchmark.metric} />
      {entries.length < total && (
        <MoreButton className={styles.more} label={t('leaderboard.loadMore', { shown: entries.length, total })} loading={pages.isFetchingNextPage} onClick={() => void pages.fetchNextPage()} />
      )}
    </div>
  );
}
