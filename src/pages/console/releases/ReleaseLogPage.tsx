import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useReleaseOverview } from '../../../api/consoleClient';
import { RecentReleases } from '../../../components/release/RecentReleases';
import { ReleaseVersion } from '../../../components/release/ReleaseLabels';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { useLocale } from '../../../i18n/localeContext';
import { dateTimeOf } from '../../../i18n/locales';
import { benchmarkReleasesPath, releasePath } from '../../../routes/consoleReleases';
import table from '../../../ui/table.module.css';
import styles from './ReleasePages.module.css';

/** Every benchmark's public version and draft, then the latest publications over all of them. */
export function ReleaseLogPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { benchmarks, recent } = useReleaseOverview();
  return (
    <div className={styles.page}>
      <ConsoleHeader title={t('console.releases.title')} about={t('console.releases.about')} />
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
            <div key={benchmark.id} className={clsx(table.row, table.link)} role="row">
              <span role="cell"><LocaleLink className={clsx(table.primary, 't-label')} to={to}>{benchmark.name}</LocaleLink></span>
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
