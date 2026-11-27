import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { parseDocument } from 'yaml';
import { ReportFrontmatter } from '../api/reportFrontmatter';
import { localeValues } from '../api/schema';
import type { ConsoleUser, NewReport, ReportDraft, ReportDraftRecord, ReportDraftSummary, ReportEdit, ReportReview, ReportSources, ReviewRequest } from '../api/types';
import { hasBenchmark } from './benchmarks';
import { openedIndexes } from './records';
import { currentSettings } from './settings';

/*
 * Report drafts: written and reviewed here, then committed as files, which the console does not do itself. The drafts
 * live in memory, so a reload brings back the ones reports.json holds.
 */

let reports: ReportDraftRecord[] | undefined;
let nextReportNumber: number | undefined;

/** The drafts as changed since the server opened the data directory. */
export function currentReports(): ReportDraftRecord[] {
  reports ??= structuredClone(openedIndexes().reports);
  return reports;
}

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
  const text = frontmatterTextOf(source);
  if (text === undefined) {
    throw new Error('a document the store accepted has no frontmatter');
  }
  return ReportFrontmatter.parse(parseDocument(text).toJS());
}

/** The reviews of a draft's last submission. */
export function currentReviewsOf(report: ReportDraftRecord): ReportReview[] {
  return report.reviews.filter(review => report.submittedAt !== undefined && review.at >= report.submittedAt);
}

/** Why a member's review of a draft is refused, if it is: the draft is not in review, or the member wrote it or reviewed it already. */
export function reviewRefusalOf(report: ReportDraftRecord, account: string): string | undefined {
  return report.status !== 'inReview' ? `report ${report.id} is ${report.status}, not in review`
    : report.author === account ? 'an author does not review their own report'
    : currentReviewsOf(report).some(review => review.reviewer === account) ? `${account} has reviewed this submission already` : undefined;
}

export function reportSummaryOf(report: ReportDraftRecord): ReportDraftSummary {
  const zh = frontmatterOf(report.sources['zh-CN']);
  const en = frontmatterOf(report.sources.en);
  return {
    id: report.id, slug: report.slug, title: { 'zh-CN': zh.title, en: en.title }, benchmarkIds: [...new Set([...zh.benchmarks, ...en.benchmarks])],
    status: report.status, author: report.author, updatedAt: report.updatedAt, submittedAt: report.submittedAt,
    approvals: currentReviewsOf(report).filter(review => review.verdict === 'approve').length,
    approvalsRequired: report.status === 'draft' ? currentSettings().publication.reportReviewers : report.approvalsRequired,
  };
}

/** A draft as a member reads it, with whether they may review it and whether they have. */
export function reportDraftOf(report: ReportDraftRecord, user: ConsoleUser): ReportDraft {
  return {
    ...reportSummaryOf(report), sources: report.sources, checked: report.checked, reviews: report.reviews,
    canReview: user.can.edit && reviewRefusalOf(report, user.account) === undefined,
    reviewed: currentReviewsOf(report).some(review => review.reviewer === user.account),
  };
}

/** The drafts, newest first, those naming the benchmark and those in the status when they are given. */
export function reportsNaming(benchmarkId: string, status: ReportDraft['status'] | undefined): ReportDraftRecord[] {
  return currentReports()
    .filter(report => (!benchmarkId || reportSummaryOf(report).benchmarkIds.includes(benchmarkId)) && (!status || report.status === status))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function reportById(reportId: string): ReportDraftRecord | undefined {
  return currentReports().find(report => report.id === reportId);
}

export function reportBySlug(slug: string): ReportDraftRecord | undefined {
  return currentReports().find(report => report.slug === slug);
}

/** The checks of the settings a draft has not ticked off. */
export function uncheckedOf(report: ReportDraftRecord): string[] {
  return currentSettings().publication.reportChecks.filter(check => !report.checked.includes(check));
}

export function createReport(report: NewReport, author: string): ReportDraftRecord {
  nextReportNumber ??= currentReports().length + 1;
  const record: ReportDraftRecord = {
    id: `report-${nextReportNumber++}`, slug: report.slug, sources: report.sources, status: 'draft', author,
    updatedAt: new Date().toISOString(), checked: [], reviews: [], approvalsRequired: currentSettings().publication.reportReviewers,
  };
  currentReports().push(record);
  return record;
}

export function editReport(report: ReportDraftRecord, edit: ReportEdit): ReportDraftRecord {
  const checks = currentSettings().publication.reportChecks;
  return Object.assign(report, { sources: edit.sources, checked: edit.checked.filter(check => checks.includes(check)), updatedAt: new Date().toISOString() });
}

export function submitReport(report: ReportDraftRecord): ReportDraftRecord {
  const now = new Date().toISOString();
  return Object.assign(report, { status: 'inReview', submittedAt: now, updatedAt: now, approvalsRequired: currentSettings().publication.reportReviewers });
}

/** Records a review: a request for changes returns the draft to its author, and enough approvals approve it. */
export function reviewReport(report: ReportDraftRecord, request: ReviewRequest, reviewer: string): ReportDraftRecord {
  const now = new Date().toISOString();
  report.reviews.push({ reviewer, verdict: request.verdict, comment: request.comment, at: now });
  const approvals = currentReviewsOf(report).filter(review => review.verdict === 'approve').length;
  const status = request.verdict === 'requestChanges' ? 'draft' : approvals >= report.approvalsRequired ? 'approved' : 'inReview';
  return Object.assign(report, { status, updatedAt: now });
}

export function discardReport(report: ReportDraftRecord) {
  currentReports().splice(currentReports().indexOf(report), 1);
}
