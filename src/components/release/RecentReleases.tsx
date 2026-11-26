import { clsx } from 'clsx';
import type { ReleaseSummary } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { useLocale } from '../../i18n/localeContext';
import { dateTimeOf } from '../../i18n/locales';
import { releasePath } from '../../routes/consoleReleases';
import content from '../../ui/content.module.css';
import { ReleaseChangesText, ReleaseStatusTag, ReleaseVersion } from './ReleaseLabels';
import styles from './RecentReleases.module.css';

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
