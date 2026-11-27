import openapi from './openapi.json';
import type { paths } from './schema';

/*
 * The bounds, forms and defaults the spec declares for what the site sends and the server answers, read from the OpenAPI
 * document where it states them, so the site and the mock server check and build them as the API does and never disagree.
 */

interface QueryParameter {
  name: string;
  schema: { default?: string | number };
}

const GET_PARAMETERS = openapi.paths as unknown as Record<string, { get: { parameters: (QueryParameter | { $ref: string })[] } }>;

/** The default of a query parameter of a GET operation, as the spec declares it; an operation without one fails here. */
export function queryDefaultOf<Value extends string | number>(path: keyof paths, name: string): Value {
  const parameter = GET_PARAMETERS[path].get.parameters.find((candidate): candidate is QueryParameter => 'name' in candidate && candidate.name === name);
  if (parameter?.schema.default === undefined) {
    throw new Error(`the spec declares no default of ${name} for GET ${path}`);
  }
  return parameter.schema.default as Value;
}

/** Items per page of a list operation when a request names no limit. */
export function defaultPageSizeOf(path: keyof paths): number {
  return queryDefaultOf<number>(path, 'limit');
}

/** The most characters of an event's text its excerpt carries. */
export const MAX_EXCERPT_LENGTH = openapi.components.schemas['Console.RunEventRow'].properties.excerpt.maxLength;

/** The most text of a task's file a response carries. */
export const MAX_FILE_TEXT_LENGTH = openapi.components.schemas.TaskFile.properties.text.maxLength;

/**
 * The key the spec names a model and harness pair by, "<model id>-<harness id>": a combination's identity in the API's
 * paths and queries and in the site's addresses.
 */
export function combinationKey(modelId: string, harnessId: string): string {
  return `${modelId}-${harnessId}`;
}

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
