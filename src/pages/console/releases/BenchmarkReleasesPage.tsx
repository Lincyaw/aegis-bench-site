import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useBenchmarkReleases, useConsoleBenchmark, useConsoleUser, useCreateDraft } from '../../../api/consoleClient';
import { ReleaseChangesText, ReleaseStatusTag, ReleaseVersion } from '../../../components/release/ReleaseLabels';
import { ChangeFailure } from '../../../components/shell/ChangeFailure';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { useLocale, useLocalizedNavigate } from '../../../i18n/localeContext';
import { dateTimeOf } from '../../../i18n/locales';
import { consoleBenchmarkPath } from '../../../routes/console';
import { releasePath } from '../../../routes/consoleReleases';
import { Button, ButtonLink } from '../../../ui/controls';
import table from '../../../ui/table.module.css';
import { mayEdit } from '../roles';
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
  const editing = mayEdit(useConsoleUser().role);
  const draft = releases.find(release => release.status === 'draft');
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader
        crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.benchmarkReleases.title') }]}
        title={t('console.benchmarkReleases.title')} lead={t('console.benchmarkReleases.lead', { benchmark: benchmark.name })}
        actions={draft
          ? <ButtonLink to={releasePath(benchmark.id, draft.id)} variant={editing ? 'solid' : 'line'}>{t(editing ? 'console.benchmarkReleases.openDraft' : 'console.benchmarkReleases.viewDraft')}</ButtonLink>
          : editing && <Button variant="solid" onClick={() => createDraft.mutate(undefined, { onSuccess: created => navigate(releasePath(benchmark.id, created.id)) })}>{t('console.benchmarkReleases.newDraft')}</Button>}
      />
      <ChangeFailure error={createDraft.error} reasons={{ 409: t('console.benchmarkReleases.draftExists') }} />
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
            <div key={release.id} className={clsx(table.row, table.link)} role="row">
              <span role="cell"><LocaleLink className={table.primary} to={to}><ReleaseVersion release={release} /></LocaleLink></span>
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
