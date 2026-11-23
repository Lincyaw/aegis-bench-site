import { Link, useNavigate } from 'react-router-dom';
import type { LeaderboardEntry, Metric } from '../api/client';
import { ModelName, ScoreBar, formatScore } from './ui';
import styles from './LeaderboardTable.module.css';

/** Ranked combinations: the model name opens the model, the rest of the row that combination's run records. */
export function LeaderboardTable({ benchmarkId, entries, metric, half }: { benchmarkId: string; entries: LeaderboardEntry[]; metric: Metric; half: 'dev' | 'ops' }) {
  const navigate = useNavigate();
  return (
    <div className={styles.table} role="table" aria-label="排行榜">
      <div className={`${styles.row} ${styles.head} t-micro c-faint`} role="row">
        <span role="columnheader">#</span><span role="columnheader">模型</span><span role="columnheader">框架</span>
        <span role="columnheader">{metric.name}</span><span role="columnheader">运行次数</span><span role="columnheader">平均成本</span>
        <span role="columnheader">评测日期</span><span role="columnheader" />
      </div>
      {entries.map(entry => {
        const runs = `/benchmarks/${benchmarkId}/runs?model=${entry.model.id}-${entry.harness.id}`;
        return (
          <div
            key={`${entry.model.id}-${entry.harness.id}`}
            role="row"
            className={styles.row}
            onClick={event => { if (!(event.target as HTMLElement).closest('a')) navigate(runs); }}
          >
            <span role="cell" className="t-numeric c-muted">{entry.rank}</span>
            <span role="cell"><ModelName model={entry.model} /></span>
            <span role="cell" className="t-small c-muted">{entry.harness.name}</span>
            <span role="cell" className={styles.score}><ScoreBar score={entry.score} half={half} width={80} /><span className="t-numeric">{formatScore(entry.score, metric)}</span></span>
            <span role="cell" className="t-numeric c-muted">{entry.runsPerTask}</span>
            <span role="cell" className="t-numeric c-muted">${entry.avgCostUsd.toFixed(2)}</span>
            <span role="cell" className="t-mono c-faint">{entry.evaluatedIn}</span>
            <Link role="cell" className={styles.arrow} to={runs} aria-label={`${entry.model.name} · ${entry.harness.name} 的运行记录`}>→</Link>
          </div>
        );
      })}
    </div>
  );
}
