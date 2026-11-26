import { LIST_SEPARATOR } from './comparison';
import { consoleRunPath } from './consoleRuns';

/** The ways a replay draws its world: every node, or only what the run has touched and what holds it. */
export const REPLAY_VIEWS = ['global', 'footprint'] as const;
export type ReplayViewMode = (typeof REPLAY_VIEWS)[number];

/** The view a replay opens in, which its address leaves unsaid. */
export const DEFAULT_REPLAY_VIEW: ReplayViewMode = 'global';

/**
 * A replay's state in its address: the step it shows, the view, the layers the reader hid, the nodes the reader folded
 * and the node open in the side panel. A replay without a step shows the trajectory's first.
 */
export interface ReplayView {
  step?: number;
  view: ReplayViewMode;
  hidden: string[];
  folded: string[];
  node?: string;
}

/** A replay's state from its address; a step or a view outside its set fails the page rather than showing something else. */
export function parseReplayView(params: URLSearchParams): ReplayView {
  const step = params.get('step') ?? undefined;
  const view = params.get('view') ?? DEFAULT_REPLAY_VIEW;
  if (step !== undefined && !Number.isInteger(Number(step))) {
    throw new Error(`no step ${step}`);
  }
  if (!REPLAY_VIEWS.includes(view as ReplayViewMode)) {
    throw new Error(`a replay has no view ${view}`);
  }
  return {
    step: step === undefined ? undefined : Number(step), view: view as ReplayViewMode,
    hidden: params.get('hide')?.split(LIST_SEPARATOR) ?? [], folded: params.get('fold')?.split(LIST_SEPARATOR) ?? [], node: params.get('node') ?? undefined,
  };
}

/** Address parameters for a replay's state, leaving out what is unset or the default. */
export function replaySearch(view: Partial<ReplayView>): URLSearchParams {
  const params = new URLSearchParams();
  if (view.step !== undefined) {
    params.set('step', String(view.step));
  }
  if (view.view !== undefined && view.view !== DEFAULT_REPLAY_VIEW) {
    params.set('view', view.view);
  }
  if (view.hidden?.length) {
    params.set('hide', view.hidden.join(LIST_SEPARATOR));
  }
  if (view.folded?.length) {
    params.set('fold', view.folded.join(LIST_SEPARATOR));
  }
  if (view.node !== undefined) {
    params.set('node', view.node);
  }
  return params;
}

/** A run's replay in the console, in the state given. */
export function consoleRunReplayPath(benchmarkId: string, runId: string, view: Partial<ReplayView> = {}): string {
  const search = replaySearch(view).toString();
  return `${consoleRunPath(benchmarkId, runId)}/replay${search ? `?${search}` : ''}`;
}
