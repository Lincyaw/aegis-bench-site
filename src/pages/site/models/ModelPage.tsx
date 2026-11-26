import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useModelProfile, useStages, type ModelProfile } from '../../../api/client';
import { reportsIn } from '../../../articles/library';
import { HalfDot, LifecycleMap } from '../../../components/lifecycle/LifecycleMap';
import { modelStageLabels } from '../../../components/lifecycle/stages';
import { VendorBadge } from '../../../components/model/ModelBadge';
import { formatScore } from '../../../components/result/presentation';
import { ScoreBar } from '../../../components/result/ScoreBar';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { useLocale } from '../../../i18n/localeContext';
import { leaderboardPath, reportPath } from '../../../routes/site';
import { SectionHeading } from '../../../ui/content';
import { Breadcrumbs } from '../../../ui/navigation';
import table from '../../../ui/table.module.css';
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

/** The model's best combination and rank on each benchmark; each row opens that benchmark's leaderboard with the model's rows marked. */
export function Standings({ profile }: { profile: ModelProfile }) {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <SectionHeading title={t('models.standings.title')} intro={t('models.standings.intro')} />
      <div className={clsx(table.table, styles.standings)} role="table" aria-label={t('models.standings.title')}>
        <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
          <span role="columnheader">{t('models.standings.stage')}</span><span role="columnheader">{t('models.standings.benchmark')}</span>
          <span role="columnheader">{t('models.standings.best')}</span><span role="columnheader">{t('models.standings.rank')}</span>
          <span role="columnheader">{t('models.standings.score')}</span><span role="columnheader" />
        </div>
        {profile.standings.map(standing => (
          <LocaleLink key={standing.benchmark.id} role="row" className={clsx(table.row, table.link)} to={leaderboardPath({ bench: standing.benchmark.id, model: profile.model.id })} data-half={standing.stage.half}>
            <span role="cell" className="t-micro c-muted"><HalfDot half={standing.stage.half} />{standing.stage.id} {standing.stage.name}</span>
            <span role="cell" className="t-bench">{standing.benchmark.name}</span>
            <span role="cell" className="t-micro c-muted">{standing.bestHarness.name}</span>
            <span role="cell" className="t-small">{t('models.rank', { rank: standing.rank })} <span className="c-faint t-micro">/ {standing.entrants}</span></span>
            <span role="cell" className={styles.score}><ScoreBar score={standing.score} /><span className="t-numeric">{formatScore(standing.score, standing.metric)}</span></span>
            <span role="cell" className={clsx(table.arrow, 't-micro')}>{t('models.standings.open')}</span>
          </LocaleLink>
        ))}
      </div>
    </section>
  );
}

/** The model's score under each harness on each benchmark, other conditions equal. */
export function HarnessComparison({ profile }: { profile: ModelProfile }) {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <SectionHeading title={t('models.harnesses.title')} intro={t('models.harnesses.intro')} />
      <div className={styles.harnesses}>
        {profile.harnessComparison.map(comparison => (
          <div key={comparison.benchmark.id} className={styles.harness} data-half={comparison.half}>
            <p className="t-label">{comparison.benchmark.name}</p>
            {comparison.scores.map(score => (
              <div key={score.harness.id} className={styles.harnessRow}>
                <span className="t-micro c-muted">{score.harness.name}</span>
                <span className="t-numeric">{formatScore(score.score, comparison.metric)}</span>
                <ScoreBar score={score.score} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/** The reports whose frontmatter names the model. */
export function RelatedReports({ modelId }: { modelId: string }) {
  const { t } = useTranslation();
  const reports = reportsIn(useLocale()).filter(report => report.models.includes(modelId));
  return reports.length > 0 && (
    <section className={styles.section}>
      <SectionHeading title={t('models.reports')} />
      <ul className={styles.reports}>
        {reports.map(report => (
          <li key={report.slug}>
            <LocaleLink to={reportPath(report.slug)}><span className="t-mono c-faint">{report.date}</span><span className="t-small">{report.title}</span><span className="c-faint">→</span></LocaleLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
