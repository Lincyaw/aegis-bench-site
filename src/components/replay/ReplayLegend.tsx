import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { touchKindValues } from '../../api/schema';
import { CHANGE_GLYPHS } from './frame';
import marks from './marks.module.css';
import styles from './ReplayLegend.module.css';

/** The marks a legend explains, each drawn as the canvas draws it. */
const LEGEND_NODES = [
  { key: 'untouched', mark: 'untouched' },
  { key: 'seen', mark: 'seen' },
  { key: 'read', mark: 'read' },
  { key: 'write', mark: 'write' },
  { key: 'current', mark: 'untouched', current: 'write' },
  { key: 'linked', mark: 'linked' },
  { key: 'removed', mark: 'removed' },
] as const;

/** What the replay's marks mean and how its counts are counted; the hint beside the replay's controls holds it. */
export function ReplayLegend() {
  const { t } = useTranslation();
  return (
    <div className={styles.legend}>
      <ul className={styles.items}>
        {LEGEND_NODES.map(entry => (
          <li key={entry.key} className={styles.item}>
            <span className={clsx(marks.node, styles.node)} data-mark={entry.mark} data-current={'current' in entry ? entry.current : undefined}><span className="t-mono">node</span></span>
            <span className="t-micro">{t(`console.replay.legend.${entry.key}`)}</span>
          </li>
        ))}
        <li className={styles.item}>
          <span className={styles.swatches}>{touchKindValues.map(kind => <span key={kind} className={marks.cell} data-kind={kind} />)}</span>
          <span className="t-micro">{t('console.replay.legend.cells')}</span>
        </li>
        <li className={styles.item}>
          <span className={styles.swatches}>{Object.values(CHANGE_GLYPHS).map(glyph => <span key={glyph} className={marks.badge}>{glyph}</span>)}</span>
          <span className="t-micro">{t('console.replay.legend.changes')}</span>
        </li>
      </ul>
      <p className="t-micro c-muted">{t('console.replay.legend.counts')}</p>
    </div>
  );
}
