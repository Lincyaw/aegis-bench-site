import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { Touch, WorldNode } from '../../api/types';
import marks from './marks.module.css';
import styles from './NodeCard.module.css';

/** The attributes a card shows before it leaves the rest to the panel. */
export const CARD_ATTRIBUTES = 4;

/**
 * What a node is, at a glance while the pointer rests on it: its id and kind, its status, the attributes the world
 * records for it, how often the run has touched it so far and how it last did, and what a fold holds out of view.
 * Each kind of node shows its own attributes, as the world records them.
 */
export function NodeCard({ node, status, touches, hidden }: {
  node: WorldNode;

  /** The word for the node's status in its layer, when the replay marks it */
  status: string | undefined;

  touches: Touch[];
  hidden: number | undefined;
}) {
  const { t } = useTranslation();
  const last = touches.at(-1);
  const attributes = Object.entries(node.attrs ?? {});
  return (
    <div className={styles.card}>
      <p className="t-mono">{node.id}</p>
      <p className={styles.kind}>
        <span className="t-mono c-muted">{node.type}</span>
        {status !== undefined && <span className={marks.status} data-status={node.status}>{status}</span>}
      </p>
      {attributes.length > 0 && (
        <dl className={styles.attributes}>
          {attributes.slice(0, CARD_ATTRIBUTES).map(([name, value]) => (
            <div key={name} className={styles.attribute}>
              <dt className="t-mono c-faint">{name}</dt>
              <dd className="t-mono">{typeof value === 'string' ? value : JSON.stringify(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="t-micro c-muted">
        {last ? `${t('console.replay.card.touches', { count: touches.length })} · ${t('console.replay.card.last', { step: last.step, verb: last.verb })}` : t('console.replay.card.untouched')}
      </p>
      {hidden !== undefined && <p className="t-micro c-muted">{t('console.replay.card.hidden', { count: hidden })}</p>}
      <p className={clsx(styles.foot, 't-micro c-faint')}>{t('console.replay.card.open')}</p>
    </div>
  );
}
