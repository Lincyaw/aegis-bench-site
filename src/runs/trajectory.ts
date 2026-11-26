import type { SubmissionVerdict, TrajectoryStep } from '../api/client';

/** The verdict a submit step carries as `extra.submission` on its observation result, as the API declares. */
export function submissionOf(step: TrajectoryStep): SubmissionVerdict | undefined {
  const extra = step.observation?.results[0]?.extra as { submission?: SubmissionVerdict } | undefined;
  return extra?.submission;
}

export function textOf(content: TrajectoryStep['message'] | undefined): string {
  if (content === undefined) {
    return '';
  }
  return typeof content === 'string' ? content : content.map(part => (part.type === 'text' ? part.text : `[${part.type}]`)).join('\n');
}
