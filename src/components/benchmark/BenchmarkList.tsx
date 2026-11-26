import { useTranslation } from 'react-i18next';
import type { BenchmarkSummary } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { benchmarkPath } from '../../routes/site';
import { Tag } from '../../ui/content';
import { ModelLabel } from '../model/ModelBadge';
import { formatScore } from '../result/presentation';
import styles from './BenchmarkList.module.css';

export function BenchmarkRow({ benchmark }: { benchmark: BenchmarkSummary }) {
  const { t } = useTranslation();
  return (
    <LocaleLink className={styles.bench} to={benchmarkPath(benchmark.id)}>
      <div className={styles.benchMain}>
        <div className={styles.benchName}><span className="t-bench">{benchmark.name}</span><Tag>{benchmark.version}</Tag></div>
        <p className="t-small c-muted">{benchmark.summary}</p>
        <p className="t-micro c-faint">{t('benchmarks.rowMeta', { count: benchmark.taskCount, metric: benchmark.metric.name, date: benchmark.updatedOn })}</p>
      </div>
      <div className={styles.top}>
        <p className="t-micro c-faint">{t('benchmarks.topThree')}</p>
        <ol>
          {benchmark.topThree.map(entry => (
            <li key={entry.rank}>
              <span className="t-mono c-faint">{entry.rank}</span>
              <ModelLabel model={entry.model} />
              <span className="t-numeric c-muted">{formatScore(entry.score, benchmark.metric)}</span>
            </li>
          ))}
        </ol>
      </div>
      <span className={styles.arrow} aria-hidden="true">→</span>
    </LocaleLink>
  );
}
