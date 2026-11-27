import { MAX_COMPARED_RUNS } from '../api/constraints';

/** The most runs whose trajectories the side panel sets side by side. */
export const MAX_PANEL_TRAJECTORIES = 2;

/**
 * A comparison's state: the runs set side by side, the rows opened in place, the runs whose trajectories the side
 * panel shows, and the labels those trajectories are filtered to.
 */
export interface ComparisonView {
  compared: string[];

  /** Rows opened in place, each named as rowKeyOf names it */
  expand: string[];

  /** Each one of the compared runs; the side panel is closed when empty */
  panel: string[];

  /** Annotation categories; every step shows when empty */
  labels: string[];

  /** Whether the checks block lists every check rather than only those the runs disagree on */
  allChecks: boolean;
}

/** A comparison with nothing chosen, opened or filtered, which its address leaves unsaid. */
export const EMPTY_COMPARISON: ComparisonView = { compared: [], expand: [], panel: [], labels: [], allChecks: false };

/** A list in the address is its ids joined by commas. */
export const LIST_SEPARATOR = ',';

/** The address parameters a comparison keeps its state in. */
export const COMPARISON_LISTS = ['compared', 'expand', 'panel', 'labels'] as const satisfies readonly (keyof ComparisonView)[];

/** Choices show at once, outside the router's transition, so quick successive choices build on each other. */
export const COMPARISON_NAVIGATE_OPTIONS = { replace: true, preventScrollReset: true, flushSync: true } as const;

/** A comparison's state from an address; more runs than a comparison holds, or a trajectory of a run it does not hold, fails the page. */
export function parseComparisonView(params: URLSearchParams): ComparisonView {
  const [compared, expand, panel, labels] = COMPARISON_LISTS.map(name => params.get(name)?.split(LIST_SEPARATOR) ?? []);
  if (compared.length > MAX_COMPARED_RUNS || new Set(compared).size < compared.length) {
    throw new Error(`a comparison holds at most ${MAX_COMPARED_RUNS} different runs`);
  }
  if (panel.length > MAX_PANEL_TRAJECTORIES || !panel.every(run => compared.includes(run))) {
    throw new Error(`the side panel shows at most ${MAX_PANEL_TRAJECTORIES} of the compared runs' trajectories`);
  }
  return { compared, expand, panel, labels, allChecks: params.get('allChecks') === 'true' };
}

/** What a comparison asks of its page: the page answers each with the address it comes to. */
export interface ComparisonIntents {
  /** Adds a run to the comparison or takes it out, and its trajectory out of the side panel with it */
  onCompare: (runId: string) => void;

  /** Opens rows in place, or closes them when every one of them is open already */
  onExpand: (keys: string[]) => void;

  /** Shows a run's trajectory in the side panel, alone unless the panel shows it already */
  onTrajectory: (runId: string) => void;

  /** Adds a run's trajectory to the side panel or takes it out; adding one more than fits takes out the earliest */
  onPanelRun: (runId: string) => void;

  onClosePanel: () => void;

  /** Shows or stops showing the steps an annotation category labels */
  onLabel: (label: string) => void;

  onAllChecks: (all: boolean) => void;
}

/** The intents of a comparison as new addresses of the page showing it. */
export function intentsOf<View extends ComparisonView>(view: View, onView: (next: View) => void): ComparisonIntents {
  return {
    onCompare: run => onView(view.compared.includes(run)
      ? { ...view, compared: view.compared.filter(id => id !== run), panel: view.panel.filter(id => id !== run) }
      : { ...view, compared: [...view.compared, run] }),
    onExpand: keys => {
      const open = keys.every(key => view.expand.includes(key));
      onView({ ...view, expand: open ? view.expand.filter(key => !keys.includes(key)) : [...view.expand, ...keys.filter(key => !view.expand.includes(key))] });
    },
    onTrajectory: run => onView(view.panel.includes(run) ? view : { ...view, panel: [run] }),
    onPanelRun: run => onView({ ...view, panel: view.panel.includes(run) ? view.panel.filter(id => id !== run) : [...view.panel, run].slice(-MAX_PANEL_TRAJECTORIES) }),
    onClosePanel: () => onView({ ...view, panel: [] }),
    onLabel: label => onView({ ...view, labels: view.labels.includes(label) ? view.labels.filter(id => id !== label) : [...view.labels, label] }),
    onAllChecks: allChecks => onView({ ...view, allChecks }),
  };
}
