import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useModelProfile, useStages } from '../../../api/client';
import { LifecycleMap } from '../../../components/lifecycle/LifecycleMap';
import { modelStageLabels } from '../../../components/lifecycle/stages';
import { VendorBadge } from '../../../components/model/ModelBadge';
import { HarnessComparison, RelatedReports, Standings } from '../../../components/model/ModelProfile';
import { leaderboardPath } from '../../../routes/site';
import { Breadcrumbs } from '../../../ui/navigation';
import styles from './ModelPage.module.css';

export function ModelPage() {
  const { t } = useTranslation();
  const { modelId = '' } = useParams();
  const profile = useModelProfile(modelId);
  const stages = useStages();
  return (
    <div className={clsx('page', styles.page)}>
      <Breadcrumbs crumbs={[{ label: t('site.nav.leaderboard'), to: leaderboardPath() }, { label: profile.model.name }]} />
      <section className={styles.hero}>
        <div className={styles.intro}>
          <h1 className={clsx('t-display', styles.name)}><VendorBadge model={profile.model} />{profile.model.name}</h1>
          <p className="t-lead c-muted">{profile.summary}</p>
          <p className="t-micro c-faint">{t('models.meta', { date: profile.lastEvaluatedOn, count: profile.harnessCount, vendor: profile.model.vendor })}</p>
        </div>
        <div className={styles.map}>
          <LifecycleMap stages={stages} labels={modelStageLabels(profile, rank => t('models.rank', { rank }))} />
        </div>
      </section>
      <Standings profile={profile} />
      <HarnessComparison profile={profile} />
      <RelatedReports modelId={profile.model.id} />
    </div>
  );
}
