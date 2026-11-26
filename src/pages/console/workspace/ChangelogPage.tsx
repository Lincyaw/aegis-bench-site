import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useChangelog, useConsoleBenchmarks } from '../../../api/consoleClient';
import { consoleRevisionChangeValues } from '../../../api/schema';
import type { ChangelogQuery, RevisionChange } from '../../../api/types';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { ChangelogTable } from '../../../components/workspace/ChangelogTable';
import { EVERY_CHOICE } from '../../../routes/console';
import { CHANGELOG_PAGE_SIZE, changelogQuerySearch, parseChangelogQuery } from '../../../routes/consoleChangelog';
import { Select } from '../../../ui/controls';
import { Pager } from '../../../ui/navigation';
import styles from './WorkspacePages.module.css';

/** Every version of every task, newest first; the filters and the page live in the address. */
export function ChangelogPage() {
  const { t } = useTranslation();
  const benchmarks = useConsoleBenchmarks();
  const [params, setParams] = useSearchParams();
  const query = parseChangelogQuery(params);
  // The page in view stays until the next one arrives.
  const page = useChangelog(parseChangelogQuery(new URLSearchParams(useDeferredValue(params.toString()))), CHANGELOG_PAGE_SIZE);
  const update = (next: Partial<ChangelogQuery>) => setParams(changelogQuerySearch({ ...query, offset: 0, ...next }), { replace: true, preventScrollReset: true });
  const last = Math.min(query.offset + CHANGELOG_PAGE_SIZE, page.total);
  return (
    <div className={styles.page}>
      <ConsoleHeader title={t('console.changelog.title')} lead={t('console.changelog.lead')} />
      <div className={styles.filters} role="search" aria-label={t('console.changelog.title')}>
        <Select
          label={t('console.changelog.benchmarkFilter')} value={query.benchmarkId || EVERY_CHOICE} onChange={benchmarkId => update({ benchmarkId: benchmarkId === EVERY_CHOICE ? '' : benchmarkId })}
          choices={[{ value: EVERY_CHOICE, label: t('console.changelog.everyBenchmark') }, ...benchmarks.map(benchmark => ({ value: benchmark.id, label: benchmark.name }))]}
        />
        <Select
          label={t('console.changelog.changeFilter')} value={query.change ?? EVERY_CHOICE} onChange={change => update({ change: change === EVERY_CHOICE ? undefined : change as RevisionChange })}
          choices={[{ value: EVERY_CHOICE, label: t('console.changelog.everyChange') }, ...consoleRevisionChangeValues.map(change => ({ value: change, label: t(`console.task.revisions.change.${change}`) }))]}
        />
      </div>
      <ChangelogTable entries={page.items} />
      {page.total > CHANGELOG_PAGE_SIZE && (
        <Pager
          className={styles.pager} label={t('console.changelog.range', { from: query.offset + 1, to: last, total: page.total })}
          atStart={query.offset === 0} atEnd={last >= page.total}
          onPrevious={() => update({ offset: query.offset - CHANGELOG_PAGE_SIZE })} onNext={() => update({ offset: query.offset + CHANGELOG_PAGE_SIZE })}
        />
      )}
    </div>
  );
}
