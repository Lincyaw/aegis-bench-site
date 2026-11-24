import type { BenchmarkSummary, Half, ModelProfile, Stage } from '../api/client';
import { formatScore } from '../leaderboard/presentation';

/** Message keys of the two halves of the loop. */
export const HALF_LABELS: Record<Half, 'lifecycle.half.dev' | 'lifecycle.half.ops'> = { dev: 'lifecycle.half.dev', ops: 'lifecycle.half.ops' };

/** What the map writes beside a stage: a primary line and a fainter one. */
export interface StageLabel {
  primary: string;
  secondary: string;
}

/** The names of a stage's benchmarks, in one line. */
export function benchmarkNames(stage: Stage): string {
  return stage.benchmarks.map(benchmark => benchmark.name).join(' · ');
}

/** On the benchmarks page each covered stage is labelled with its benchmarks' names. */
export function benchmarkStageLabels(stages: Stage[]): Record<string, StageLabel> {
  return Object.fromEntries(stages.filter(stage => stage.benchmarks.length > 0).map(stage => [
    stage.id, { primary: benchmarkNames(stage), secondary: `${stage.id} ${stage.name}` },
  ]));
}

/** On a model's page each stage is labelled with the model's rank and score there, or its rank per benchmark where a stage has several. */
export function modelStageLabels(profile: ModelProfile, rankOf: (rank: number) => string): Record<string, StageLabel> {
  const byStage = Map.groupBy(profile.standings, standing => standing.stage.id);
  return Object.fromEntries([...byStage].map(([stageId, standings]) => [stageId, standings.length === 1
    ? { primary: `${rankOf(standings[0].rank)} · ${formatScore(standings[0].score, standings[0].metric)}`, secondary: `${standings[0].benchmark.name} · ${stageId}` }
    : {
        primary: standings.map(standing => `${standing.benchmark.shortName} ${rankOf(standing.rank)}`).join(' · '),
        secondary: `${standings.map(standing => standing.benchmark.name).join(' · ')} · ${stageId}`,
      },
  ]));
}

/** The summaries of the benchmarks published at a stage. */
export function benchmarksAt(stage: Stage, benchmarks: BenchmarkSummary[]): BenchmarkSummary[] {
  return stage.benchmarks.map(ref => {
    const summary = benchmarks.find(candidate => candidate.id === ref.id);
    if (!summary) {
      throw new Error(`stage ${stage.id} lists ${ref.id}, which the benchmark list lacks`);
    }
    return summary;
  });
}
