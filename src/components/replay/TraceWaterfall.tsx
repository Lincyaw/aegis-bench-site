import { clsx } from 'clsx';
import type { CSSProperties } from 'react';
import type { Span } from '../../api/types';
import { callOrder, clockTime } from './panel';
import styles from './TraceWaterfall.module.css';

/**
 * A trace as a waterfall: every span a bar on the trace's own time, indented under the span that called it, the spans
 * on the node in view marked, and a failed span named as failed. A span's node is a way to open it.
 */
export function TraceWaterfall({ spans, node, later, onSelect }: { spans: Span[]; node: string; later: boolean; onSelect: (node: string) => void }) {
  const start = Math.min(...spans.map(span => Date.parse(span.start)));
  const end = Math.max(...spans.map(span => Date.parse(span.end)));
  const length = Math.max(1, end - start);
  const failed = spans.some(span => span.status === 'error');
  const [root] = callOrder(spans);
  return (
    <div className={styles.trace} data-later={later ? '' : undefined}>
      <div className={styles.head}>
        <span className="t-mono c-faint">{clockTime(start)}</span>
        <span className="t-mono">{root.span.name}</span>
        <span className="t-mono c-muted">{Math.round(length)} ms</span>
        {failed && <span className={clsx(styles.failed, 't-mono')}>error</span>}
      </div>
      <ul className={styles.spans}>
        {callOrder(spans).map(({ span, depth }) => (
          <li key={span.spanId} className={styles.span} data-own={span.node === node ? '' : undefined} data-status={span.status} style={{ '--depth': depth } as CSSProperties}>
            <button type="button" className={clsx(styles.name, 't-mono')} onClick={() => onSelect(span.node)}>{span.node.replace(/^[a-z]+:/, '')}</button>
            <span className={styles.track}>
              <span
                className={styles.bar}
                style={{ '--from': (Date.parse(span.start) - start) / length, '--share': Math.max(0.01, (Date.parse(span.end) - Date.parse(span.start)) / length) } as CSSProperties}
              />
            </span>
            <span className="t-mono c-muted">{span.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
