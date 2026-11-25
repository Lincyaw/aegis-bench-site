import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useReleaseOverview } from '../api/consoleClient';
import type { ReleaseSummary } from '../api/types';
import { ConsoleHeader } from '../console/ConsoleHeader';
import { LocaleLink } from '../i18n/LocaleRouting';
import { useLocale, useLocalizedNavigate } from '../i18n/localeContext';
import { dateTimeOf } from '../i18n/locales';
import content from '../ui/content.module.css';
import table from '../ui/table.module.css';
import { benchmarkReleasesPath, releasePath } from './releaseQuery';
import { ReleaseChangesText, ReleaseStatusTag, ReleaseVersion } from './ReleaseLabels';
import styles from './ReleasePages.module.css';

/** Every benchmark's public version and draft, then the latest publications over all of them. */
export function ReleaseLogPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useLocalizedNavigate();
  const { benchmarks, recent } = useReleaseOverview();
  return (
    <div className={styles.page}>
      <ConsoleHeader title={t('console.releases.title')} lead={t('console.releases.lead')} />
      <div className={clsx(table.table, styles.log)} role="table" aria-label={t('console.releases.title')}>
        <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
          <span role="columnheader">{t('console.releases.column.benchmark')}</span>
          <span role="columnheader">{t('console.releases.column.current')}</span>
          <span role="columnheader">{t('console.releases.column.draft')}</span>
          <span role="columnheader">{t('console.releases.column.updated')}</span>
        </div>
        {benchmarks.map(({ benchmark, current, draft }) => {
          const to = benchmarkReleasesPath(benchmark.id);
          return (
            <div key={benchmark.id} className={clsx(table.row, table.link)} role="row" onClick={event => { if (!(event.target as HTMLElement).closest('a')) { navigate(to); } }}>
              <span role="cell"><LocaleLink className="t-label" to={to}>{benchmark.name}</LocaleLink></span>
              <span role="cell"><ReleaseVersion release={current} /></span>
              <span role="cell">{draft ? <LocaleLink to={releasePath(benchmark.id, draft.id)}><ReleaseVersion release={draft} /></LocaleLink> : <span className="t-small c-faint">{t('console.releases.noDraft')}</span>}</span>
              <span role="cell" className="t-mono c-faint">{dateTimeOf(locale, (draft ?? current).updatedAt)}</span>
            </div>
          );
        })}
      </div>
      <RecentReleases title={t('console.releases.recent')} releases={recent} />
    </div>
  );
}

/** The latest publications, newest first, each with its note and what it changed; each opens its release. */
export function RecentReleases({ title, releases }: { title: string; releases: ReleaseSummary[] }) {
  const locale = useLocale();
  return (
    <section className={clsx(content.panel, styles.recent)}>
      <h2 className="t-heading">{title}</h2>
      <ul className={styles.recentList}>
        {releases.map(release => (
          <li key={release.id}>
            <LocaleLink className={styles.recentItem} to={releasePath(release.benchmark.id, release.id)}>
              <span className={styles.recentHead}>
                <span className="t-label">{release.benchmark.name}</span>
                <ReleaseVersion release={release} />
                <ReleaseStatusTag status={release.status} />
              </span>
              {release.note && <span className="t-small">{release.note}</span>}
              <ReleaseChangesText changes={release.changes} />
              <span className="t-mono c-faint">{release.author} · {dateTimeOf(locale, release.updatedAt)}</span>
            </LocaleLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
