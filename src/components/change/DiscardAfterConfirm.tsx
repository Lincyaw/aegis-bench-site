import { clsx } from 'clsx';
import { useState } from 'react';
import content from '../../ui/content.module.css';
import { Button } from '../../ui/controls';
import { ChangeFailure } from './ChangeFailure';
import styles from './DiscardAfterConfirm.module.css';

/**
 * A button that drops something, which asks again before it does: the confirmation is the one outlined button, and
 * leaving it is quiet. `reasons` say what the API's refusals mean where the discard is asked for.
 */
export function DiscardAfterConfirm({ labels, error, reasons, onConfirm }: {
  labels: { discard: string; lead: string; confirm: string; cancel: string }; error: Error | null; reasons?: Partial<Record<number, string>>; onConfirm: () => void;
}) {
  const [asking, setAsking] = useState(false);
  return asking ? (
    <div className={clsx(content.panel, styles.asking)}>
      <p className="t-small c-muted">{labels.lead}</p>
      <ChangeFailure error={error} reasons={reasons} />
      <div className={styles.buttons}>
        <Button variant="line" onClick={onConfirm}>{labels.confirm}</Button>
        <Button variant="quiet" onClick={() => setAsking(false)}>{labels.cancel}</Button>
      </div>
    </div>
  ) : <div className={styles.buttons}><Button variant="line" onClick={() => setAsking(true)}>{labels.discard}</Button></div>;
}
