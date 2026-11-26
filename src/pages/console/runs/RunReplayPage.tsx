import { useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleRun, useConsoleRunReplay, useConsoleTrajectories } from '../../../api/consoleClient';
import type { WorldNode } from '../../../api/types';
import { eventsByStep, footprintNodes, frameAt, layerTouchesByStep, nodeOfChange, unfoldedNodes } from '../../../components/replay/frame';
import { childrenOf } from '../../../components/replay/layout';
import { NodePanel } from '../../../components/replay/NodePanel';
import { editAt, nodeSignalsOf, seenViewOf, stepClockOf } from '../../../components/replay/panel';
import { useWidth } from '../../../components/replay/useWidth';
import { ReplayCanvas } from '../../../components/replay/ReplayCanvas';
import { ReplayLegend } from '../../../components/replay/ReplayLegend';
import { STEP_BEAT_MS, type ReplaySpeed } from '../../../components/replay/playback';
import { ReplayPlayback } from '../../../components/replay/ReplayPlayback';
import { ReplayTrajectory } from '../../../components/replay/ReplayTrajectory';
import { OutcomeBadge } from '../../../components/run/Outcome';
import { consoleBenchmarkPath } from '../../../routes/console';
import { REPLAY_VIEWS, parseReplayView, replaySearch, type ReplayView } from '../../../routes/consoleReplay';
import { consoleRunPath, consoleRunsPath } from '../../../routes/consoleRuns';
import { SegmentedControl, ToggleChip } from '../../../ui/controls';
import { InfoHint } from '../../../ui/hint';
import { Breadcrumbs } from '../../../ui/navigation';
import { ResizeHandle } from '../../../ui/resizer';
import { useStoredSize } from '../../../ui/storedSize';
import styles from './RunReplayPage.module.css';

/** Where the browser keeps the widths the reader gives the trajectory and the side panel, and the widths they start at. */
export const TRAJECTORY_WIDTH_KEY = 'aegis.replay.trajectoryWidth';
export const PANEL_WIDTH_KEY = 'aegis.replay.panelWidth';
export const TRAJECTORY_WIDTH = 400;
export const PANEL_WIDTH = 380;

/** No column narrows below this, and the canvas keeps at least this much beside a widened panel. */
export const COLUMN_MIN = 280;
export const CANVAS_MIN = 240;

/**
 * A run replayed over its task's world, filling the window: the trajectory down the left, the world's layers beside
 * it, the open node in a side panel, and the playback along the foot. The reader sizes the trajectory and the panel,
 * and the panel can take the canvas's room. The step, the view, the hidden layers, the folds, the open node and how
 * its panel shows it live in the address; playing moves the step one beat at a time.
 */
export function RunReplayPage() {
  const { t } = useTranslation();
  const { benchmarkId = '', runId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const run = useConsoleRun(runId);
  const [trajectory] = useConsoleTrajectories([runId]);
  const { layers, panel, world, footprint, signals } = useConsoleRunReplay(runId);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>('1');
  const [maximized, setMaximized] = useState(false);
  const [body, bodyWidth] = useWidth<HTMLDivElement>();
  // Until the columns have laid out their room is unknown, and no width is cut down to fit it.
  const widest = (room: number) => (bodyWidth > 0 ? Math.max(COLUMN_MIN, room) : Number.POSITIVE_INFINITY);
  const [trajectoryWidth, setTrajectoryWidth] = useStoredSize(TRAJECTORY_WIDTH_KEY, TRAJECTORY_WIDTH, COLUMN_MIN, widest(bodyWidth / 2));
  const [panelWidth, setPanelWidth] = useStoredSize(PANEL_WIDTH_KEY, PANEL_WIDTH, COLUMN_MIN, widest(bodyWidth - trajectoryWidth - CANVAS_MIN));
  const parsed = parseReplayView(params);
  const stepIds = trajectory.steps.map(entry => entry.step_id);
  const step = parsed.step ?? stepIds[0];
  const index = stepIds.indexOf(step);
  if (index < 0) {
    throw new Error(`run ${runId} has no step ${step}`);
  }
  const previous = index > 0 ? stepIds[index - 1] : undefined;
  const next = stepIds.at(index + 1);
  const last = stepIds[stepIds.length - 1];
  const view: ReplayView = { ...parsed, step };
  const onView = (change: Partial<ReplayView>) => setParams(replaySearch({ ...view, ...change }), { replace: true, preventScrollReset: true });

  useEffect(() => {
    if (!playing || next === undefined) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setParams(current => replaySearch({ ...parseReplayView(current), step: next }), { replace: true, preventScrollReset: true });
      if (next === last) {
        setPlaying(false);
      }
    }, STEP_BEAT_MS / Number(speed));
    return () => clearTimeout(timer);
  }, [playing, next, last, speed, setParams]);

  const frame = frameAt(world, footprint, step);
  const clock = stepClockOf(trajectory.steps);
  const layerTouches = layerTouchesByStep(world, footprint);
  const events = eventsByStep(footprint);
  const everyNode = new Map<string, WorldNode>([
    ...world.nodes.map(node => [node.id, node] as const),
    ...footprint.events.flatMap(({ change }) => (change.type === 'addNode' ? [[change.node.id, change.node] as const] : [])),
  ]);
  const inView = (view.view === 'footprint' ? footprintNodes(frame) : frame.nodes).filter(node => !view.hidden.includes(node.layer));
  const folded = new Set(view.folded);
  const unfolded = unfoldedNodes(inView, folded);
  const touchesByNode = Map.groupBy(footprint.touches.filter(touch => touch.step <= step), touch => touch.node);
  const shownLayers = layers.filter(layer => !view.hidden.includes(layer.id));
  const nodeOf = (id: string) => {
    const node = frame.nodes.find(candidate => candidate.id === id) ?? everyNode.get(id);
    if (!node) {
      throw new Error(`run ${runId} names node ${id}, which its world never has`);
    }
    return node;
  };
  const selected = view.node === undefined ? undefined : nodeOf(view.node);
  const layerNameOf = (node: WorldNode) => {
    const layer = layers.find(candidate => candidate.id === node.layer);
    if (!layer) {
      throw new Error(`node ${node.id} lies in layer ${node.layer}, which the benchmark does not declare`);
    }
    return layer.name;
  };
  const onSelect = (id: string) => onView({ node: id === view.node ? undefined : id });
  const toggled = (list: string[], id: string) => (list.includes(id) ? list.filter(entry => entry !== id) : [...list, id]);
  const selectedTouches = selected ? footprint.touches.filter(touch => touch.node === selected.id) : [];
  const seen = seenViewOf(selectedTouches, step, trajectory.steps);
  const scope = seen ? view.scope ?? 'seen' : 'whole';

  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <header className={styles.head}>
        <div className={styles.text}>
          <Breadcrumbs crumbs={[
            { label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) },
            { label: t('console.runs.title'), to: consoleRunsPath(benchmark.id) },
            { label: run.task.id, to: consoleRunPath(benchmark.id, run.id, { tab: 'trajectory', step }) },
            { label: t('console.replay.title') },
          ]} />
          <div className={styles.heading}>
            <h1 className="t-heading">{run.task.title}</h1>
            <span className="t-small c-muted">{t('console.run.label', { model: run.model.name, harness: run.harness.name, attempt: run.attempt })}</span>
            <OutcomeBadge outcome={run.outcome} />
          </div>
        </div>
        <div className={styles.controls}>
          <SegmentedControl
            label={t('console.replay.view.label')} choices={REPLAY_VIEWS.map(value => ({ value, label: t(`console.replay.view.${value}`) }))}
            value={view.view} onChange={value => onView({ view: value })}
          />
          <div className={styles.layers} role="group" aria-label={t('console.replay.layers')}>
            {layers.map(layer => {
              const shown = !view.hidden.includes(layer.id);
              return (
                <ToggleChip key={layer.id} pressed={shown} disabled={shown && shownLayers.length === 1} onToggle={() => onView({ hidden: toggled(view.hidden, layer.id) })}>
                  {layer.name}
                </ToggleChip>
              );
            })}
          </div>
          <InfoHint label={t('console.replay.legend.label')}><ReplayLegend /></InfoHint>
        </div>
      </header>
      <div
        ref={body} className={styles.body} data-panel={selected ? '' : undefined} data-maximized={selected && maximized ? '' : undefined}
        style={{ '--trajectory-width': `${trajectoryWidth}px`, '--panel-width': `${panelWidth}px` } as CSSProperties}
      >
        <ReplayTrajectory
          steps={trajectory.steps} layers={shownLayers} layerTouches={layerTouches} current={step} onStep={id => onView({ step: id })} onSelect={onSelect}
          touches={footprint.touches.filter(touch => touch.step === step)} events={events.get(step) ?? []}
        />
        <ResizeHandle
          label={t('console.replay.resizeTrajectory')} size={trajectoryWidth} min={COLUMN_MIN} max={Math.max(COLUMN_MIN, bodyWidth / 2)} grows="end"
          onResize={setTrajectoryWidth} onReset={() => setTrajectoryWidth(TRAJECTORY_WIDTH)}
        />
        <ReplayCanvas
          layers={shownLayers} frame={frame} nodes={unfolded.nodes} parents={new Set(childrenOf(inView).keys())} folded={folded} hidden={unfolded.hidden} touchesByNode={touchesByNode}
          selected={view.node} onSelect={onSelect} onFold={id => onView({ folded: toggled(view.folded, id) })}
        />
        {selected && (
          <>
            <ResizeHandle
              label={t('console.replay.resizePanel')} size={panelWidth} min={COLUMN_MIN} max={Math.max(COLUMN_MIN, bodyWidth - trajectoryWidth - CANVAS_MIN)} grows="start"
              onResize={setPanelWidth} onReset={() => setPanelWidth(PANEL_WIDTH)}
            />
            <NodePanel
              node={selected} layerName={layerNameOf(selected)} blocks={panel} step={step} clock={clock} scope={scope} seen={seen}
              signals={nodeSignalsOf(signals, selected.id)} touches={selectedTouches}
              events={footprint.events.filter(event => nodeOfChange(event.change) === selected.id)}
              edges={frame.edges.filter(edge => edge.from === selected.id || edge.to === selected.id)}
              members={frame.nodes.filter(node => node.parent === selected.id)}
              edit={seen && seen.touch.kind === 'write' ? editAt(world, footprint, selected.id, seen.touch.step) : undefined}
              maximized={maximized} onMaximize={setMaximized} onScope={value => onView({ scope: value })}
              onStep={id => onView({ step: id })} onSelect={id => onView({ node: id, scope: undefined })} onClose={() => onView({ node: undefined, scope: undefined })}
            />
          </>
        )}
      </div>
      <ReplayPlayback
        timeline={run.timeline} layers={shownLayers} layerTouches={layerTouches} events={events} current={step} last={last}
        playing={playing} speed={speed} onStep={id => onView({ step: id })} onPlay={setPlaying} onSpeed={setSpeed}
        onPrevious={previous === undefined ? undefined : () => onView({ step: previous })} onNext={next === undefined ? undefined : () => onView({ step: next })}
      />
    </div>
  );
}
