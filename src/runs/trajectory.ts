import type { SubmissionVerdict, TrajectoryStep } from '../api/client';

/** The verdict a submit step carries as `extra.submission` on its observation result, as the API declares. */
export function submissionOf(step: TrajectoryStep): SubmissionVerdict | undefined {
  const extra = step.observation?.results[0]?.extra as { submission?: SubmissionVerdict } | undefined;
  return extra?.submission;
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
