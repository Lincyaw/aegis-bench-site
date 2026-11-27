import type { TFunction } from 'i18next';
import type { Stage } from '../../api/types';
import { BENCHMARKS_PATH, benchmarkPath, stagePath } from '../../routes/site';
import type { Crumb } from '../../ui/navigation';
import { stageName } from '../result/presentation';

/**
 * The pages above a benchmark's own pages: the benchmarks, the benchmark's stage and the benchmark. A page below the
 * benchmark's page gives the crumbs under it, and the benchmark then leads back to its page; the benchmark's page ends with it.
 */
export function benchmarkCrumbs(t: TFunction, benchmark: { id: string; name: string; stage: Pick<Stage, 'id' | 'name'> }, below: Crumb[] = []): Crumb[] {
  return [
    { label: t('site.nav.benchmarks'), to: BENCHMARKS_PATH },
    { label: stageName(benchmark.stage), to: stagePath(benchmark.stage.id) },
    { label: benchmark.name, to: below.length > 0 ? benchmarkPath(benchmark.id) : undefined },
    ...below,
  ];
}
