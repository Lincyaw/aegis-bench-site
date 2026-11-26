import { clsx } from 'clsx';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Touch, WorldLayer, WorldNode } from '../../api/types';
import { ChevronIcon } from '../../ui/controls';
import { Hint } from '../../ui/hint';
import { CHANGE_GLYPHS, type ReplayFrame } from './frame';
import { BOX_HEAD, BOX_PADDING, NODE_HEIGHT, across, canvasRects, layoutBands, nodeWidth, type Placed } from './layout';
import { NodeCard } from './NodeCard';
import marks from './marks.module.css';
import styles from './ReplayCanvas.module.css';

export interface ReplayCanvasProps {
  layers: WorldLayer[];
  frame: ReplayFrame;

  /** The nodes to draw: the frame's or its footprint's, less what folds hold */
  nodes: WorldNode[];

  /** The nodes that hold others in view before any fold, which can fold */
  parents: ReadonlySet<string>;

  folded: ReadonlySet<string>;

  /** How many nodes each folded node holds out of view */
  hidden: Map<string, number>;

  /** Each node's touches up to the step */
  touchesByNode: Map<string, Touch[]>;

  selected: string | undefined;
  onSelect: (node: string) => void;
  onFold: (node: string) => void;
}

/**
 * The world at a step: every layer a band, laid out by its shape, the run's marks on its nodes, the step's events as
 * badges and the step's reach across layers as lines. Nodes slide to their new places as the frame changes. A node's
 * card opens while the pointer rests on it, a click opens it in the side panel, and a parent folds what it holds.
 */
export function ReplayCanvas({ layers, frame, nodes, parents, folded, hidden, touchesByNode, selected, onSelect, onFold }: ReplayCanvasProps) {
  const { t } = useTranslation();
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) {
      throw new Error('the canvas renders its scroller before its layout effect runs');
    }
    const measure = () => setWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const statusOf = useCallback((node: WorldNode) => (node.status && node.status !== 'healthy' ? t(`console.replay.status.${node.status}`) : undefined), [t]);
  const drawing = useMemo(
    () => layoutBands(layers, nodes, frame.edges, width, node => nodeWidth(node.label, statusOf(node), parents.has(node.id))),
    [layers, nodes, frame.edges, width, parents, statusOf],
  );
  const rects = canvasRects(drawing.bands);
  const touched = (id: string) => frame.history.has(id);
  const box = (entry: Placed) => (
    <WorldNodeBox
      key={entry.node.id} entry={entry} frame={frame} status={statusOf(entry.node)} parent={parents.has(entry.node.id)} folded={folded.has(entry.node.id)}
      hidden={hidden.get(entry.node.id)} touches={touchesByNode.get(entry.node.id) ?? []} selected={selected === entry.node.id} onSelect={onSelect} onFold={onFold}
    />
  );
  return (
    <div ref={scroller} className={styles.scroller} role="region" aria-label={t('console.replay.canvas')}>
      <div className={styles.canvas} style={{ width: drawing.width, height: drawing.height }}>
        <div className={styles.bands}>
          {drawing.bands.map(band => {
            const own = frame.nodes.filter(node => node.layer === band.layer.id && frame.marks.get(node.id) !== 'removed');
            const kinds = own.map(node => frame.history.get(node.id));
            return (
              <div key={band.layer.id} className={styles.band} style={{ transform: `translateY(${band.top}px)`, height: band.height }}>
                <span className="t-label">{band.layer.name}</span>
                <span className="t-micro c-faint">
                  {[
                    t('console.replay.counts.nodes', { count: own.length }),
                    t('console.replay.counts.visited', { count: kinds.filter(kind => kind === 'read' || kind === 'write').length }),
                    t('console.replay.counts.seen', { count: kinds.filter(kind => kind === 'seen').length }),
                  ].join(' · ')}
                </span>
              </div>
            );
          })}
        </div>
        <svg className={styles.lines} width={drawing.width} height={drawing.height} aria-hidden="true">
          {drawing.bands.map(({ layer, origin, placement }) => (
            <g key={layer.id} style={{ transform: `translate(${origin.x}px, ${origin.y}px)` }}>
              {placement.guides.map(d => <path key={d} d={d} className={styles.guide} />)}
              {placement.edges.map(({ edge, d }) => (
                <path key={`${edge.from} ${edge.to} ${edge.type}`} d={d} className={styles.edge} data-touched={touched(edge.from) && touched(edge.to) ? '' : undefined} />
              ))}
            </g>
          ))}
          {frame.links.flatMap(edge => {
            const source = frame.current.has(edge.from) ? edge.from : edge.to;
            const target = source === edge.from ? edge.to : edge.from;
            const [from, to] = [rects.get(source), rects.get(target)];
            return from && to ? [<path key={`${edge.from} ${edge.to}`} d={across(from, to)} className={styles.link} data-kind={frame.current.get(source)} />] : [];
          })}
        </svg>
        {drawing.bands.flatMap(({ layer, origin, placement }) => [
          ...placement.boxes.map(entry => (
            <div key={`box ${entry.node.id}`} className={styles.box} style={{ transform: `translate(${origin.x + entry.x}px, ${origin.y + entry.y}px)`, width: entry.width, height: entry.height }} data-layer={layer.id} />
          )),
          ...placement.boxes.map(entry => box({ ...entry, x: origin.x + entry.x + BOX_PADDING, y: origin.y + entry.y + (BOX_HEAD - NODE_HEIGHT) / 2, width: entry.width - 2 * BOX_PADDING })),
          ...placement.nodes.map(entry => box({ ...entry, x: origin.x + entry.x, y: origin.y + entry.y })),
        ])}
      </div>
    </div>
  );
}

/** One node on the canvas: its mark, its label and status, its card on hover, its fold when it holds others, its event's badge. */
export function WorldNodeBox({ entry, frame, status, parent, folded, hidden, touches, selected, onSelect, onFold }: {
  entry: Placed; frame: ReplayFrame; status: string | undefined; parent: boolean; folded: boolean; hidden: number | undefined; touches: Touch[]; selected: boolean;
  onSelect: (node: string) => void; onFold: (node: string) => void;
}) {
  const { t } = useTranslation();
  const { node, x, y, width } = entry;
  const change = frame.changes.get(node.id);
  return (
    <div
      className={clsx(marks.node, styles.node)} data-mark={frame.marks.get(node.id)} data-current={frame.current.get(node.id)}
      style={{ transform: `translate(${x}px, ${y}px)`, width, height: NODE_HEIGHT }}
    >
      <Hint content={<NodeCard node={node} touches={touches} hidden={hidden} />}>
        <button type="button" className={styles.select} aria-pressed={selected} onClick={() => onSelect(node.id)}>
          <span className="t-mono">{node.label}</span>
          {status !== undefined && <span className={marks.status} data-status={node.status}>{status}</span>}
        </button>
      </Hint>
      {parent && (
        <button
          type="button" className={styles.fold} aria-expanded={!folded} onClick={() => onFold(node.id)}
          aria-label={t(folded ? 'console.replay.unfold' : 'console.replay.fold', { node: node.label })}
        >
          {folded && hidden !== undefined ? <span className="t-mono">+{hidden}</span> : <ChevronIcon />}
        </button>
      )}
      {change && <span className={clsx(marks.badge, styles.badge)} aria-hidden="true">{CHANGE_GLYPHS[change]}</span>}
    </div>
  );
}
