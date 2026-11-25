import { clsx } from 'clsx';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useSiteInfo, type BenchmarkSummary, type Stage } from '../api/client';
import { Citation } from '../articles/blocks';
import { LocaleLink } from '../i18n/LocaleRouting';
import { formatScore } from '../leaderboard/presentation';
import { HALF_LABELS } from '../lifecycle/stages';
import { VendorBadge } from '../models/ModelBadge';
import { SiteFooter } from '../site/SiteLayout';
import { BENCHMARKS_PATH, benchmarkPath, leaderboardPath } from '../site/siteMap';
import { Tag } from '../ui/content';
import { ButtonLink, CopyButton } from '../ui/controls';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '../ui/media';
import { PART } from './landingMarkup';
import { LOOP_MARK } from './lemniscate';
import { beatAttributes, stageBeatAttributes } from './scrollStory';
import styles from './LandingSections.module.css';

/** Placeholder slots until the institutions and the team are named. */
export const INSTITUTION_SLOTS = 6;
export const TEAM_SLOTS = 5;

/** The title over the drifting smoke, dated by the latest benchmark update. */
export function Hero({ benchmarks }: { benchmarks: BenchmarkSummary[] }) {
  const { t } = useTranslation();
  const updatedOn = benchmarks.reduce((latest, benchmark) => (benchmark.updatedOn > latest ? benchmark.updatedOn : latest), benchmarks[0].updatedOn);
  return (
    <section className={styles.hero} {...beatAttributes('smoke')}>
      <div className={styles.heroCopy} data-part={PART.copy}>
        <p className={styles.eyebrow}>
          <span className={styles.live} />
          {t('landing.updated', { date: new Date(updatedOn), formatParams: { date: { dateStyle: 'long', timeZone: 'UTC' } } })}
        </p>
        <h1 className={styles.title}><span className={styles.nowrap}>{t('landing.titleStart')}</span><wbr /><span className={styles.nowrap}>{t('landing.titleEnd')}</span></h1>
        <p className={clsx(styles.lead, 't-lead c-muted')}>{t('landing.lead')}</p>
        <div className={styles.actions}>
          <ButtonLink to={leaderboardPath()} variant="solid">{t('benchmarks.viewLeaderboard')}</ButtonLink>
          <ButtonLink to={BENCHMARKS_PATH} variant="line">{t('landing.browseBenchmarks')}</ButtonLink>
        </div>
      </div>
    </section>
  );
}

/** The loop seen whole: its stations labelled, with a legend of covered and planned stages. */
export function LifecycleIntro() {
  const { t } = useTranslation();
  return (
    <section className={styles.mapPanel} {...beatAttributes('map')}>
      <div className={styles.copy} data-part={PART.copy}>
        <p className={styles.eyebrow}>{t('landing.lifecycle')}</p>
        <h2 className={styles.heading}>{t('landing.mapTitle')}</h2>
        <p className={clsx(styles.legend, 't-small c-muted')}>
          <span><i className={styles.dot} />{t('landing.published')}</span>
          <span><i className={clsx(styles.dot, styles.planned)} />{t('landing.planned')}</span>
        </p>
      </div>
    </section>
  );
}

/** One stage of the tour: what it asks of an agent, and the top three of each of its benchmarks. */
export function StagePanel({ stage, index, benchmarks }: { stage: Stage; index: number; benchmarks: BenchmarkSummary[] }) {
  const { t } = useTranslation();
  const covered = benchmarks.length > 0;
  return (
    <section className={clsx(styles.panel, covered && styles.coveredPanel)} data-half={stage.half} {...stageBeatAttributes(index)}>
      <div className={styles.copy} data-part={PART.copy}>
        <p className={styles.eyebrow}><i className={clsx(styles.dot, !covered && styles.planned)} />{t('landing.stageEyebrow', { half: t(HALF_LABELS[stage.half]), id: stage.id })}</p>
        <h2 className={styles.heading}>{stage.name}</h2>
        <p className={clsx(styles.duty, 'c-muted')}>{stage.summary}</p>
        {covered ? benchmarks.map(benchmark => <BenchmarkCard key={benchmark.id} benchmark={benchmark} />) : <Tag dashed>{t('landing.building')}</Tag>}
      </div>
    </section>
  );
}

/** A benchmark's top three, whose bars draw out as the stage arrives; the card opens the benchmark. */
export function BenchmarkCard({ benchmark }: { benchmark: BenchmarkSummary }) {
  const { t } = useTranslation();
  return (
    <LocaleLink className={styles.benchmark} to={benchmarkPath(benchmark.id)}>
      <span className={styles.benchmarkHead}>
        <h3 className="t-bench">{benchmark.name}</h3>
        <span className="t-micro c-faint">{t('landing.benchmarkMeta', { count: benchmark.taskCount, metric: benchmark.metric.name })}</span>
      </span>
      <ol className={styles.leaders} data-part={PART.leaders}>
        {benchmark.topThree.map(entry => (
          <li key={entry.rank}>
            <span className={clsx(styles.rank, 't-numeric c-faint')}>{entry.rank}</span>
            <VendorBadge model={entry.model} />
            <span className={styles.model}>{entry.model.name}</span>
            <span className={styles.bar}><i style={{ '--share': Math.min(1, entry.score) } as CSSProperties} /></span>
            <span className={clsx(styles.score, 't-numeric')}>{formatScore(entry.score, benchmark.metric)}</span>
          </li>
        ))}
      </ol>
    </LocaleLink>
  );
}

/** Who uses the benchmark and what is new, read while the loop drifts back into mist. */
export function Updates() {
  const { t } = useTranslation();
  return (
    <section className={styles.panel} {...beatAttributes('far')}>
      <div className={clsx(styles.copy, styles.wide)} data-part={PART.copy}>
        <p className={styles.eyebrow}>{t('landing.institutions')}</p>
        <div className={clsx(styles.logos, 't-micro c-faint')}>{Array.from({ length: INSTITUTION_SLOTS }, (_, k) => <span key={k}>{t('landing.institution')}</span>)}</div>
        <p className={styles.eyebrow}>{t('landing.news')}</p>
        <ul className={styles.updates}>
          {t('landing.updates', { returnObjects: true }).map(update => (
            <li key={update.date}>
              <time className="t-numeric c-faint" dateTime={update.date}>{update.date}</time>
              <span className="t-micro c-muted">{update.kind}</span>
              <p>{update.title}<small className="t-micro c-faint">{update.source}</small></p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The team, the citation and the contact, then the footer, where the loop settles into the mark. */
export function Closing() {
  const { t } = useTranslation();
  const { contactEmail } = useSiteInfo();
  return (
    <section className={styles.closing} {...beatAttributes('mark')}>
      <div className={clsx(styles.copy, styles.wide)}>
        <p className={styles.eyebrow}>{t('landing.team')}</p>
        <div className={styles.team}>
          {Array.from({ length: TEAM_SLOTS }, (_, k) => (
            <div key={k} className={styles.member}>
              <span className={clsx(styles.avatar, 'c-faint')}>{t('landing.member.initial')}</span>
              <strong className="t-label">{t('landing.member.name')}</strong>
              <small className="t-micro c-faint">{t('landing.member.role')}</small>
            </div>
          ))}
        </div>
        <div className={styles.pair}>
          <div>
            <h3 className="t-heading">{t('landing.citeTitle')}</h3>
            <p className="t-small c-muted">{t('landing.citeBody')}</p>
            <Citation><pre>{t('landing.bibtex')}</pre></Citation>
          </div>
          <div>
            <h3 className="t-heading">{t('site.contact')}</h3>
            <p className="t-small c-muted">{t('landing.contactBody')}</p>
            <span className={styles.email}>{contactEmail}</span>
            <CopyButton label={t('landing.copyEmail')} text={() => contactEmail} />
          </div>
        </div>
      </div>
      <div className={styles.markSlot} data-part={PART.markSlot}><LoopMark /></div>
      <SiteFooter />
    </section>
  );
}

/** The mark the loop settles into, with the agent running its lap unless the reader asks for less motion. */
export function LoopMark() {
  const { t } = useTranslation();
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  return (
    <svg className={styles.mark} data-part={PART.mark} viewBox={LOOP_MARK.viewBox} role="img" aria-label={t('landing.mark')}>
      <path data-half="dev" d={LOOP_MARK.dev} />
      <path data-half="ops" d={LOOP_MARK.ops} />
      {!reducedMotion && <circle r="0.55"><animateMotion dur="16s" repeatCount="indefinite" path={LOOP_MARK.lap} /></circle>}
    </svg>
  );
}
