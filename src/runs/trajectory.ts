import type { SubmissionVerdict, TimelineMark, Trajectory, TrajectoryStep } from '../api/client';

/** The verdict a submit step carries as `extra.submission` on its observation result, as the API declares. */
export function submissionOf(step: TrajectoryStep): SubmissionVerdict | undefined {
  const extra = step.observation?.results[0]?.extra as { submission?: SubmissionVerdict } | undefined;
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
  const target = args?.path ?? args?.command ?? args?.query ?? args?.service;
  return typeof target === 'string' ? target : '';
}

export function textOf(content: TrajectoryStep['message'] | undefined): string {
  if (content === undefined) {
    return '';
  }
  return typeof content === 'string' ? content : content.map(part => (part.type === 'text' ? part.text : `[${part.type}]`)).join('\n');
}
