import { useTranslation } from 'react-i18next';
import type { ReplayPanelBlock } from '../../api/types';
import { PANEL_SCOPES, type PanelScope } from '../../routes/consoleReplay';
import { IconButton, SegmentedControl } from '../../ui/controls';
import { PANEL_BLOCKS } from './blocks';
import type { PanelBlockProps } from './panel';
import { PanelSection } from './PanelBlocks';
import styles from './NodePanel.module.css';

/**
 * A node in full, in the side panel. When the agent saw some of the node's data, the panel shows either what it saw at
 * the step that last showed it, the call's output first as the trajectory records it, or the node's data whole; the
 * benchmark's blocks follow in its order. The panel widens to the whole canvas for a node with much to read.
 */
export function NodePanel({ layerName, blocks, maximized, onScope, onMaximize, onClose, ...props }: PanelBlockProps & {
  layerName: string;
  blocks: ReplayPanelBlock[];
  maximized: boolean;
  onScope: (scope: PanelScope) => void;
  onMaximize: (maximized: boolean) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { node, scope, seen } = props;
  return (
    <aside className={styles.panel} aria-label={t('console.replay.panel.label', { node: node.label })}>
      <header className={styles.head}>
        <div className={styles.title}>
          <span className="t-mono">{node.id}</span>
          <span className="t-micro c-faint">{layerName}</span>
        </div>
        <span className={styles.actions}>
          <IconButton label={t(maximized ? 'console.replay.panel.restore' : 'console.replay.panel.maximize')} onClick={() => onMaximize(!maximized)} variant="quiet">
            <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
              <path d={maximized ? 'M5 2v3H2M7 10V7h3M5 5 2 2M7 7l3 3' : 'M7 2h3v3M5 10H2V7M10 2 7 5M2 10l3-3'} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconButton>
          <IconButton label={t('console.replay.panel.close')} onClick={onClose} variant="quiet">
            <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </IconButton>
        </span>
      </header>
      <div className={styles.body}>
        {seen && (
          <SegmentedControl
            label={t('console.replay.panel.scope')} value={scope} onChange={onScope}
            choices={PANEL_SCOPES.map(value => ({ value, label: value === 'seen' ? t('console.replay.panel.seen', { step: seen.touch.step }) : t('console.replay.panel.whole') }))}
          />
        )}
        {seen && scope === 'seen' && (
          <PanelSection title={t('console.replay.panel.output', { step: seen.touch.step, verb: seen.touch.verb })}>
            <pre className={styles.output}>{seen.output}</pre>
          </PanelSection>
        )}
        {blocks.map(block => {
          const Block = PANEL_BLOCKS[block];
          return <Block key={block} {...props} />;
        })}
      </div>
    </aside>
  );
}
