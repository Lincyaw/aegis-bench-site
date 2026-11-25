import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { parseDocument } from 'yaml';
import { z } from 'zod';
import { localeValues } from '../api/schema';
import type { NewReport, ReportDraft, ReportDraftSummary, ReportEdit, ReportReview, ReportSources, ReviewRequest } from '../api/types';
import { hasBenchmark } from './benchmarks';
import { currentSettings } from './settings';

/*
 * Report drafts: written and reviewed here, then committed as files, which the console does not do itself. The drafts
 * live in memory, so a reload brings back the two the demo starts with.
 */

interface ReportRecord {
  id: string;
  slug: string;
  sources: ReportSources;
  status: ReportDraft['status'];
  author: string;
  updatedAt: string;
  checked: string[];
  reviews: ReportReview[];

  /** Approvals required when the draft was last submitted */
  approvalsRequired: number;

  /** When the draft was last submitted; reviews before it no longer count */
  submittedAt?: string;
}

/** What a report's frontmatter must declare, as the public site reads it. */
const ReportFrontmatter = z.object({
  title: z.string().min(1),
  date: z.iso.date(),
  summary: z.string().min(1),
  models: z.array(z.string()).default([]),
  benchmarks: z.array(z.string()).default([]),
});

const CLAIMS_ZH = `---
title: "智能体为何声称修复成功却没有证据"
date: "2026-11-21"
summary: "两次失败的运行里，智能体在报告中声称已经修复，而它自己的最后一次测试说明并没有。"
models: ["jia", "yi"]
benchmarks: ["bench-b"]
---

<Callout>本文为设计演示中的示例报告，模型与数值均为占位内容。</Callout>

## 现象

模型甲在一道测试验证任务里提交了「全部测试通过」的报告，评分却判定失败。

<Replay run="bench-b.task-033.jia-x.1" />

这次运行共 <RunNumber run="bench-b.task-033.jia-x.1" field="steps" /> 步，最后一次测试仍有两项失败。

## 复核

报告里的结论来自更早的一次测试；之后的修改让其中两项重新失败，模型没有再运行测试就提交了报告。
`;

const CLAIMS_EN = `---
title: "Why agents claim a fix their own tests contradict"
date: "2026-11-21"
summary: "In two failed runs the agent reported a fix that its own last test run did not support."
models: ["jia", "yi"]
benchmarks: ["bench-b"]
---

<Callout>This is a sample report from the design demo; its models and figures are placeholders.</Callout>

## What happened

Model Alpha submitted a report saying every test passed, and grading failed the run.

<Replay run="bench-b.task-033.jia-x.1" />

The run took <RunNumber run="bench-b.task-033.jia-x.1" field="steps" /> steps, and its last test run still had two failures.

## Review

The report's conclusion came from an earlier test run; later edits broke two tests again, and the model submitted without running them.
`;

const PAGINATION_ZH = `---
title: "回归测试为何漏掉分页越界"
date: "2026-11-24"
summary: "通过的运行里也有隐患：分页查询在最后一页越界，回归测试没有覆盖。"
benchmarks: ["bench-a"]
---

## 现象

<Replay run="bench-a.task-017.jia-x.1" />
`;

const PAGINATION_EN = `---
title: "Why the regression tests missed an off-by-one page"
date: "2026-11-24"
summary: "Even a passing run can hide a fault: the last page of a paged query overruns, and no regression test covers it."
benchmarks: ["bench-a"]
---

## What happened

<Replay run="bench-a.task-017.jia-x.1" />
`;

const INITIAL_REPORTS: ReportRecord[] = [
  {
    id: 'report-1', slug: 'claims-without-evidence', sources: { 'zh-CN': CLAIMS_ZH, en: CLAIMS_EN }, status: 'inReview', author: 'zhou.yu',
    updatedAt: '2026-11-22T09:30:00Z', submittedAt: '2026-11-22T09:30:00Z', approvalsRequired: 2,
    checked: [...currentSettings().publication.reportChecks],
    reviews: [{ reviewer: 'chen.qi', verdict: 'approve', comment: '两次运行的证据都核对过。', at: '2026-11-23T03:10:00Z' }],
  },
  {
    id: 'report-2', slug: 'paging-off-by-one', sources: { 'zh-CN': PAGINATION_ZH, en: PAGINATION_EN }, status: 'draft', author: 'lin.fang',
    updatedAt: '2026-11-24T07:45:00Z', approvalsRequired: 2, checked: [currentSettings().publication.reportChecks[0]], reviews: [],
  },
];

const reports: ReportRecord[] = structuredClone(INITIAL_REPORTS);
let nextReportNumber = INITIAL_REPORTS.length + 1;

/** A document's frontmatter as YAML text, or nothing when the document opens without one. */
export function frontmatterTextOf(source: string): string | undefined {
  const head = unified().use(remarkParse).use(remarkFrontmatter).parse(source).children[0];
  return head?.type === 'yaml' ? head.value : undefined;
}

/** What is wrong with a document's frontmatter, if anything; a draft is saved only when nothing is. */
export function frontmatterProblemOf(locale: string, source: string): string | undefined {
  const text = frontmatterTextOf(source);
  const document = text === undefined ? undefined : parseDocument(text);
  const parsed = document && document.errors.length === 0 ? ReportFrontmatter.safeParse(document.toJS()) : undefined;
  const unknown = parsed?.success ? parsed.data.benchmarks.find(benchmarkId => !hasBenchmark(benchmarkId)) : undefined;
  return text === undefined ? `the ${locale} document opens without frontmatter`
    : document?.errors.length ? `the ${locale} frontmatter is not YAML: ${document.errors[0].message}`
    : !parsed?.success ? `the ${locale} frontmatter needs a title, a date (YYYY-MM-DD) and a summary`
    : unknown ? `the ${locale} frontmatter names ${unknown}, which is not a benchmark` : undefined;
}

export function sourcesProblemOf(sources: ReportSources): string | undefined {
  return localeValues.map(locale => frontmatterProblemOf(locale, sources[locale])).find(problem => problem !== undefined);
}

/** The frontmatter of a document the store accepted, which is always well formed. */
export function frontmatterOf(source: string) {
  return ReportFrontmatter.parse(parseDocument(frontmatterTextOf(source) ?? '').toJS());
}

/** The reviews of a draft's last submission. */
export function currentReviewsOf(report: ReportRecord): ReportReview[] {
  return report.reviews.filter(review => report.submittedAt !== undefined && review.at >= report.submittedAt);
}

export function reportSummaryOf(report: ReportRecord): ReportDraftSummary {
  const zh = frontmatterOf(report.sources['zh-CN']);
  const en = frontmatterOf(report.sources.en);
  return {
    id: report.id, slug: report.slug, title: { 'zh-CN': zh.title, en: en.title }, benchmarkIds: [...new Set([...zh.benchmarks, ...en.benchmarks])],
    status: report.status, author: report.author, updatedAt: report.updatedAt, submittedAt: report.submittedAt,
    approvals: currentReviewsOf(report).filter(review => review.verdict === 'approve').length,
    approvalsRequired: report.status === 'draft' ? currentSettings().publication.reportReviewers : report.approvalsRequired,
  };
}

export function reportDraftOf(report: ReportRecord): ReportDraft {
  return { ...reportSummaryOf(report), sources: report.sources, checked: report.checked, reviews: report.reviews };
}

/** The drafts, newest first, those naming the benchmark when one is given. */
export function reportsNaming(benchmarkId: string): ReportRecord[] {
  return reports
    .filter(report => !benchmarkId || reportSummaryOf(report).benchmarkIds.includes(benchmarkId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function reportById(reportId: string): ReportRecord | undefined {
  return reports.find(report => report.id === reportId);
}

export function reportBySlug(slug: string): ReportRecord | undefined {
  return reports.find(report => report.slug === slug);
}

/** The checks of the settings a draft has not ticked off. */
export function uncheckedOf(report: ReportRecord): string[] {
  return currentSettings().publication.reportChecks.filter(check => !report.checked.includes(check));
}

export function createReport(report: NewReport, author: string): ReportRecord {
  const record: ReportRecord = {
    id: `report-${nextReportNumber++}`, slug: report.slug, sources: report.sources, status: 'draft', author,
    updatedAt: new Date().toISOString(), checked: [], reviews: [], approvalsRequired: currentSettings().publication.reportReviewers,
  };
  reports.push(record);
  return record;
}

export function editReport(report: ReportRecord, edit: ReportEdit): ReportRecord {
  const checks = currentSettings().publication.reportChecks;
  return Object.assign(report, { sources: edit.sources, checked: edit.checked.filter(check => checks.includes(check)), updatedAt: new Date().toISOString() });
}

export function submitReport(report: ReportRecord): ReportRecord {
  const now = new Date().toISOString();
  return Object.assign(report, { status: 'inReview', submittedAt: now, updatedAt: now, approvalsRequired: currentSettings().publication.reportReviewers });
}

/** Records a review: a request for changes returns the draft to its author, and enough approvals approve it. */
export function reviewReport(report: ReportRecord, request: ReviewRequest, reviewer: string): ReportRecord {
  const now = new Date().toISOString();
  report.reviews.push({ reviewer, verdict: request.verdict, comment: request.comment, at: now });
  const approvals = currentReviewsOf(report).filter(review => review.verdict === 'approve').length;
  const status = request.verdict === 'requestChanges' ? 'draft' : approvals >= report.approvalsRequired ? 'approved' : 'inReview';
  return Object.assign(report, { status, updatedAt: now });
}

export function discardReport(report: ReportRecord) {
  reports.splice(reports.indexOf(report), 1);
}
