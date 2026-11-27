import { z } from 'zod';

/**
 * What a report's frontmatter declares. The public site checks it when it loads, the console's preview as a draft
 * changes and the mock server before it saves a draft, so a document one accepts the others accept.
 */
export const ReportFrontmatter = z.object({
  title: z.string().min(1),
  date: z.iso.date(),
  summary: z.string().min(1),

  /** Ids of the models and benchmarks the report is about; their pages link to it */
  models: z.array(z.string()).default([]),
  benchmarks: z.array(z.string()).default([]),
});
