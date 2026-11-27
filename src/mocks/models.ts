import type { Locale, ModelProfile } from '../api/types';
import { benchmarkRef } from './benchmarks';
import { modelRecordOf, modelRef, stageRef } from './catalog';
import { publishedEntriesOf } from './published';
import { openedIndexes } from './records';

/**
 * A model's best combination and rank on every benchmark it entered, its score under each harness, and when its results
 * were last published; nothing when the current releases publish none of its combinations.
 */
export function modelProfile(modelId: string, locale: Locale): ModelProfile | undefined {
  const records = openedIndexes().benchmarks.map(benchmark => benchmark.record);
  const entered = records.filter(record => publishedEntriesOf(record.id, locale).some(entry => entry.model.id === modelId));
  const lastEvaluatedOn = entered.map(record => record.updatedOn).toSorted().at(-1);
  if (!lastEvaluatedOn) {
    return undefined;
  }
  const standings = entered.map(record => {
    const board = publishedEntriesOf(record.id, locale);
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
    scores: publishedEntriesOf(record.id, locale).filter(entry => entry.model.id === modelId).map(entry => ({ harness: entry.harness, score: entry.score })),
  }));
  const harnessIds = new Set(harnessComparison.flatMap(comparison => comparison.scores.map(score => score.harness.id)));
  return {
    model: modelRef(modelId, locale), summary: modelRecordOf(modelId).summary[locale],
    lastEvaluatedOn, harnessCount: harnessIds.size, standings, harnessComparison,
  };
}
