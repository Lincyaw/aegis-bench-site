import type { Combination, EntrantKey } from '../api/types';
import { consoleBenchmarkPath } from '../console/consoleMap';

/** Whether a release's entrant names this combination of the benchmark. */
export function isEntrant(key: EntrantKey, entrant: Combination): boolean {
  return key.modelId === entrant.model.id && key.harnessId === entrant.harness.id;
}

/** A benchmark's releases in the console. */
export function benchmarkReleasesPath(benchmarkId: string): string {
  return `${consoleBenchmarkPath(benchmarkId)}/releases`;
}

export function releasePath(benchmarkId: string, releaseId: string): string {
  return `${benchmarkReleasesPath(benchmarkId)}/${releaseId}`;
}
