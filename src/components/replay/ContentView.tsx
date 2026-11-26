import { clsx } from 'clsx';
import type { ContentRow } from './panel';
import styles from './ContentView.module.css';

/** A file's lines with their numbers: lines the agent saw marked, an edit's removed and added lines marked as such, left-out lines a gap. */
export function ContentView({ rows }: { rows: ContentRow[] }) {
  return (
    <ol className={styles.content}>
      {rows.map((row, index) => (row.kind === 'gap'
        ? <li key={`gap ${index}`} className={clsx(styles.gap, 't-mono c-faint')} aria-hidden="true">⋯</li>
        : (
          <li key={`${row.change} ${row.number} ${index}`} className={styles.row} data-change={row.change} data-seen={row.seen ? '' : undefined}>
            <span className="t-mono c-faint">{row.change === 'remove' ? '' : row.number}</span>
            <span className="t-mono c-faint">{{ add: '+', remove: '−', same: '' }[row.change]}</span>
            <code className={styles.text}>{row.text}</code>
          </li>
        )))}
    </ol>
  );
}
