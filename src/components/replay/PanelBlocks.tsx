import { clsx } from 'clsx';
import { Fragment, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Span } from '../../api/types';
import { AtifFields } from '../trajectory/AtifStep';
import { ContentView } from './ContentView';
import { changeDetail } from './frame';
import { LogList } from './LogList';
import { contentRows, diffRows, linesSeen, type PanelBlockProps } from './panel';
import { TimeSeriesChart } from './TimeSeriesChart';
import { TraceWaterfall } from './TraceWaterfall';
import marks from './marks.module.css';
import styles from './PanelBlocks.module.css';

/*
 * The blocks of a node's side panel. Each shows the node's part of one kind of data, as the agent saw it at a step or
 * whole, and nothing for a node without it; a benchmark lists the blocks its panel uses, in order.
 */

export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className="t-micro c-faint">{title}</h2>
      {children}
    </section>
  );
}

/** The node's record as the world keeps it at the step; a file's text has a block of its own. */
export function RecordBlock({ node }: PanelBlockProps) {
  const { t } = useTranslation();
  return <PanelSection title={t('console.replay.panel.record')}><AtifFields record={Object.fromEntries(Object.entries(node).filter(([name]) => name !== 'content'))} /></PanelSection>;
}

/** A file's or a part's text, in the file's line numbers: the lines the agent saw or the edit the step made, or all of it with every line seen so far marked. */
export function ContentBlock({ node, scope, seen, step, touches, firstLine, edit }: PanelBlockProps) {
  const { t } = useTranslation();
  if (node.content === undefined) {
    return null;
  }
  const lines = seen?.touch.view.lines;
  const rows = scope === 'whole' ? contentRows(node.content, linesSeen(touches, step), undefined, firstLine)
    : edit ? diffRows(edit.before, edit.after, edit.firstLine)
      : lines ? contentRows(node.content, [lines], lines, firstLine) : undefined;
  return rows && (
    <PanelSection title={t('console.replay.panel.content')}>
      {rows.length === 0 ? <p className="t-small c-faint">{t('console.replay.panel.unchanged')}</p> : <ContentView rows={rows} />}
    </PanelSection>
  );
}

/** The node's metrics: the series the agent queried over the window it asked about, or every series over the whole run. */
export function MetricsBlock({ scope, seen, step, clock, signals, touches, onStep }: PanelBlockProps) {
  const { t } = useTranslation();
  const view = seen?.touch.view;
  const shown = scope === 'whole' ? signals.series : signals.series.filter(series => view?.series?.includes(series.name));
  if (shown.length === 0) {
    return null;
  }
  const ticks = [...new Set(touches.flatMap(touch => clock.times.get(touch.step) ?? []))];
  return (
    <PanelSection title={t('console.replay.panel.metrics')}>
      {shown.map(series => {
        const start = Date.parse(series.start);
        const whole = { from: start, to: start + (series.values.length - 1) * series.intervalSeconds * 1000 };
        const range = scope === 'seen' && view?.from && view.to ? { from: Date.parse(view.from), to: Date.parse(view.to) } : whole;
        const windows = scope === 'seen' ? [] : touches.flatMap(touch => (touch.step <= step && touch.view?.from && touch.view.to && touch.view.series?.includes(series.name)
          ? [{ from: Date.parse(touch.view.from), to: Date.parse(touch.view.to) }] : []));
        return (
          <TimeSeriesChart
            key={series.name} series={series} {...range} pointer={clock.times.get(step)} windows={windows} ticks={ticks}
            onTime={time => onStep(clock.nearest(time))}
          />
        );
      })}
    </PanelSection>
  );
}

/** The node's log entries: those the agent's query returned, or every one the node wrote or whose stack runs through it. */
export function LogsBlock({ scope, seen, step, clock, signals, onSelect }: PanelBlockProps) {
  const { t } = useTranslation();
  const ids = seen?.touch.view.logs;
  if (scope === 'seen' && ids === undefined) {
    return null;
  }
  const entries = scope === 'whole' ? signals.logs : signals.logs.filter(entry => ids?.includes(entry.id));
  if (scope === 'whole' && entries.length === 0) {
    return null;
  }
  return (
    <PanelSection title={t('console.replay.panel.logs', { count: entries.length })}>
      {entries.length === 0 ? <p className="t-small c-faint">{t('console.replay.panel.noLogs')}</p> : <LogList entries={entries} moment={clock.times.get(step)} onSelect={onSelect} />}
    </PanelSection>
  );
}

/** The traces through the node: those the agent's query returned, or every one over the run, scrolled to the step's moment. */
export function TracesBlock({ node, scope, seen, step, clock, signals, onSelect }: PanelBlockProps) {
  const { t } = useTranslation();
  const box = useRef<HTMLDivElement>(null);
  const rule = useRef<HTMLHRElement>(null);
  const moment = clock.times.get(step);
  useLayoutEffect(() => {
    const [list, marker] = [box.current, rule.current];
    if (list && marker) {
      list.scrollTop = marker.offsetTop - list.clientHeight / 2;
    }
  }, [moment, scope]);
  const ids = seen?.touch.view.traces;
  if (scope === 'seen' && ids === undefined) {
    return null;
  }
  const traces = scope === 'whole' ? signals.traces : signals.traces.filter(([root]) => ids?.includes(root.traceId));
  if (scope === 'whole' && traces.length === 0) {
    return null;
  }
  const later = (spans: Span[]) => moment !== undefined && Date.parse(spans[0].start) > moment;
  const firstLater = traces.findIndex(later);
  return (
    <PanelSection title={t('console.replay.panel.traces', { count: traces.length })}>
      {traces.length === 0 ? <p className="t-small c-faint">{t('console.replay.panel.noTraces')}</p> : (
        <div ref={box} className={styles.traces}>
          {traces.map((spans, index) => (
            <Fragment key={spans[0].traceId}>
              {index === firstLater && <hr ref={rule} className={styles.now} title={t('console.replay.panel.now')} />}
              <TraceWaterfall spans={spans} node={node.id} later={later(spans)} onSelect={onSelect} />
            </Fragment>
          ))}
          {firstLater < 0 && moment !== undefined && <hr ref={rule} className={styles.now} title={t('console.replay.panel.now')} />}
        </div>
      )}
    </PanelSection>
  );
}

/** Every step that touched the node over the run, the steps after the current one faded; each goes to its step. */
export function TouchesBlock({ step, touches, onStep }: PanelBlockProps) {
  const { t } = useTranslation();
  return (
    <PanelSection title={t('console.replay.panel.touches')}>
      {touches.length === 0 ? <p className="t-small c-faint">{t('console.replay.panel.none')}</p> : (
        <ul className={styles.rows}>
          {touches.map((touch, index) => (
            <li key={`${touch.step} ${index}`}>
              <button type="button" className={clsx(styles.row, styles.touchRow)} aria-current={touch.step === step ? 'step' : undefined} data-later={touch.step > step ? '' : undefined} onClick={() => onStep(touch.step)}>
                <span className="t-mono c-faint">{touch.step}</span>
                <span className={marks.cell} data-kind={touch.kind} />
                <span className="t-mono">{touch.verb}</span>
                <span className="t-mono c-muted">{touch.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  );
}

/** Every event that changed the node over the run, as the footprint records it; each goes to its step. */
export function EventsBlock({ step, events, onStep }: PanelBlockProps) {
  const { t } = useTranslation();
  return events.length > 0 && (
    <PanelSection title={t('console.replay.panel.events')}>
      <ul className={styles.rows}>
        {events.map((event, index) => (
          <li key={`${event.step} ${index}`}>
            <button type="button" className={clsx(styles.row, styles.eventRow)} aria-current={event.step === step ? 'step' : undefined} data-later={event.step > step ? '' : undefined} onClick={() => onStep(event.step)}>
              <span className="t-mono c-faint">{event.step}</span>
              <span className="t-mono">{event.change.type}</span>
              <span className="t-mono c-muted">{event.change.type === 'setNode' && event.change.content !== undefined ? `${event.change.node}  content` : changeDetail(event.change)}</span>
            </button>
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

/** The node's edges within and across layers, and the nodes it holds; each goes to the node at its other end. */
export function EdgesBlock({ node, edges, members, onSelect }: PanelBlockProps) {
  const { t } = useTranslation();
  const row = (key: string, id: string, cells: ReactNode) => (
    <li key={key}><button type="button" className={clsx(styles.row, styles.nodeRow)} onClick={() => onSelect(id)}>{cells}</button></li>
  );
  return (
    <>
      {edges.length > 0 && (
        <PanelSection title={t('console.replay.panel.edges')}>
          <ul className={styles.rows}>
            {edges.map(edge => {
              const other = edge.from === node.id ? edge.to : edge.from;
              return row(`${edge.from} ${edge.to} ${edge.type}`, other, (
                <>
                  <span className="t-mono c-muted">{edge.from === node.id ? `${edge.type} →` : `← ${edge.type}`}</span>
                  <span className="t-mono">{other}</span>
                </>
              ));
            })}
          </ul>
        </PanelSection>
      )}
      {members.length > 0 && (
        <PanelSection title={t('console.replay.panel.children', { count: members.length })}>
          <ul className={styles.rows}>{members.map(member => row(member.id, member.id, <span className="t-mono">{member.label}</span>))}</ul>
        </PanelSection>
      )}
    </>
  );
}
