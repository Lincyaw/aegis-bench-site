import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Touch, TouchKind, TrajectoryStep, WorldEvent, WorldLayer } from '../../api/types';
import { InfoHint } from '../../ui/hint';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '../../ui/media';
import { AtifFields, AtifStepSummary } from '../trajectory/AtifStep';
import { changeDetail, nodeOfChange } from './frame';
import marks from './marks.module.css';
import styles from './ReplayTrajectory.module.css';

/**
 * The trajectory beside the world: every step a row as ATIF records it, with a cell per layer for what the step did
 * to it. The current step opens in place to what it did in the record's own words: its calls' arguments, the nodes it
 * touched and the events it caused, each node a way to open it in the panel. The steps still to come are faded.
 */
export function ReplayTrajectory({ steps, layers, layerTouches, touches, events, current, onStep, onSelect }: {
  steps: TrajectoryStep[];
  layers: WorldLayer[];
  layerTouches: Map<number, Map<string, TouchKind>>;

  /** The current step's touches and events */
  touches: Touch[];
  events: WorldEvent[];

  current: number;
  onStep: (step: number) => void;
  onSelect: (node: string) => void;
}) {
  const { t } = useTranslation();
  const currentRow = useRef<HTMLLIElement>(null);
  const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  // A block, not an expression: browsers that return a promise from scrollIntoView would hand React a cleanup that is not a function.
  useEffect(() => {
    currentRow.current?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [current, reduceMotion]);
  const node = (id: string) => <button type="button" className={styles.node} onClick={() => onSelect(id)}>{id}</button>;
  const field = (name: string, lines: ReactNode[]) => lines.length > 0 && (
    <div className={styles.field}>
      <span className="t-mono c-faint">{name}</span>
      <div className={styles.lines}>{lines}</div>
    </div>
  );
  return (
    <section className={styles.trajectory} aria-label={t('console.replay.trajectory')}>
      <header className={styles.head}>
        <span className={styles.title}>
          <span className="t-label">{t('console.replay.trajectory')}</span>
          <span className="t-micro c-faint">{t('console.replay.steps', { count: steps.length })}</span>
        </span>
        <span className={styles.title}>
          <span className="t-micro c-faint">{t('console.replay.layerCells.label')}</span>
          <InfoHint label={t('console.replay.layerCells.label')}>{t('console.replay.layerCells.hint', { layers: layers.map(layer => layer.name).join(t('console.replay.layerCells.separator')) })}</InfoHint>
        </span>
      </header>
      <ol className={styles.rows}>
        {steps.map(step => (
          <li key={step.step_id} ref={step.step_id === current ? currentRow : undefined} className={styles.step} data-later={step.step_id > current ? '' : undefined}>
            <button type="button" className={styles.row} aria-current={step.step_id === current ? 'step' : undefined} onClick={() => onStep(step.step_id)}>
              <AtifStepSummary step={step} />
              <span className={styles.cells} aria-hidden="true">
                {layers.map(layer => <span key={layer.id} className={styles.slot}><span className={marks.cell} data-kind={layerTouches.get(step.step_id)?.get(layer.id)} /></span>)}
              </span>
            </button>
            {step.step_id === current && (touches.length > 0 || events.length > 0 || (step.tool_calls ?? []).length > 0) && (
              <div className={styles.detail}>
                {(step.tool_calls ?? []).map(call => (
                  <div key={call.tool_call_id} className={styles.field}>
                    <span className="t-mono c-faint">arguments</span>
                    <AtifFields record={call.arguments} />
                  </div>
                ))}
                {field('touches', touches.map((touch, index) => (
                  <span key={`${touch.node} ${index}`} className={styles.line}><span className="t-mono c-muted">{touch.verb}</span>{node(touch.node)}</span>
                )))}
                {field('events', events.map((event, index) => {
                  const id = nodeOfChange(event.change);
                  return (
                    <span key={index} className={styles.line}>
                      <span className="t-mono c-muted">{event.change.type}</span>
                      {id === undefined ? <span className="t-mono">{changeDetail(event.change)}</span> : node(id)}
                    </span>
                  );
                }))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
