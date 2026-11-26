import type { Locale, RunReplay } from '../api/types';
import { benchmarkOf } from './benchmarks';
import { openedIndexes, readFootprint, readWorld } from './records';

/*
 * A run replayed over its task's world: the benchmark's layers, the world as the data directory keeps it for the task,
 * and the footprint the run's directory keeps, as an offline mapper drew it from the trajectory.
 */

/** The run's replay, or nothing when there is no such run or its benchmark declares no world layers. */
export async function replayOf(runId: string, locale: Locale): Promise<RunReplay | undefined> {
  const located = openedIndexes().runs.get(runId);
  const record = located && benchmarkOf(located.benchmarkId).record;
  if (!located || !record?.worldLayers) {
    return undefined;
  }
  const [world, footprint] = await Promise.all([readWorld(record.id, located.fact.taskId), readFootprint(record, runId)]);
  return { layers: record.worldLayers.map(layer => ({ ...layer, name: layer.name[locale] })), world, footprint };
}
