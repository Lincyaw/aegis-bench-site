import type { RunDetail } from '../api/client';

/** The five views of a run, in the order its tabs show them; each is labelled by runs.tab.<view>. */
export const RUN_TABS = ['input', 'output', 'grading', 'failure', 'trajectory'] as const;
export type RunTab = (typeof RUN_TABS)[number];

/** A failed run opens on why it failed, an execution failure on its trajectory, a passed run on what it produced. */
export function defaultRunTab(run: RunDetail): RunTab {
  switch (run.outcome) {
    case 'failed': return 'failure';
    case 'executionFailed': return 'trajectory';
    case 'passed': return 'output';
  }
}

/** The tools the harnesses expose; each is named by runs.tools.<tool>, and any other tool by its own name. */
export const KNOWN_TOOLS = [
  'read_file', 'edit_file', 'run_command', 'write_test', 'run_tests', 'query_metrics', 'query_logs', 'query_traces',
  'read_topology', 'run_ops_command', 'edit_config', 'submit',
] as const;
export type KnownTool = (typeof KNOWN_TOOLS)[number];

export function isKnownTool(name: string): name is KnownTool {
  return KNOWN_TOOLS.some(tool => tool === name);
}
