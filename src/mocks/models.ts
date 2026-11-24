import type { ModelProfile } from '../api/client';
import { BENCHMARKS, benchmarkRef, leaderboardOf } from './benchmarks';
import { MODELS, PUBLISHED_ON, modelById } from './catalog';

const REPORTS: Record<string, ModelProfile['reports']> = {
  jia: [
    { id: 'report-rollback-export', publishedOn: '2026-10-25', kind: '报告', title: '智能体为何在回退后仍能导出完整结果' },
    { id: 'report-harness-effect', publishedOn: '2026-09-12', kind: '报告', title: '评测框架对编码任务成绩的影响' },
  ],
};

export function hasModel(modelId: string): boolean {
  return MODELS.some(model => model.id === modelId);
}

/** A model's best combination and rank on every benchmark it entered, and its score under each harness. */
export function modelProfile(modelId: string): ModelProfile {
  const model = modelById(modelId);
  const entered = BENCHMARKS.filter(record => record.ranking.some(([rankedModel]) => rankedModel === modelId)).map(record => record.copy);
  const standings = entered.map(copy => {
    const board = leaderboardOf(copy.id);
    const best = board.find(entry => entry.model.id === modelId)!;
    return {
      benchmark: benchmarkRef(copy.id), stage: copy.stage, metric: copy.metric,
      bestHarness: best.harness, rank: best.rank, entrants: board.length, score: best.score,
    };
  });
  const harnessComparison = entered.map(copy => ({
    benchmark: benchmarkRef(copy.id), half: copy.stage.half, metric: copy.metric,
    scores: leaderboardOf(copy.id).filter(entry => entry.model.id === modelId).map(entry => ({ harness: entry.harness, score: entry.score })),
  }));
  const harnessIds = new Set(harnessComparison.flatMap(comparison => comparison.scores.map(score => score.harness.id)));
  return {
    model,
    summary: `${model.vendor} 发布的通用模型，已在 ${entered.length} 个评测基准上完成评测。各评测基准分别排名，不计算综合分。`,
    lastEvaluatedOn: PUBLISHED_ON, harnessCount: harnessIds.size, standings, harnessComparison, reports: REPORTS[modelId] ?? [],
  };
}
