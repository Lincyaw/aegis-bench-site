import { useTranslation } from 'react-i18next';
import type { ReleaseChanges, ReleaseStatus, ReleaseSummary } from '../api/types';
import { Tag } from '../ui/content';

/** Where a release stands; a draft is dashed, as it is not settled yet. */
export function ReleaseStatusTag({ status }: { status: ReleaseStatus }) {
  const { t } = useTranslation();
  return <Tag dashed={status === 'draft'}>{t(`console.releases.status.${status}`)}</Tag>;
}

/** A release's version, and the version it restores when it restores one. */
export function ReleaseVersion({ release }: { release: ReleaseSummary }) {
  const { t } = useTranslation();
  return (
    <span className="t-label">
      {t('console.releases.version', { version: release.version })}
      {release.restoresVersion !== undefined && <span className="t-micro c-faint"> · {t('console.releases.restores', { version: release.restoresVersion })}</span>}
    </span>
  );
}

/** How a release differs from the one before it, as one line. */
export function ReleaseChangesText({ changes }: { changes: ReleaseChanges }) {
  const { t } = useTranslation();
  const parts = [
    changes.entrantsAdded > 0 && t('console.releases.changes.entrantsAdded', { count: changes.entrantsAdded }),
    changes.entrantsRemoved > 0 && t('console.releases.changes.entrantsRemoved', { count: changes.entrantsRemoved }),
    changes.replaysAdded > 0 && t('console.releases.changes.replaysAdded', { count: changes.replaysAdded }),
    changes.replaysRemoved > 0 && t('console.releases.changes.replaysRemoved', { count: changes.replaysRemoved }),
    changes.summaryChanged && t('console.releases.changes.summaryChanged'),
  ].filter(part => part !== false);
  return <span className="t-small c-muted">{parts.length > 0 ? parts.join(' · ') : t('console.releases.changes.none')}</span>;
}
