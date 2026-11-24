import type { Locale, ModelProfile } from '../api/types';
import { BENCHMARKS, benchmarkRef, leaderboardOf } from './benchmarks';
import { MODELS, PUBLISHED_ON, modelRef, stageRef } from './catalog';

export function hasModel(modelId: string): boolean {
  return MODELS.some(model => model.id === modelId);
}

export function modelSummary(vendor: string, benchmarkCount: number, locale: Locale): string {
  return locale === 'en'
    ? `A general-purpose model from ${vendor}, evaluated on ${benchmarkCount} benchmarks. Each benchmark ranks it separately; there is no composite score.`
    : `${vendor} 发布的通用模型，已在 ${benchmarkCount} 个评测基准上完成评测。各评测基准分别排名，不计算综合分。`;
}

/** A model's best combination and rank on every benchmark it entered, and its score under each harness. */
export function modelProfile(modelId: string, locale: Locale): ModelProfile {
  const model = modelRef(modelId, locale);
  const entered = BENCHMARKS.filter(record => record.ranking.some(([rankedModel]) => rankedModel === modelId));
  const standings = entered.map(record => {
    const board = leaderboardOf(record.id, locale);
    const best = board.find(entry => entry.model.id === modelId);
    if (!best) {
      throw new Error(`${modelId} is ranked on ${record.id} but missing from its leaderboard`);
    }
    return {
      benchmark: benchmarkRef(record.id), stage: stageRef(record.stageId, locale), metric: { ...record.metric, name: record.metric.name[locale] },
      bestHarness: best.harness, rank: best.rank, entrants: board.length, score: best.score,
    };
  });
  const harnessComparison = entered.map(record => ({
    benchmark: benchmarkRef(record.id), half: stageRef(record.stageId, locale).half, metric: { ...record.metric, name: record.metric.name[locale] },
    scores: leaderboardOf(record.id, locale).filter(entry => entry.model.id === modelId).map(entry => ({ harness: entry.harness, score: entry.score })),
  }));
  const harnessIds = new Set(harnessComparison.flatMap(comparison => comparison.scores.map(score => score.harness.id)));
  return {
    model, summary: modelSummary(model.vendor, entered.length, locale),
    lastEvaluatedOn: PUBLISHED_ON, harnessCount: harnessIds.size, standings, harnessComparison,
  };
}
