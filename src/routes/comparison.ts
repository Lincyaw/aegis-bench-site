import { MAX_COMPARED_RUNS } from '../api/constraints';

/** The most runs whose trajectories the side panel sets side by side. */
export const MAX_PANEL_TRAJECTORIES = 2;

/**
 * A comparison's state: the runs set side by side, the rows opened in place, the runs whose trajectories the side
 * panel shows, and the labels those trajectories are filtered to.
 */
export interface ComparisonView {
  runs: string[];

  /** Rows opened in place, each named as rowKeyOf names it */
  expand: string[];

  /** Each one of runs; the side panel is closed when empty */
  trajectory: string[];

  /** Annotation categories; every step shows when empty */
  labels: string[];
}

/** A list in the address is its ids joined by commas. */
export const LIST_SEPARATOR = ',';

/** The address parameters a comparison keeps its state in. */
export const COMPARISON_PARAMS = ['runs', 'expand', 'trajectory', 'labels'] as const satisfies readonly (keyof ComparisonView)[];

/** A comparison's state from an address; more runs than a comparison holds, or a trajectory of a run it does not hold, fails the page. */
export function parseComparisonView(params: URLSearchParams): ComparisonView {
  const [runs, expand, trajectory, labels] = COMPARISON_PARAMS.map(name => params.get(name)?.split(LIST_SEPARATOR) ?? []);
  if (runs.length > MAX_COMPARED_RUNS || new Set(runs).size < runs.length) {
    throw new Error(`a comparison holds at most ${MAX_COMPARED_RUNS} different runs`);
  }
  if (trajectory.length > MAX_PANEL_TRAJECTORIES || !trajectory.every(run => runs.includes(run))) {
    throw new Error(`the side panel shows at most ${MAX_PANEL_TRAJECTORIES} of the compared runs' trajectories`);
  }
  return { runs, expand, trajectory, labels };
}

/** Writes a comparison's state into address parameters, leaving out its empty lists. */
export function setComparisonParams(params: URLSearchParams, view: Partial<ComparisonView>) {
  for (const name of COMPARISON_PARAMS) {
    if (view[name]?.length) {
      params.set(name, view[name].join(LIST_SEPARATOR));
    }
  }
}

/** Adds a run to the comparison or takes it out, and its trajectory out of the side panel with it. */
export function withComparedRun<View extends ComparisonView>(view: View, run: string): View {
  return view.runs.includes(run)
    ? { ...view, runs: view.runs.filter(id => id !== run), trajectory: view.trajectory.filter(id => id !== run) }
    : { ...view, runs: [...view.runs, run] };
}

/** Opens rows in place, or closes them when every one of them is open already. */
export function withExpanded<View extends ComparisonView>(view: View, keys: string[]): View {
  const open = keys.every(key => view.expand.includes(key));
  return { ...view, expand: open ? view.expand.filter(key => !keys.includes(key)) : [...view.expand, ...keys.filter(key => !view.expand.includes(key))] };
}

/** Shows a run's trajectory in the side panel, alone unless the panel shows it already. */
export function withTrajectory<View extends ComparisonView>(view: View, run: string): View {
  return view.trajectory.includes(run) ? view : { ...view, trajectory: [run] };
}

/** Adds a run's trajectory to the side panel or takes it out; adding one more than fits takes out the earliest. */
export function withPanelRun<View extends ComparisonView>(view: View, run: string): View {
  return { ...view, trajectory: view.trajectory.includes(run) ? view.trajectory.filter(id => id !== run) : [...view.trajectory, run].slice(-MAX_PANEL_TRAJECTORIES) };
}

/** Shows or stops showing the steps an annotation category labels. */
export function withLabel<View extends ComparisonView>(view: View, label: string): View {
  return { ...view, labels: view.labels.includes(label) ? view.labels.filter(id => id !== label) : [...view.labels, label] };
}
