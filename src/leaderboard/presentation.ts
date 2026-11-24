import type { LeaderboardView, Metric } from '../api/client';
import { leaderboardViewValues } from '../api/schema';

export function formatScore(score: number, metric: Metric): string {
  return metric.unit === 'percent' ? `${(score * 100).toFixed(1)}%` : score.toFixed(2);
}

/** Entries the leaderboard shows at first and adds each time the reader asks for more. */
export const LEADERBOARD_PAGE_SIZE = 20;

/** Message keys of the leaderboard's views, in the order the switch shows them. */
export const LEADERBOARD_VIEW_LABELS: Record<LeaderboardView, 'leaderboard.view.combination' | 'leaderboard.view.model' | 'leaderboard.view.harness'> = {
  combination: 'leaderboard.view.combination',
  model: 'leaderboard.view.model',
  harness: 'leaderboard.view.harness',
};

/** The view a leaderboard address names; an address naming no view shows the combinations. */
export function parseLeaderboardView(value: string | null): LeaderboardView {
  const view = value ?? 'combination';
  if (!leaderboardViewValues.includes(view as LeaderboardView)) {
    throw new Error(`no leaderboard view ${view}`);
  }
  return view as LeaderboardView;
}
