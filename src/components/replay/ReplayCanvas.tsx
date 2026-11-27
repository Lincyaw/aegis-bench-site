import { clsx } from 'clsx';
import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Touch, TouchKind, WorldLayer, WorldNode } from '../../api/types';
import { ChevronIcon, FitIcon, IconButton, ZoomIcon } from '../../ui/controls';
import { Hint } from '../../ui/hint';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '../../ui/media';
import { CHANGE_GLYPHS, focusOf, type ReplayFrame } from './frame';
import { NODE_HEIGHT, across, bandLines, drawnNodes, layoutBands, nodeWidth, pathKey, type BandLine, type Placed, type Rect } from './layout';
import { NodeCard } from './NodeCard';
import { useWidth } from './useWidth';
import marks from './marks.module.css';
import styles from './ReplayCanvas.module.css';

/** How far the cursor stands off the node it rides on, and how much room the canvas keeps round it when it follows. */
export const CURSOR_MARGIN = 5;
export const FOLLOW_MARGIN = 48;

/**
 * How far the canvas zooms out and in, how much a button zooms it, and how much a wheel's travel zooms it while Ctrl or
 * ⌘ is held. Fitting never zooms past life size, and tries this many scales on its way to the largest that fits.
 */
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 2;
export const ZOOM_FACTOR = 1.25;
export const WHEEL_ZOOM_RATE = 0.002;
export const FIT_TRIES = 8;

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
 * The reader zooms the canvas with its buttons or the wheel while holding Ctrl or ⌘, or fits the whole world to the
 * room; zoomed out, the layers that wrap spread over the wider room. The zoom is the reader's view, so the address
 * does not carry it.
 */
export function ReplayCanvas({ layers, frame, nodes, parents, folded, hidden, touchesByNode, selected, onSelect, onFold }: ReplayCanvasProps) {
  const { t } = useTranslation();
  const [scroller, width] = useWidth<HTMLDivElement>();
  const [zoom, setZoom] = useState(1);
  // A layer may have its own words for statuses, such as passed and failed for tests.
  const statusOf = useCallback((node: WorldNode) => {
    if (!node.status || node.status === 'healthy') {
      return undefined;
    }
    return layers.find(layer => layer.id === node.layer)?.statuses?.[node.status] ?? t(`console.replay.status.${node.status}`);
  }, [layers, t]);
  const widthOf = useCallback((node: WorldNode) => nodeWidth(node.label, statusOf(node), parents.has(node.id)), [statusOf, parents]);
  const drawing = useMemo(() => layoutBands(layers, nodes, frame.edges, width / zoom, widthOf), [layers, nodes, frame.edges, width, zoom, widthOf]);
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

  // The cursor rides on the node the run's attention is on, and the canvas scrolls to keep it in view. It follows when
  // the cursor moves on the drawing, not when the reader zooms.
  const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const focus = focusOf(frame, touchesByNode, new Set(rects.keys()));
  const focusRect = focus && rects.get(focus.node);
  const follow = useEffectEvent((element: HTMLDivElement, rect: Rect) => {
    const [x, y, right, bottom] = [rect.x * zoom, rect.y * zoom, (rect.x + rect.width) * zoom, (rect.y + rect.height) * zoom];
    const left = Math.min(Math.max(element.scrollLeft, right + FOLLOW_MARGIN - element.clientWidth), x - FOLLOW_MARGIN);
    const top = Math.min(Math.max(element.scrollTop, bottom + FOLLOW_MARGIN - element.clientHeight), y - FOLLOW_MARGIN);
    if (left !== element.scrollLeft || top !== element.scrollTop) {
      element.scrollTo({ left, top, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  });
  const [focusX, focusY, focusWidth, focusHeight] = [focusRect?.x, focusRect?.y, focusRect?.width, focusRect?.height];
  useEffect(() => {
    const element = scroller.current;
    if (!element) {
      throw new Error('the canvas renders its scroller before its effects run');
    }
    if (focusX !== undefined && focusY !== undefined && focusWidth !== undefined && focusHeight !== undefined) {
      follow(element, { x: focusX, y: focusY, width: focusWidth, height: focusHeight });
    }
  }, [scroller, focusX, focusY, focusWidth, focusHeight]);

  // A zoom keeps one point of the world where it was: the pointer's for the wheel, the middle for a button, the
  // corner for a fit. The scroll moves to it once the zoomed drawing has laid out.
  const anchor = useRef<{ x: number; y: number; worldX: number; worldY: number } | null>(null);
  const zoomTo = (next: number, at?: { x: number; y: number }) => {
    const element = scroller.current;
    if (!element) {
      throw new Error('the canvas renders its scroller before it can zoom');
    }
    const point = at ?? { x: element.clientWidth / 2, y: element.clientHeight / 2 };
    const kept = { ...point, worldX: (element.scrollLeft + point.x) / zoom, worldY: (element.scrollTop + point.y) / zoom };
    const bounded = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    if (bounded === zoom) {
      element.scrollTo({ left: kept.worldX * zoom - kept.x, top: kept.worldY * zoom - kept.y });
      return;
    }
    anchor.current = kept;
    setZoom(bounded);
  };
  useLayoutEffect(() => {
    const element = scroller.current;
    const kept = anchor.current;
    if (!element || !kept) {
      return;
    }
    anchor.current = null;
    element.scrollTo({ left: kept.worldX * zoom - kept.x, top: kept.worldY * zoom - kept.y });
  }, [scroller, zoom]);
  const onWheel = useEffectEvent((event: WheelEvent, element: HTMLDivElement) => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }
    event.preventDefault();
    const bounds = element.getBoundingClientRect();
    zoomTo(zoom * Math.exp(-event.deltaY * WHEEL_ZOOM_RATE), { x: event.clientX - bounds.left, y: event.clientY - bounds.top });
  });
  useEffect(() => {
    const element = scroller.current;
    if (!element) {
      throw new Error('the canvas renders its scroller before its effects run');
    }
    // Not passive, so holding Ctrl or ⌘ zooms the canvas instead of the page.
    const listener = (event: WheelEvent) => onWheel(event, element);
    element.addEventListener('wheel', listener, { passive: false });
    return () => element.removeEventListener('wheel', listener);
  }, [scroller]);
  // The largest scale, up to life size, at which the drawing laid out for the room it then has fits the room whole.
  const fit = () => {
    const element = scroller.current;
    if (!element) {
      throw new Error('the canvas renders its scroller before it can fit');
    }
    const fits = (scale: number) => {
      const fitted = layoutBands(layers, nodes, frame.edges, element.clientWidth / scale, widthOf);
      return fitted.width * scale <= element.clientWidth + 1 && fitted.height * scale <= element.clientHeight + 1;
    };
    let [low, high] = [ZOOM_MIN, 1];
    if (fits(high)) {
      low = high;
    }
    for (let attempt = 0; attempt < FIT_TRIES && low < high; attempt += 1) {
      const middle = (low + high) / 2;
      [low, high] = fits(middle) ? [middle, high] : [low, middle];
    }
    element.scrollTo({ left: 0, top: 0 });
    zoomTo(low, { x: 0, y: 0 });
  };
  const box = (entry: Placed) => (
    <WorldNodeBox
      key={entry.node.id} entry={entry} frame={frame} status={statusOf(entry.node)} parent={parents.has(entry.node.id)} folded={folded.has(entry.node.id)}
      hidden={hidden.get(entry.node.id)} touches={touchesByNode.get(entry.node.id) ?? []} selected={selected === entry.node.id} onSelect={onSelect} onFold={onFold}
    />
  );
  return (
    <div className={styles.frame}>
      <div ref={scroller} className={styles.scroller} role="region" aria-label={t('console.replay.canvas')}>
        <div className={styles.sizer} style={{ width: drawing.width * zoom, height: drawing.height * zoom }}>
          <div className={styles.canvas} style={{ width: drawing.width, height: drawing.height, transform: `scale(${zoom})` }}>
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
      </div>
      <div className={styles.zoom} role="group" aria-label={t('console.replay.zoom.label')}>
        <IconButton label={t('console.replay.zoom.out')} size="small" variant="quiet" disabled={zoom <= ZOOM_MIN} onClick={() => zoomTo(zoom / ZOOM_FACTOR)}><ZoomIcon direction="out" /></IconButton>
        <button type="button" className={clsx(styles.scale, 't-micro')} aria-label={t('console.replay.zoom.reset')} onClick={() => zoomTo(1)}>{`${Math.round(zoom * 100)}%`}</button>
        <IconButton label={t('console.replay.zoom.in')} size="small" variant="quiet" disabled={zoom >= ZOOM_MAX} onClick={() => zoomTo(zoom * ZOOM_FACTOR)}><ZoomIcon direction="in" /></IconButton>
        <IconButton label={t('console.replay.zoom.fit')} size="small" variant="quiet" onClick={fit}><FitIcon /></IconButton>
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
      <Hint content={<NodeCard node={node} status={status} touches={touches} hidden={hidden} />}>
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
