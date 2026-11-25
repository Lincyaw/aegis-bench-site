import { delay } from 'msw';
import { mayEdit, refusalFor } from './members';
import { http } from './protocol';
import {
  createReport, currentReviewsOf, discardReport, editReport, reportById, reportBySlug, reportDraftOf, reportSummaryOf, reportsNaming,
  reviewReport, sourcesProblemOf, submitReport, uncheckedOf,
} from './reports';
import { SIGN_IN_REQUIRED, sessionUserOf } from './session';

/** The report drafts' operations: every member reads them, and editors write, submit, review and discard them. */
export const reportHandlers = [
  http.get('/console/reports', async ({ cookies, query, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    await delay(80);
    return response(200).json(reportsNaming(query.get('benchmarkId') ?? '').map(reportSummaryOf));
  }),

  http.post('/console/reports', async ({ cookies, request, response }) => {
    const user = sessionUserOf(cookies);
    if (!user) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!mayEdit(user.role)) {
      return response(403).json(refusalFor(user, 'editor'));
    }
    const report = await request.json();
    if (reportBySlug(report.slug)) {
      return response(409).json({ message: `${report.slug} has a draft already` });
    }
    const problem = sourcesProblemOf(report.sources);
    if (problem) {
      return response(422).json({ message: problem });
    }
    await delay(160);
    return response(200).json(reportDraftOf(createReport(report, user.account)));
  }),

  http.get('/console/reports/{reportId}', ({ cookies, params, response }) => {
    if (!sessionUserOf(cookies)) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    const report = reportById(params.reportId);
    return report ? response(200).json(reportDraftOf(report)) : response(404).json({ message: `no report ${params.reportId}` });
  }),

  http.put('/console/reports/{reportId}', async ({ cookies, params, request, response }) => {
    const user = sessionUserOf(cookies);
    if (!user) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!mayEdit(user.role)) {
      return response(403).json(refusalFor(user, 'editor'));
    }
    const report = reportById(params.reportId);
    if (!report) {
      return response(404).json({ message: `no report ${params.reportId}` });
    }
    if (report.status !== 'draft') {
      return response(409).json({ message: `report ${report.id} is ${report.status}; only a draft changes` });
    }
    const edit = await request.json();
    const problem = sourcesProblemOf(edit.sources);
    if (problem) {
      return response(422).json({ message: problem });
    }
    await delay(140);
    return response(200).json(reportDraftOf(editReport(report, edit)));
  }),

  http.post('/console/reports/{reportId}/submit', async ({ cookies, params, response }) => {
    const user = sessionUserOf(cookies);
    if (!user) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!mayEdit(user.role)) {
      return response(403).json(refusalFor(user, 'editor'));
    }
    const report = reportById(params.reportId);
    if (!report) {
      return response(404).json({ message: `no report ${params.reportId}` });
    }
    const unchecked = uncheckedOf(report);
    if (report.status !== 'draft' || unchecked.length > 0) {
      return response(409).json({ message: report.status !== 'draft' ? `report ${report.id} is ${report.status}` : `${unchecked.length} checks are not ticked off` });
    }
    await delay(160);
    return response(200).json(reportDraftOf(submitReport(report)));
  }),

  http.post('/console/reports/{reportId}/reviews', async ({ cookies, params, request, response }) => {
    const user = sessionUserOf(cookies);
    if (!user) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!mayEdit(user.role)) {
      return response(403).json(refusalFor(user, 'editor'));
    }
    const report = reportById(params.reportId);
    if (!report) {
      return response(404).json({ message: `no report ${params.reportId}` });
    }
    const conflict = report.status !== 'inReview' ? `report ${report.id} is ${report.status}, not in review`
      : report.author === user.account ? 'an author does not review their own report'
      : currentReviewsOf(report).some(review => review.reviewer === user.account) ? `${user.account} has reviewed this submission already` : undefined;
    if (conflict) {
      return response(409).json({ message: conflict });
    }
    const review = await request.json();
    await delay(160);
    return response(200).json(reportDraftOf(reviewReport(report, review, user.account)));
  }),

  http.delete('/console/reports/{reportId}', async ({ cookies, params, response }) => {
    const user = sessionUserOf(cookies);
    if (!user) {
      return response(401).json(SIGN_IN_REQUIRED);
    }
    if (!mayEdit(user.role)) {
      return response(403).json(refusalFor(user, 'editor'));
    }
    const report = reportById(params.reportId);
    if (!report) {
      return response(404).json({ message: `no report ${params.reportId}` });
    }
    discardReport(report);
    await delay(120);
    return response(200).json(reportsNaming('').map(reportSummaryOf));
  }),
];
