import { consoleBenchmarkPath } from './console';

/** A benchmark's releases in the console. */
export function benchmarkReleasesPath(benchmarkId: string): string {
  return `${consoleBenchmarkPath(benchmarkId)}/releases`;
}

export function releasePath(benchmarkId: string, releaseId: string): string {
  return `${benchmarkReleasesPath(benchmarkId)}/${releaseId}`;
}
