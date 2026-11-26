import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Touch, WorldEdge, WorldEvent, WorldNode } from '../../api/types';
import { IconButton } from '../../ui/controls';
import { AtifFields } from '../trajectory/AtifStep';
import { changeDetail } from './frame';
import marks from './marks.module.css';
import styles from './NodePanel.module.css';

/**
 * A node in full, in the side panel: its record as the world keeps it at the step, every step that touched it and every
 * event that changed it over the whole run, the steps after the current one faded, then its edges within and across
 * layers and what it holds. Every step and every node named is a way to go there.
 */
export function NodePanel({ node, layerName, touches, events, edges, members, step, onStep, onSelect, onClose }: {
  node: WorldNode;
  layerName: string;
  touches: Touch[];
  events: WorldEvent[];
  edges: WorldEdge[];

  /** The nodes it holds */
  members: WorldNode[];
  step: number;
  onStep: (step: number) => void;
  onSelect: (node: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const stepRow = (key: string, at: number, className: string, cells: ReactNode) => (
    <li key={key}>
      <button type="button" className={clsx(styles.row, className)} aria-current={at === step ? 'step' : undefined} data-later={at > step ? '' : undefined} onClick={() => onStep(at)}>
        <span className="t-mono c-faint">{at}</span>
        {cells}
      </button>
    </li>
  );
  const nodeRow = (key: string, id: string, cells: ReactNode) => (
    <li key={key}>
      <button type="button" className={clsx(styles.row, styles.nodeRow)} onClick={() => onSelect(id)}>{cells}</button>
    </li>
  );
  return (
    <aside className={styles.panel} aria-label={t('console.replay.panel.label', { node: node.label })}>
      <header className={styles.head}>
        <div className={styles.title}>
          <span className="t-mono">{node.id}</span>
          <span className="t-micro c-faint">{layerName}</span>
        </div>
        <IconButton label={t('console.replay.panel.close')} onClick={onClose} variant="quiet">
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </IconButton>
      </header>
      <div className={styles.body}>
        <section className={styles.section}>
          <h2 className="t-micro c-faint">{t('console.replay.panel.record')}</h2>
          <AtifFields record={node} />
        </section>
        <section className={styles.section}>
          <h2 className="t-micro c-faint">{t('console.replay.panel.touches')}</h2>
          {touches.length === 0 ? <p className="t-small c-faint">{t('console.replay.panel.none')}</p> : (
            <ul className={styles.rows}>
              {touches.map((touch, index) => stepRow(`${touch.step} ${index}`, touch.step, styles.touchRow, (
                <>
                  <span className={marks.cell} data-kind={touch.kind} />
                  <span className="t-mono">{touch.verb}</span>
                  <span className="t-mono c-muted">{touch.kind}</span>
                </>
              )))}
            </ul>
          )}
        </section>
        {events.length > 0 && (
          <section className={styles.section}>
            <h2 className="t-micro c-faint">{t('console.replay.panel.events')}</h2>
            <ul className={styles.rows}>
              {events.map((event, index) => stepRow(`${event.step} ${index}`, event.step, styles.eventRow, (
                <>
                  <span className="t-mono">{event.change.type}</span>
                  <span className="t-mono c-muted">{changeDetail(event.change)}</span>
                </>
              )))}
            </ul>
          </section>
        )}
        {edges.length > 0 && (
          <section className={styles.section}>
            <h2 className="t-micro c-faint">{t('console.replay.panel.edges')}</h2>
            <ul className={styles.rows}>
              {edges.map(edge => {
                const other = edge.from === node.id ? edge.to : edge.from;
                return nodeRow(`${edge.from} ${edge.to} ${edge.type}`, other, (
                  <>
                    <span className="t-mono c-muted">{edge.from === node.id ? `${edge.type} →` : `← ${edge.type}`}</span>
                    <span className="t-mono">{other}</span>
                  </>
                ));
              })}
            </ul>
          </section>
        )}
        {members.length > 0 && (
          <section className={styles.section}>
            <h2 className="t-micro c-faint">{t('console.replay.panel.children', { count: members.length })}</h2>
            <ul className={styles.rows}>{members.map(member => nodeRow(member.id, member.id, <span className="t-mono">{member.label}</span>))}</ul>
          </section>
        )}
      </div>
    </aside>
  );
}
