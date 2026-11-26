import { clsx } from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Touch, TouchKind, WorldLayer, WorldNode } from '../../api/types';
import { ChevronIcon } from '../../ui/controls';
import { Hint } from '../../ui/hint';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '../../ui/media';
import { CHANGE_GLYPHS, focusOf, type ReplayFrame } from './frame';
import { NODE_HEIGHT, across, bandLines, drawnNodes, layoutBands, nodeWidth, pathKey, type BandLine, type Placed } from './layout';
import { NodeCard } from './NodeCard';
import { useWidth } from './useWidth';
import marks from './marks.module.css';
import styles from './ReplayCanvas.module.css';

/** How far the cursor stands off the node it rides on, and how much room the canvas keeps round it when it follows. */
export const CURSOR_MARGIN = 5;
export const FOLLOW_MARGIN = 48;

/** A line from a node the current step acts on to a node it reaches in another layer. */
interface DrawnLink {
  key: string;
  d: string;
  kind: TouchKind | undefined;
}

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
 * badges and the step's reach across layers as lines. A frame changes in three beats: what goes fades out, including
 * every line whose nodes move; the nodes move to their places and a cursor glides to where the run's attention went,
 * the canvas scrolling after it; then what comes appears, the lines on their new paths.
 * A node's card opens while the pointer rests on it, a click opens it in the side panel, and a parent folds what it holds.
 */
export function ReplayCanvas({ layers, frame, nodes, parents, folded, hidden, touchesByNode, selected, onSelect, onFold }: ReplayCanvasProps) {
  const { t } = useTranslation();
  const [scroller, width] = useWidth<HTMLDivElement>();
  const statusOf = useCallback((node: WorldNode) => (node.status && node.status !== 'healthy' ? t(`console.replay.status.${node.status}`) : undefined), [t]);
  const drawing = useMemo(
    () => layoutBands(layers, nodes, frame.edges, width, node => nodeWidth(node.label, statusOf(node), parents.has(node.id))),
    [layers, nodes, frame.edges, width, parents, statusOf],
  );
  const placed = useMemo(() => drawnNodes(drawing.bands), [drawing]);
  const rects = new Map(placed.map(entry => [entry.node.id, entry]));
  const touched = (id: string) => frame.history.has(id);
  const links: DrawnLink[] = frame.links.flatMap(edge => {
    const source = frame.current.has(edge.from) ? edge.from : edge.to;
    const target = source === edge.from ? edge.to : edge.from;
    const [from, to] = [rects.get(source), rects.get(target)];
    return from && to ? [{ key: `${edge.from} ${edge.to}`, d: across(from, to), kind: frame.current.get(source) }] : [];
  });

  // What the last frame drew and this one does not fades out where it was before the nodes move. A line is the same
  // line only on the same path: one whose nodes move goes with the old frame and comes back with the new.
  const [previous, setPrevious] = useState({ drawing, placed, links, leaving: { nodes: [] as Placed[], links: [] as DrawnLink[], lines: [] as BandLine[] } });
  if (previous.drawing !== drawing) {
    const ids = new Set(placed.map(entry => entry.node.id));
    const [linkKeys, lineKeys] = [new Set(links.map(pathKey)), new Set(bandLines(drawing).map(pathKey))];
    setPrevious({
      drawing, placed, links,
      leaving: {
        nodes: previous.placed.filter(entry => !ids.has(entry.node.id)),
        links: previous.links.filter(link => !linkKeys.has(pathKey(link))),
        lines: bandLines(previous.drawing).filter(line => !lineKeys.has(pathKey(line))),
      },
    });
  }
  const leaving = previous.drawing === drawing ? previous.leaving : { nodes: [], links: [], lines: [] };

  // The cursor rides on the node the run's attention is on, and the canvas scrolls to keep it in view.
  const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const focus = focusOf(frame, touchesByNode, new Set(rects.keys()));
  const focusRect = focus && rects.get(focus.node);
  useEffect(() => {
    const element = scroller.current;
    if (!element) {
      throw new Error('the canvas renders its scroller before its effects run');
    }
    if (!focusRect) {
      return;
    }
    const left = Math.min(Math.max(element.scrollLeft, focusRect.x + focusRect.width + FOLLOW_MARGIN - element.clientWidth), focusRect.x - FOLLOW_MARGIN);
    const top = Math.min(Math.max(element.scrollTop, focusRect.y + focusRect.height + FOLLOW_MARGIN - element.clientHeight), focusRect.y - FOLLOW_MARGIN);
    if (left !== element.scrollLeft || top !== element.scrollTop) {
      element.scrollTo({ left, top, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }, [scroller, focusRect, reduceMotion]);
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
              {placement.guides.map(({ key, d }) => <path key={pathKey({ key, d })} d={d} className={styles.guide} />)}
              {placement.edges.map(({ edge, d }) => (
                <path key={pathKey({ key: `${edge.from} ${edge.to} ${edge.type}`, d })} d={d} className={styles.edge} data-touched={touched(edge.from) && touched(edge.to) ? '' : undefined} />
              ))}
            </g>
          ))}
          {leaving.lines.map(line => <path key={`leaving ${pathKey(line)}`} d={line.d} transform={`translate(${line.x} ${line.y})`} className={styles[line.kind]} data-leaving="" />)}
          {links.map(link => <path key={pathKey(link)} d={link.d} pathLength={1} className={styles.link} data-kind={link.kind} />)}
          {leaving.links.map(link => <path key={`leaving ${pathKey(link)}`} d={link.d} className={styles.link} data-kind={link.kind} data-leaving="" />)}
        </svg>
        {drawing.bands.flatMap(({ layer, origin, placement }) => placement.boxes.map(entry => (
          <div key={`box ${entry.node.id}`} className={styles.box} style={{ transform: `translate(${origin.x + entry.x}px, ${origin.y + entry.y}px)`, width: entry.width, height: entry.height }} data-layer={layer.id} />
        )))}
        {leaving.nodes.map(({ node, x, y, width: nodeWidthAt }) => (
          <div key={`leaving ${node.id}`} className={clsx(marks.node, styles.node, styles.leaving)} data-mark="removed" style={{ transform: `translate(${x}px, ${y}px)`, width: nodeWidthAt, height: NODE_HEIGHT }} aria-hidden="true">
            <span className={clsx(styles.select, 't-mono')}>{node.label}</span>
          </div>
        ))}
        {placed.map(box)}
        {focusRect && (
          <div
            className={styles.cursor} data-current={focus.current ? '' : undefined} aria-hidden="true"
            style={{ transform: `translate(${focusRect.x - CURSOR_MARGIN}px, ${focusRect.y - CURSOR_MARGIN}px)`, width: focusRect.width + 2 * CURSOR_MARGIN, height: focusRect.height + 2 * CURSOR_MARGIN }}
          />
        )}
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
