import type { TimelineMark, Trajectory, TrajectoryStep } from './api/client';

/** How the site names each tool the harnesses expose. */
export const TOOL_LABELS: Record<string, string> = {
  read_file: '读取文件',
  edit_file: '修改代码',
  run_command: '运行命令',
  write_test: '编写测试',
  run_tests: '运行测试',
  query_metrics: '查询指标',
  query_logs: '查询日志',
  query_traces: '查询调用链',
  read_topology: '读取拓扑',
  run_ops_command: '执行处置',
  edit_config: '修改配置',
  submit: '提交',
};

/** The submission verdict a harness attaches to the observation of a submit call. */
export interface SubmissionResult {
  passed: boolean;
  passedChecks: number;
  totalChecks: number;
}

export function submissionOf(step: TrajectoryStep): SubmissionResult | undefined {
  const extra = step.observation?.results[0]?.extra as { submission?: SubmissionResult } | undefined;
  return extra?.submission;
}

/** The timeline mark of a step: a submission by its verdict, any other call by whether its tool is a change tool. */
export function markOf(step: TrajectoryStep, changeTools: string[]): TimelineMark {
  const submission = submissionOf(step);
  if (submission) {
    return submission.passed ? 'submitPassed' : 'submitFailed';
  }
  const tool = step.tool_calls?.[0]?.function_name;
  return tool !== undefined && changeTools.includes(tool) ? 'change' : 'action';
}

export function agentSteps(trajectory: Trajectory): TrajectoryStep[] {
  return trajectory.steps.filter(step => step.source === 'agent');
}

/** The argument a step row shows next to its tool: a path, a command or a query. */
export function targetOf(step: TrajectoryStep): string {
  const args = step.tool_calls?.[0]?.arguments as Record<string, unknown> | undefined;
  return String(args?.path ?? args?.command ?? args?.query ?? args?.service ?? '');
}

export function textOf(content: TrajectoryStep['message'] | undefined): string {
  if (content === undefined) {
    return '';
  }
  return typeof content === 'string' ? content : content.map(part => (part.type === 'text' ? part.text : `[${part.type}]`)).join('\n');
}
