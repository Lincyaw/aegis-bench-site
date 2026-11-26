import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { Settings } from '../../api/types';
import { FactList } from '../../ui/content';
import content from '../../ui/content.module.css';
import styles from './SettingsView.module.css';

/** The settings as a member who may not change them reads them. */
export function SettingsView({ settings }: { settings: Settings }) {
  const { t } = useTranslation();
  return (
    <>
      <section className={clsx(content.panel, styles.section)}>
        <h2 className="t-heading">{t('console.settings.workspace.title')}</h2>
        <FactList layout="rows" facts={[
          { label: t('console.settings.workspace.name'), value: settings.workspace.name },
          { label: t('console.settings.workspace.contactEmail'), value: settings.workspace.contactEmail, format: 'code' },
        ]} />
      </section>
      <section className={clsx(content.panel, styles.section)}>
        <h2 className="t-heading">{t('console.settings.publication.title')}</h2>
        <FactList layout="rows" facts={[
          { label: t('console.settings.publication.reviewers'), value: t('console.settings.publication.reviewerCount', { count: settings.publication.reportReviewers }) },
          { label: t('console.settings.publication.checks'), value: <ol className={styles.checkList}>{settings.publication.reportChecks.map(check => <li key={check}>{check}</li>)}</ol> },
        ]} />
      </section>
      <p className="t-small c-muted">{t('console.settings.readOnly')}</p>
    </>
  );
}
