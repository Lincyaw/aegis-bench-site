import type { Locale, RunReplay } from '../api/types';
import { benchmarkOf } from './benchmarks';
import { keepsSignals, openedIndexes, readFootprint, readSignals, readWorld } from './records';

/*
 * A run replayed over its task's world: the benchmark's layers and panel, the world as the data directory keeps it for
 * the task, and the footprint and signals the run's directory keeps, as an offline mapper drew them. A benchmark whose
 * panel shows no signals keeps none, and its replays report nothing.
 */

/** The run's replay, or nothing when there is no such run or its benchmark declares no world layers. */
export async function replayOf(runId: string, locale: Locale): Promise<RunReplay | undefined> {
  const located = openedIndexes().runs.get(runId);
  const record = located && benchmarkOf(located.benchmarkId).record;
  if (!located || !record?.worldLayers) {
    return undefined;
  }
  const panel = record.blocks.replayPanel;
  if (!panel) {
    throw new Error(`${record.id} declares world layers but no blocks for the replay's panel`);
  }
  const [world, footprint, signals] = await Promise.all([
    readWorld(record.id, located.fact.taskId), readFootprint(record, runId), keepsSignals(record) ? readSignals(record, runId) : { series: [], logs: [], spans: [] },
  ]);
  return { layers: record.worldLayers.map(layer => ({ ...layer, name: layer.name[locale] })), panel, world, footprint, signals };
}
