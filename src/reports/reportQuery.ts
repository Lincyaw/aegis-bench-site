import openapi from '../api/openapi.json';
import type { ReportSources } from '../api/types';
import { consoleBenchmarkPath } from '../console/consoleMap';

/** The form a report's directory name takes, as the spec declares it; the new-report form checks it before asking the API. */
export const REPORT_SLUG_PATTERN = openapi.components.schemas['Console.ReportSlug'].pattern;

export function consoleReportsPath(benchmarkId: string): string {
  return `${consoleBenchmarkPath(benchmarkId)}/reports`;
}

export function consoleReportPath(benchmarkId: string, reportId: string): string {
  return `${consoleReportsPath(benchmarkId)}/${reportId}`;
}

/** A document's frontmatter block; each value is written as JSON, which YAML reads as it is. */
export function frontmatterBlock(fields: Record<string, string | string[]>): string {
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n`;
}

/** A new report's documents, naming the benchmark and the day, for the author to fill in. */
export function newReportSources(benchmarkId: string, date: string): ReportSources {
  return {
    'zh-CN': `${frontmatterBlock({ title: '新报告', date, summary: '一句话写下这篇报告的结论。', benchmarks: [benchmarkId] })}\n## 现象\n\n<Replay run="" />\n`,
    en: `${frontmatterBlock({ title: 'New report', date, summary: 'The report’s conclusion in a sentence.', benchmarks: [benchmarkId] })}\n## What happened\n\n<Replay run="" />\n`,
  };
}
