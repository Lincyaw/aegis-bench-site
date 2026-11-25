import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useBenchmarkReleases, useConsoleBenchmark, useCreateDraft } from '../api/consoleClient';
import { ConsoleHeader } from '../console/ConsoleHeader';
import { consoleBenchmarkPath } from '../console/consoleMap';
import { LocaleLink } from '../i18n/LocaleRouting';
import { useLocale, useLocalizedNavigate } from '../i18n/localeContext';
import { dateTimeOf } from '../i18n/locales';
import { Button, ButtonLink } from '../ui/controls';
import table from '../ui/table.module.css';
import { releasePath } from './releaseQuery';
import { ReleaseChangesText, ReleaseFailure, ReleaseStatusTag, ReleaseVersion } from './ReleaseLabels';
import styles from './ReleasePages.module.css';

/** A benchmark's releases, its draft first, with the way to start or continue the next one. */
export function BenchmarkReleasesPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useLocalizedNavigate();
  const { benchmarkId = '' } = useParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const releases = useBenchmarkReleases(benchmark.id);
  const createDraft = useCreateDraft(benchmark.id);
  const draft = releases.find(release => release.status === 'draft');
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader
        crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.benchmarkReleases.title') }]}
        title={t('console.benchmarkReleases.title')} lead={t('console.benchmarkReleases.lead', { benchmark: benchmark.name })}
        actions={draft
          ? <ButtonLink to={releasePath(benchmark.id, draft.id)} variant="solid">{t('console.benchmarkReleases.openDraft')}</ButtonLink>
          : <Button variant="solid" onClick={() => createDraft.mutate(undefined, { onSuccess: created => navigate(releasePath(benchmark.id, created.id)) })}>{t('console.benchmarkReleases.newDraft')}</Button>}
      />
      <ReleaseFailure error={createDraft.error} />
      <div className={clsx(table.table, styles.history)} role="table" aria-label={t('console.benchmarkReleases.title')}>
        <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
          <span role="columnheader">{t('console.benchmarkReleases.column.version')}</span>
          <span role="columnheader">{t('console.benchmarkReleases.column.status')}</span>
          <span role="columnheader">{t('console.benchmarkReleases.column.note')}</span>
          <span role="columnheader">{t('console.benchmarkReleases.column.changes')}</span>
          <span role="columnheader">{t('console.benchmarkReleases.column.author')}</span>
          <span role="columnheader">{t('console.benchmarkReleases.column.updated')}</span>
        </div>
        {releases.map(release => {
          const to = releasePath(benchmark.id, release.id);
          return (
            <div key={release.id} className={clsx(table.row, table.link)} role="row" onClick={event => { if (!(event.target as HTMLElement).closest('a')) { navigate(to); } }}>
              <span role="cell"><LocaleLink to={to}><ReleaseVersion release={release} /></LocaleLink></span>
              <span role="cell"><ReleaseStatusTag status={release.status} /></span>
              <span role="cell" className="t-small">{release.note ?? '—'}</span>
              <span role="cell"><ReleaseChangesText changes={release.changes} /></span>
              <span role="cell" className="t-mono c-muted">{release.author}</span>
              <span role="cell" className="t-mono c-faint">{dateTimeOf(locale, release.updatedAt)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
