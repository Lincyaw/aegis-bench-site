import openapi from './openapi.json';

/*
 * The bounds and forms the spec declares for what a form sends, read from the OpenAPI document, so a form checks them
 * before asking the API and the two never disagree.
 */

/** The form an account name takes; the sign-in form checks it. */
export const ACCOUNT_PATTERN = openapi.components.schemas['Console.AccountName'].pattern;

/** The form an e-mail address takes; the settings form checks it. */
export const EMAIL_PATTERN = openapi.components.schemas['Console.EmailAddress'].pattern;

/** The form a report's directory name takes; the new-report form checks it. */
export const REPORT_SLUG_PATTERN = openapi.components.schemas['Console.ReportSlug'].pattern;

const PUBLICATION_RULES = openapi.components.schemas['Console.PublicationRules'].properties;

/** The numbers of reviewers a report may require. */
export const REPORT_REVIEWER_CHOICES = Array.from(
  { length: PUBLICATION_RULES.reportReviewers.maximum - PUBLICATION_RULES.reportReviewers.minimum + 1 },
  (_, index) => PUBLICATION_RULES.reportReviewers.minimum + index,
);

/** The most checks a report may require. */
export const MAX_REPORT_CHECKS = PUBLICATION_RULES.reportChecks.maxItems;

/** The most runs a comparison holds. */
export const MAX_COMPARED_RUNS = openapi.components.schemas.ComparedRunIds.maxItems;
